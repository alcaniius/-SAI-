# Design: Fix and Stabilize SAI

## Technical Approach

Stabilize SAI through six dependency-ordered capabilities. Each capability is implemented as a review-sized slice, strictly driven by tests (Jest backend, Vitest frontend). The work reuses existing NestJS module boundaries and Next.js App Router conventions; it does not introduce new domains. The three cross-cutting concerns are:

1. **Global RBAC** — `RolesGuard` becomes an `APP_GUARD`; `@Public()` opts routes out; `AUDITOR` is read-only by role matrix.
2. **Tenant context** — `TenantMiddleware` already resolves the organization; a new `@CurrentTenant()` decorator passes `organizationId` into services, and Prisma queries filter by it.
3. **Unified storage** — new uploads go to S3/MinIO under `tenants/<organizationId>/`; legacy local paths fall back to filesystem reads.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Global guard + opt-out | `RolesGuard` as `APP_GUARD`; `@Public()` metadata | Per-controller `@UseGuards` | Eliminates forgotten guards; `@Public` is explicit and auditable. |
| AUDITOR enforcement | Exclude `AUDITOR` from every mutation `@Roles`; optional guard-level `method !== GET` defense | Separate `ReadOnlyGuard` | Keeps role decision in one place and matches existing `@Roles` pattern. |
| Tenant isolation column | Add nullable `organizationId` to tenant-scoped models; backfill from `createdBy` → `User.organizationId` | True schema-per-tenant switch | The spec and existing code already speak `organizationId`; schema switching would rewrite the Prisma layer. |
| Storage migration | Dual-read: S3 primary, local filesystem fallback | One-shot migration of all legacy files | Non-destructive; legacy docs keep working while new uploads use S3. |
| PDF generation | BullMQ queue + poll endpoint; presigned download URL | Synchronous generation | 202 response keeps HTTP fast; job processor can be scaled independently. |
| Refresh token replay | Axios response interceptor retries once on 401, then redirects | Retry multiple times | Prevents infinite loops; one refresh is the industry-standard pattern. |

## Data Flow

### Auth / logout

```
Client → POST /auth/logout { refreshToken }
                ↓
        AuthController passes refreshToken string
                ↓
        AuthService deletes RefreshToken where token = <string>
                ↓
        Only the presented token is revoked
```

### Request lifecycle (global guard + tenant)

```
Request
  ├─ TenantMiddleware: resolve org from X-Tenant-ID/subdomain → req.tenant
  ├─ AuthGuard (JWT) → req.user
  ├─ RolesGuard (APP_GUARD): @Public? skip. @Roles? check role.
  │     AUDITOR + non-GET → 403
  └─ Controller: @CurrentTenant() → service(..., organizationId)
              ↓
        Service appends { organizationId } to Prisma where clauses
```

### File upload / download

```
Client upload
  ├─ Controller receives multipart file
  ├─ StorageService computes hash, builds key tenants/<orgId>/<hash>/<filename>
  ├─ S3 putObject
  └─ Prisma stores key + hash

Client download
  ├─ Service looks up key by id + org
  ├─ Try S3 headObject → presigned URL
  └─ If missing and path looks local → stream from filesystem
```

### PDF generation

```
POST /environmental/pma/:id/generate-pdf
  ├─ AutomationService queues BullMQ job with pmaId + organizationId
  └─ 202 { jobId, status }

GET /environmental/jobs/:jobId
  └─ { state, progress }

GET /environmental/pma/:id/pdf
  └─ presigned URL from S3 via AutomationService/PdfService
```

## Capability Designs

### 1. system-stability

**Decisions**
- Add runtime deps `multer` and `@types/multer` so `sites.controller.ts` compiles.
- Logout deletes by refresh-token string, not by `user.id` or token `id`.
- `PrismaService` receives `DATABASE_URL` through `ConfigService.getOrThrow<string>('DATABASE_URL')`; missing value fails fast at module init.
- Vitest setup polyfills `localStorage` so `zustand/middleware/persist` tests pass under jsdom.
- Replace every `@Roles('...')` string literal with `@Roles(Role.X)` imported from `@prisma/client`.

**Key file changes**
| File | Action | Why |
|------|--------|-----|
| `backend/package.json` | Modify | Add `multer`, `@types/multer` |
| `backend/src/modules/sites/sites.controller.ts` | Modify | Keep `FileInterceptor`/`diskStorage` imports valid |
| `backend/src/modules/auth/auth.controller.ts` | Modify | `logout(@Body('refreshToken') token)` |
| `backend/src/modules/auth/auth.service.ts` | Modify | `logout(token: string)` deletes `where: { token }` |
| `backend/src/prisma/prisma.service.ts` | Modify | Inject `ConfigService`, `getOrThrow('DATABASE_URL')` |
| `Frontend/vitest.setup.ts` | Modify | Mock `localStorage` |
| All `@Roles('...')` call sites | Modify | Use `Role` enum |

**Testing**
- Unit: logout with token A leaves token B valid for same user.
- Unit: `PrismaService` constructor throws when `DATABASE_URL` is absent.
- Frontend: `authStore` rehydrates from mocked `localStorage`.
- Build: `pnpm build` and `next build` exit 0.

**Risks / mitigations**
- `multer` disk storage remains local-only until `file-storage` capability is applied. Mitigation: this is expected; upload unification is the next slice.

---

### 2. rbac-enforcement

**Decisions**
- Register `RolesGuard` as `APP_GUARD` in `AppModule`; keep `ThrottlerGuard` as another `APP_GUARD` (NestJS chains them).
- Create `@Public()` decorator (`SetMetadata('isPublic', true)`); `RolesGuard` skips public routes.
- Mark `AuthController` and `HealthController` with `@Public()` or rely on existing controller-level metadata; auth routes already lack JWT guard in the global sense, so `@Public()` is the clean contract.
- Add `@Roles(Role.ADMIN, Role.MANAGER, Role.USER, Role.AUDITOR)` to every read endpoint.
- Ensure no mutation `@Roles` includes `Role.AUDITOR`.
- Frontend navigation config gains a `roles: Role[]` field; `DashboardLayout` filters links by `user.role`.

**Key file changes**
| File | Action | Why |
|------|--------|-----|
| `backend/src/common/decorators/public.decorator.ts` | Create | Opt-out metadata for global guard |
| `backend/src/common/guards/roles.guard.ts` | Modify | Check `isPublic`, default-allow untagged, AUDITOR GET-only defense |
| `backend/src/app.module.ts` | Modify | Provide `RolesGuard` as `APP_GUARD` |
| All controllers under `backend/src/modules/*` | Modify | Add `@Roles` to reads; replace literals with enum |
| `Frontend/src/app/dashboard/layout.tsx` | Modify | Filter navigation by role |
| `Frontend/src/lib/navigation.ts` (or inline) | Create/Modify | Central link config with roles |

**Testing**
- E2E matrix: `USER` DELETE `/environmental/aspects/:id` → 403.
- E2E: `AUDITOR` POST `/documents` → 403; GET `/environmental/aspects` → 200.
- E2E: `/health` and `/auth/*` work without token.
- Frontend: sidebar DOM contains no create/edit links for `AUDITOR`.

**Risks / mitigations**
- Global guard could lock out valid flows. Mitigation: `@Public()` plus default-allow for unannotated routes; E2E smoke tests cover every public route.

---

### 3. tenant-isolation

**Decisions**
- Introduce `@CurrentTenant()` decorator returning `req['tenant']` (`Organization`).
- Controllers inject `@CurrentTenant() tenant: Organization` and pass `tenant.id` to services.
- Services append `organizationId` to `findMany`, `findFirst`, `findUnique`, `update`, `delete` where-clauses for tenant-scoped models.
- Create operations stamp `organizationId` from tenant context; DTO `organizationId` is ignored/stripped.
- Cross-tenant access returns `404` (not `403`) to avoid leaking existence.
- `ADMIN` override works naturally because `TenantMiddleware` resolves the org from the explicit `X-Tenant-ID` header.

**Schema / migration**
- Migration adds nullable `organizationId` to: `Document`, `DocumentVersion`, `Site`, `SiteCertificate`, `EnvironmentalAspect`, `PMA`, `ANLAReport`, `WasteRecord`, `InspectionRecord`, `InspectionTemplate`, `CarbonFootprint`.
- Backfill existing rows by joining `createdBy` → `User.organizationId` where possible.
- Nullable keeps the migration reversible and non-destructive; application code treats it as required on writes.

**Key file changes**
| File | Action | Why |
|------|--------|-----|
| `backend/prisma/schema.prisma` | Modify | Add `organizationId` to tenant-scoped models |
| `backend/prisma/migrations/...` | Create | Reversible nullable-column + backfill migration |
| `backend/src/common/decorators/current-tenant.decorator.ts` | Create | Extract resolved tenant |
| `backend/src/common/middleware/tenant.middleware.ts` | Modify | Return `400` for missing tenant on non-public routes (was `403`) |
| All `backend/src/modules/*/services/*.ts` | Modify | Accept `organizationId`, filter queries, stamp writes |
| All tenant-scoped controllers | Modify | Pass `@CurrentTenant()` to services |

**Testing**
- E2E: seeded `org-A` and `org-B` documents; caller only sees their org.
- E2E: POST with body `organizationId: org-B` persists caller's org.
- E2E: DELETE cross-tenant document → 404.
- Unit: services append `organizationId` to Prisma call args.

**Risks / mitigations**
- Migration could hide legacy records without backfill. Mitigation: backfill script + local verification run before merge.

---

### 4. automation-pdf

**Decisions**
- `PdfService.buildPmaPdfDocument` renders actual `EnvironmentalAspect` fields:
  - display name = `${process} – ${aspectType}`
  - impact = `impactDescription`
  - probability = `operationCondition`
  - significance = `${significanceTotal} (${significanceLevel})`
  - active = `active`
  - `jsonData` is omitted (no such field).
- Optional fields render as `"N/A"` instead of `undefined`/`NaN`.
- Enqueue endpoint returns `202` with `jobId`.
- `GET /environmental/jobs/:jobId` polls `automationService.getJobStatus`.
- `GET /environmental/pma/:id/pdf` returns `{ url, generated }` with a presigned URL.
- Enqueue restricted to `ADMIN`/`MANAGER`; read routes open per matrix.

**Key file changes**
| File | Action | Why |
|------|--------|-----|
| `backend/src/modules/automation/pdf.service.ts` | Modify | Template uses real aspect fields; null-safe rendering |
| `backend/src/modules/automation/automation.service.ts` | Modify | Accept `organizationId`; filter aspects by org; enqueue with org |
| `backend/src/modules/automation/pdf.processor.ts` | Modify | Pass organization context if needed |
| `backend/src/modules/environmental/environmental.controller.ts` | Modify | Add `organizationId` to enqueue; role matrix on reads |

**Testing**
- Unit: populated aspect renders in PDF bytes (starts with `%PDF-`).
- Unit: null `impactDescription`/`significanceTotal` do not throw.
- E2E: enqueue → 202; poll → completed; download URL is presigned.
- RBAC: `USER` enqueue → 403; `USER` download → 200.

**Risks / mitigations**
- PDF processor runs outside request context and cannot read `req.tenant`. Mitigation: embed `organizationId` in job data and have processor use a tenant-aware Prisma query or pass org to service.

---

### 5. file-storage

**Decisions**
- Create `StorageService` wrapping `nestjs-s3` with these methods:
  - `buildKey(organizationId, hash, filename): string` → `tenants/<organizationId>/<hash>/<filename>`
  - `upload(file, organizationId): Promise<{ key, hash, size, format }>`
  - `getPresignedUrl(key, ttl?): string` (default TTL from `PRESIGNED_URL_TTL`, capped at 15 min)
  - `getBytesOrFallback(key): Promise<Buffer>` (S3 first, then local filesystem)
- Content hash deduplication: compute SHA-256; if a `Document` with same `contentHash` + `organizationId` exists, reuse the S3 key.
- `Document` and `SiteCertificate` models add `s3Key`, `contentHash`, and keep `filePath` for legacy compatibility.
- Documents controller switches from local `filePath` body field to multipart upload handled by `StorageService`.
- Site certificates replace `diskStorage` interceptor with `StorageService` upload.
- Download endpoint returns `{ url: presignedUrl }`, never a raw path.

**Key file changes**
| File | Action | Why |
|------|--------|-----|
| `backend/src/modules/storage/storage.service.ts` | Create | Unified S3/MinIO + fallback |
| `backend/src/modules/storage/storage.module.ts` | Create | Reusable module |
| `backend/src/modules/documents/documents.service.ts` | Modify | Use StorageService; store s3Key + contentHash |
| `backend/src/modules/documents/documents.controller.ts` | Modify | Multipart upload endpoint; presigned download |
| `backend/src/modules/sites/sites.controller.ts` | Modify | Replace diskStorage with StorageService |
| `backend/src/modules/sites/sites.service.ts` | Modify | Store s3Key on certificate |
| `backend/prisma/schema.prisma` | Modify | Add `s3Key`, `contentHash` to Document / SiteCertificate |

**Testing**
- Unit: `buildKey` produces tenant-prefixed key.
- Unit: presigned URL TTL is bounded to ≤ 15 min.
- E2E: upload then download returns original bytes.
- E2E: legacy `filePath` row serves bytes via local fallback.
- RBAC: `AUDITOR` upload → 403; download → 200.

**Risks / mitigations**
- Changing upload contract breaks existing frontend document forms. Mitigation: keep file upload as an explicit `file` field and update the modal in the same slice.

---

### 6. frontend-completeness

**Decisions**
- Create placeholder pages inside authenticated layout:
  - `Frontend/src/app/dashboard/quality/page.tsx`
  - `Frontend/src/app/dashboard/education/page.tsx`
  - `Frontend/src/app/dashboard/indicators/page.tsx`
- Build `DocumentModal` with `react-hook-form`, `zodResolver`, Zod v4 `z.enum([...], { message: '...' })`.
- Update `services.ts`:
  - `Aspect` type maps to backend `EnvironmentalAspect` fields (process, activity, operationCondition, aspectType, aspectDescription, impactDescription, character, legalScore, environmentalScore, stakeholderScore, significanceTotal, significanceLevel, controls, active).
  - Enum values match Prisma enums.
- Update `api.ts`:
  - Use a flag (`_retry`) to refresh only once.
  - On refresh success, update store and replay original request.
  - On refresh failure, call `logout()` and redirect to `/login`.
- Remove duplicate route: delete `Frontend/src/app/dashboard/environmental/waste/page.tsx` (keep `dashboard/waste/page.tsx`).
- Sidebar filters links using the same role matrix as backend.

**Key file changes**
| File | Action | Why |
|------|--------|-----|
| `Frontend/src/app/dashboard/quality/page.tsx` | Create | Stop 404 for sidebar link |
| `Frontend/src/app/dashboard/education/page.tsx` | Create | Stop 404 for sidebar link |
| `Frontend/src/app/dashboard/indicators/page.tsx` | Create | Stop 404 for sidebar link |
| `Frontend/src/components/documents/DocumentModal.tsx` | Create | Validated create/edit modal |
| `Frontend/src/app/dashboard/documents/page.tsx` | Modify | Open modal, refresh list on success |
| `Frontend/src/lib/services.ts` | Modify | Aspect type aligned to backend enums |
| `Frontend/src/lib/api.ts` | Modify | One-time 401 refresh + replay |
| `Frontend/src/app/dashboard/environmental/waste/page.tsx` | Delete | Remove duplicate route warning |
| `Frontend/src/app/dashboard/layout.tsx` | Modify | Role-filtered navigation |

**Testing**
- Frontend: sidebar link clicks render expected routes.
- Frontend: document modal validation blocks invalid submit and shows Zod `message`.
- Frontend: `api.ts` interceptor refreshes once and replays on 401.
- Build: `next build` emits no duplicate-route warning.
- Frontend: role change re-filters sidebar DOM.

**Risks / mitigations**
- Removing duplicate route changes the URL for waste records. Mitigation: the surviving route is the one linked by the sidebar (`/dashboard/environmental/waste`).

## Interfaces / Contracts

### Backend decorators

```ts
// public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// current-tenant.decorator.ts
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request['tenant'] as Organization;
  },
);
```

### Storage service

```ts
export interface UploadResult {
  key: string;
  contentHash: string;
  size: number;
  format: string;
}

export class StorageService {
  buildKey(organizationId: string, contentHash: string, filename: string): string;
  async upload(file: Express.Multer.File, organizationId: string): Promise<UploadResult>;
  async getPresignedUrl(key: string, ttlSeconds?: number): Promise<string>;
  async getBytesOrFallback(key: string, legacyPath?: string): Promise<Buffer>;
}
```

### PDF job data

```ts
export interface GeneratePmaPdfJob {
  pmaId: string;
  organizationId: string;
}
```

### Frontend role matrix

```ts
export const routeVisibility: Record<string, Role[]> = {
  '/dashboard': [Role.USER, Role.MANAGER, Role.ADMIN, Role.AUDITOR],
  '/dashboard/documents': [Role.USER, Role.MANAGER, Role.ADMIN, Role.AUDITOR],
  '/dashboard/environmental': [Role.USER, Role.MANAGER, Role.ADMIN, Role.AUDITOR],
  '/dashboard/quality': [Role.MANAGER, Role.ADMIN, Role.AUDITOR],
  '/dashboard/education': [Role.MANAGER, Role.ADMIN, Role.AUDITOR],
  '/dashboard/indicators': [Role.MANAGER, Role.ADMIN, Role.AUDITOR],
};
```

## Testing Strategy

| Layer | Focus | Approach |
|-------|-------|----------|
| Backend unit | Auth logout, Prisma config, service `organizationId` filtering, storage key builder, PDF template | Jest with mocked `PrismaService` and S3 |
| Backend e2e | RBAC matrix, tenant isolation cross-tenant flows, file upload/download, PDF job polling | Supertest against bootstrapped `AppModule`; seeded `org-A`/`org-B` data |
| Frontend unit | `authStore` rehydration, `api.ts` refresh replay, modal validation, sidebar filtering | Vitest + Testing Library + jsdom |
| Build | `pnpm build`, `next build` | CI-style build run after each capability slice |

## Migration / Rollout

1. **P1 — system-stability**: no DB changes; install deps and fix code.
2. **P2 — rbac-enforcement**: no DB changes; add `@Public()`, global guard, role annotations.
3. **P3 — tenant-isolation**: one reversible Prisma migration adding nullable `organizationId` columns + backfill; application enforces filtering.
4. **P4 — automation-pdf + file-storage**: add `s3Key`/`contentHash` columns; deploy `StorageService`; PDF processor reads org from job data.
5. **P5 — frontend-completeness**: pages, modal, api interceptor, duplicate route removal.
6. **P6 — docs alignment**: update `README`, `ESTADO`, `QUICKSTART` with reproducible commands and numbers.

Each phase is a separate branch/PR to keep diffs under the 400-line review budget. Chained PRs target the previous phase branch until the final one targets `main`.

## Open Questions

- [ ] Should legacy records that cannot be backfilled to an organization be visible to `ADMIN` only, or exported/archived before migration?
- [ ] Does the frontend document create modal need version upload in the same slice, or is a simple document create sufficient for stabilization?
- [ ] Is `MINIO_BUCKET_NAME` already provisioned in all deployment environments for the new `tenants/<organizationId>/` prefix?
