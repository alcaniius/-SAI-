# SDD Delta Spec: fix-and-stabilize

> Change to leave SAI fully functional, stable, and consistent with its docs.
> Strict TDD: backend Jest + frontend Vitest.

---

## Capability: system-stability

### Goal
Restore a reproducible backend build, fix the auth logout bug, fix test harness gaps, and resolve the `PrismaService` config leak.

### Current broken/incorrect behavior
- `sites.controller.ts` imports `multer` types that are not installed, so `pnpm build` fails.
- `auth.service.ts` deletes refresh tokens by `user.id`, revoking all sibling sessions.
- Frontend/jsdom tests fail because Zustand `persist` accesses `localStorage` without a polyfill.
- `PrismaService` reads `process.env.DATABASE_URL` directly instead of `ConfigService`.
- Some `@Roles()` decorators use string literals instead of the `Role` enum.

### Expected correct behavior
- `pnpm build` succeeds with all missing types installed.
- `POST /auth/logout` invalidates only the presented refresh-token string.
- Tests run under jsdom with a `localStorage` mock.
- `DATABASE_URL` is resolved through `ConfigService.getOrThrow` and passed to `PrismaPg`.
- All role references use the `Role` enum.

### Acceptance criteria
- [ ] `cd backend && pnpm build` exits 0.
- [ ] `cd backend && npx jest` and `cd Frontend && npx vitest run` are reproducible (green after fixes).
- [ ] Logout with token A does not invalidate token B for the same user.
- [ ] Missing `DATABASE_URL` fails fast at bootstrap.

### Files/services affected
- `backend/package.json` (add `multer`, `@types/multer`)
- `backend/src/modules/sites/sites.controller.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/prisma/prisma.service.ts`
- Frontend test setup / `vitest.setup.ts`
- Any `@Roles('...')` usages

### Test requirements
- Backend unit test: logout with two tokens leaves the second valid.
- Backend unit test: missing `DATABASE_URL` throws at module init.
- Frontend test: `authStore` rehydrates from mocked `localStorage`.
- Build test: `pnpm build` and `next build` succeed.

### Dependencies on other capabilities
None. This is Phase 1 and unblocks all other capabilities.

---

## Capability: rbac-enforcement

### Goal
Make RBAC consistent, global, and read-only for `AUDITOR`; reflect it in the frontend sidebar.

### Current broken/incorrect behavior
- `RolesGuard` is not registered as `APP_GUARD`; some controllers omit `@UseGuards`.
- `AUDITOR` is defined but not enforced as read-only.
- Read endpoints lack `@Roles`, and string literals are used.
- Sidebar shows links the caller cannot access.

### Expected correct behavior
- `RolesGuard` runs on every route via `APP_GUARD`.
- Auth routes and `/health` are `@Public`.
- `AUDITOR` can only `GET`; all mutations return `403`.
- Every read endpoint declares `@Roles(Role.X)`.
- Sidebar filters links by caller role.

### Acceptance criteria
- [ ] A `USER` calling `DELETE /environmental/aspects/:id` receives `403`.
- [ ] An `AUDITOR` calling `POST /documents` receives `403`.
- [ ] An `AUDITOR` calling `GET /environmental/aspects` receives `200`.
- [ ] Sidebar for `AUDITOR` contains no create/edit links.

### Files/services affected
- `backend/src/app.module.ts`
- `backend/src/common/guards/roles.guard.ts`
- `backend/src/common/decorators/roles.decorator.ts`
- All controllers under `backend/src/modules/*`
- `Frontend/src/components/Sidebar*` and link config

### Test requirements
- E2E tests for each role × endpoint matrix row.
- Frontend test: sidebar DOM filters links by role.
- E2E test: `@Public` routes work without token.

### Dependencies on other capabilities
- Depends on `system-stability` (build/test green).
- `frontend-completeness` consumes the same role matrix for sidebar filtering.

---

## Capability: tenant-isolation

### Goal
Ensure every tenant-scoped query or write is filtered by `organizationId` derived from the tenant context.

### Current broken/incorrect behavior
- Services query tenant-scoped models without `organizationId` filtering.
- Writes may accept or ignore a client-supplied `organizationId`.
- Cross-tenant reads/writes are possible.

### Expected correct behavior
- Every request resolves `organizationId` from `X-Tenant-ID` (configurable header) or subdomain.
- `findMany`/`findFirst`/`findUnique` against tenant-scoped models include `where: { organizationId }`.
- Creates stamp `organizationId` from the resolved tenant context and ignore any body value.
- Updates/deletes fetch by `id AND organizationId`; cross-tenant access returns `404`.
- `ADMIN` with explicit `X-Tenant-ID` may read any tenant.

### Acceptance criteria
- [ ] User from `org-A` cannot see `org-B` documents.
- [ ] `POST` with `organizationId: org-B` by an `org-A` user persists `org-A`.
- [ ] `DELETE /documents/:id` of an `org-B` document by `org-A` returns `404`.
- [ ] Missing tenant header on a scoped route returns `400`.

### Files/services affected
- Tenant resolution middleware/guard
- All service layers under `backend/src/modules/*/services/*`
- Controllers that receive `CurrentTenant` or similar decorator

### Test requirements
- E2E: seeded `org-A` and `org-B` documents; cross-tenant reads return only caller's org.
- Unit: services append `organizationId` to Prisma queries.
- E2E: body spoofing is ignored on create.

### Dependencies on other capabilities
- Depends on `system-stability`.
- Interacts with `rbac-enforcement` (global guard must allow tenant resolution to run).

---

## Capability: automation-pdf

### Goal
Align the PMA PDF template to real `EnvironmentalAspect` fields and run generation asynchronously.

### Current broken/incorrect behavior
- PDF template references fields that do not exist on `EnvironmentalAspect`, causing runtime errors.
- Generation flow is not covered by tests or may block the request.

### Expected correct behavior
- Template uses only `name`, `impact`, `probability`, `significance`, `jsonData`, `active`.
- `POST /environmental/pma/:id/generate-pdf` enqueues a BullMQ job and returns `202` with `jobId`.
- Polling endpoint `GET /environmental/jobs/:jobId` reports state/progress.
- Completed PDF is retrievable via `GET /environmental/pma/:id/pdf` as a presigned URL.
- Generation restricted to `ADMIN`/`MANAGER`; read routes open per matrix.

### Acceptance criteria
- [ ] Generated PDF contains the real aspect values and starts with `%PDF-`.
- [ ] Optional/null fields render without `undefined`/`NaN`.
- [ ] Enqueue returns `202` and a `jobId`.
- [ ] `USER` cannot enqueue but can read the PDF after completion.

### Files/services affected
- `backend/src/modules/automation/**`
- BullMQ `pdf-generation` queue and processor
- `backend/src/modules/environmental/*` (PMA controller/service)

### Test requirements
- Unit: template renders populated aspect fields.
- Unit: null optional fields do not throw.
- E2E: enqueue returns 202; polling reaches completed; download returns presigned URL.
- RBAC test: `USER` enqueue `403`, `USER` read `200`.

### Dependencies on other capabilities
- Depends on `system-stability`, `rbac-enforcement`.
- Depends on `file-storage` (presigned URL for PDF download).

---

## Capability: file-storage

### Goal
Unify documents and site certificates on S3/MinIO with presigned URLs and a backward-compatible migration fallback.

### Current broken/incorrect behavior
- Documents and site certificates may store local filesystem paths.
- No unified S3/MinIO upload/download path.
- Downloads expose direct paths instead of short-lived presigned URLs.

### Expected correct behavior
- New uploads go to S3/MinIO bucket with object keys prefixed by `tenants/<organizationId>/`.
- Downloads return presigned URLs with bounded TTL (≤15 min, configurable).
- Duplicate content hash within a tenant does not duplicate storage or records.
- Legacy local-path rows fall back to filesystem read when S3 object is absent.
- RBAC applies: upload `MANAGER+`; download any authenticated role per matrix.

### Acceptance criteria
- [ ] New document file lands in MinIO with tenant-prefixed key.
- [ ] Download endpoint returns a presigned URL, not a raw path.
- [ ] Legacy row without S3 object still returns bytes via local fallback.
- [ ] `AUDITOR` can download but not upload.

### Files/services affected
- `backend/src/modules/documents/**`
- `backend/src/modules/sites/**` (certificates)
- S3/MinIO client configuration
- Document / DocumentVersion models

### Test requirements
- Unit: storage service builds tenant-prefixed key.
- Unit: presigned URL TTL is bounded.
- E2E: upload then download returns original bytes.
- E2E: legacy path fallback serves bytes.
- RBAC test: `AUDITOR` upload `403`, download `200`.

### Dependencies on other capabilities
- Depends on `system-stability`, `rbac-enforcement`, `tenant-isolation`.
- `automation-pdf` and `frontend-completeness` consume this for documents.

---

## Capability: frontend-completeness

### Goal
Make every sidebar link resolve to a working page, fix the document modal, align environmental types, implement token refresh, and remove duplicate routes.

### Current broken/incorrect behavior
- Sidebar links to `/dashboard/quality`, `/dashboard/education`, `/dashboard/indicators` return 404.
- Documents create/edit modal is missing or broken.
- `services.ts` environmental types do not match backend enums.
- `api.ts` lacks a 401 refresh-token interceptor.
- A duplicate waste/environmental route triggers a Next.js warning.

### Expected correct behavior
- Pages exist at all linked dashboard routes and render inside the authenticated layout.
- Documents modal uses `react-hook-form` + `zodResolver` + Zod v4 enum `message` validation.
- `services.ts` `EnvironmentalAspect` types map 1:1 to backend enums.
- `api.ts` refreshes on 401 once, replays the request, and redirects to `/login` on refresh failure.
- No duplicate route warning from `next build`.
- Sidebar filters links using the same RBAC matrix as the backend.

### Acceptance criteria
- [ ] Every sidebar link for every role navigates to a rendered `/dashboard/*` page.
- [ ] Document create modal submits valid payload and refreshes the list.
- [ ] Missing required enum field shows Zod `message` error and blocks submission.
- [ ] Expired access token triggers one refresh and replays the original request.
- [ ] `next build` emits no duplicate-route warning.

### Files/services affected
- `Frontend/src/app/dashboard/quality/page.tsx` (new)
- `Frontend/src/app/dashboard/education/page.tsx` (new)
- `Frontend/src/app/dashboard/indicators/page.tsx` (new)
- `Frontend/src/components/Sidebar*`
- Documents modal/page components
- `Frontend/src/lib/services.ts`
- `Frontend/src/lib/api.ts`
- Duplicate route files in `Frontend/src/app/**`

### Test requirements
- Frontend: sidebar link clicks render expected routes.
- Frontend: documents modal validation blocks invalid submit.
- Frontend: `api.ts` interceptor refreshes once and replays on 401.
- Frontend: duplicate-route warning is absent in build output.
- Frontend: role change re-filters sidebar DOM.

### Dependencies on other capabilities
- Depends on `system-stability`.
- Depends on `rbac-enforcement` (sidebar matrix).
- Depends on `tenant-isolation` (pages must send correct tenant header).
- Depends on `file-storage` (documents modal upload).

---

## Cross-Cutting Test Requirements

- Backend: `cd backend && npx jest` and `cd backend && npx jest --config ./test/jest-e2e.json` must pass.
- Frontend: `cd Frontend && npx vitest run` must pass.
- Build: `cd backend && pnpm build` and `cd Frontend && npx next build` must succeed.
- No test may be committed without a corresponding implementation; no implementation may be merged without a passing test.
