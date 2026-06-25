# Tasks: Fix and Stabilize SAI

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,500–2,000 (excluding lockfile) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 → PR 7 |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Capability | Files (approx. Δ lines) | PR | Base | Tests |
|------|-----------|------------------------|----|------|-------|
| 1 | system-stability | `backend/package.json` (5), `backend/src/common/database/prisma.service.ts` (15), `backend/src/modules/auth/auth.service.ts` (20), `backend/src/modules/auth/auth.controller.ts` (5), `backend/src/modules/*/controllers/*` Role enum (40), `Frontend/vitest.setup.ts` (10), tests (60) | PR 1 | `main` | `pnpm build`, `npx jest`, `npx vitest run` |
| 2 | rbac-enforcement | `backend/src/common/decorators/public.decorator.ts` (5), `backend/src/common/guards/roles.guard.ts` (25), `backend/src/app.module.ts` (15), all controllers `@Roles`/`@Public` (120), `Frontend/src/lib/navigation.ts` (15), `Frontend/src/app/dashboard/layout.tsx` (20), `Frontend/src/components/Sidebar*` (30), tests (100) | PR 2 | PR 1 | `npx jest --config ./test/jest-e2e.json`, `npx vitest run` |
| 3 | tenant-isolation | `backend/prisma/schema.prisma` (50), migration (80), `backend/src/common/decorators/current-tenant.decorator.ts` (10), `backend/src/common/middleware/tenant.middleware.ts` (10), all services org filter (200), all tenant controllers (100), tests (120) | PR 3 | PR 2 | `npx jest`, e2e tenant matrix |
| 4 | file-storage | `backend/prisma/schema.prisma` (20), migration (40), `backend/src/modules/storage/*` (120), `backend/src/modules/documents/*` (80), `backend/src/modules/sites/*` (60), tests (120) | PR 4 | PR 3 | e2e upload/download, legacy fallback |
| 5 | automation-pdf | `backend/src/modules/automation/pdf.service.ts` (40), `backend/src/modules/automation/automation.service.ts` (30), `backend/src/modules/automation/pdf.processor.ts` (20), `backend/src/modules/environmental/environmental.controller.ts` (40), tests (80) | PR 5 | PR 4 | e2e enqueue/poll/download, RBAC |
| 6 | frontend-completeness | `Frontend/src/app/dashboard/quality/page.tsx` (10), `Frontend/src/app/dashboard/education/page.tsx` (10), `Frontend/src/app/dashboard/indicators/page.tsx` (10), `Frontend/src/components/documents/DocumentModal.tsx` (80), `Frontend/src/app/dashboard/documents/page.tsx` (30), `Frontend/src/lib/services.ts` (30), `Frontend/src/lib/api.ts` (40), delete duplicate route (5), tests (80) | PR 6 | PR 4 | `npx vitest run`, `next build` |
| 7 | docs-alignment | `README.md`, `ESTADO.md`, `QUICKSTART.md` (120) | PR 7 | PR 6 | docs review |

## Phase 1: system-stability

- [x] **1.1 [backend] Install multer deps**: Add `multer` and `@types/multer` to `backend/package.json`; run `pnpm install`. Verify `cd backend && pnpm build` exits 0.
- [x] **1.2 [backend] Fix logout to revoke single token**: Change `auth.service.ts` `logout(user)` to `logout(token: string)` and delete `where: { token }`; update `auth.controller.ts` to pass `@Body('refreshToken')`. Unit test: token A logout leaves token B valid.
- [x] **1.3 [backend] Resolve DATABASE_URL via ConfigService**: Inject `ConfigService` into `backend/src/common/database/prisma.service.ts` and use `getOrThrow<string>('DATABASE_URL')`. Unit test: missing env throws at module init.
- [x] **1.4 [frontend] Polyfill localStorage for jsdom**: Mock `localStorage` in `Frontend/vitest.setup.ts`. Unit test: `authStore` rehydrates from mock.
- [x] **1.5 [backend] Replace string role literals**: Find all `@Roles('...')` usages and use `Role` enum imported from `@prisma/client`.

## Phase 2: rbac-enforcement

- [x] **2.1 [backend] Create `@Public()` decorator**: Add `backend/src/common/decorators/public.decorator.ts` with `SetMetadata(IS_PUBLIC_KEY, true)`.
- [x] **2.2 [backend] Make `RolesGuard` global**: Update `backend/src/common/guards/roles.guard.ts` to skip `@Public()` routes, default-allow untagged routes, and reject `AUDITOR` on non-GET.
- [x] **2.3 [backend] Register `RolesGuard` as `APP_GUARD`**: Add provider in `backend/src/app.module.ts` alongside existing `ThrottlerGuard`.
- [x] **2.4 [backend] Annotate controllers**: Add `@Roles(Role...)` to every read endpoint; mark `AuthController` and `HealthController` with `@Public()`; ensure no mutation includes `Role.AUDITOR`.
- [x] **2.5 [frontend] Role-filter sidebar**: Create `Frontend/src/lib/navigation.ts` with `roles` per link; update `DashboardLayout`/`Sidebar` to hide links caller cannot access.

## Phase 3: tenant-isolation

- [x] **3.1 [backend] Add `organizationId` columns**: Update `backend/prisma/schema.prisma` to add nullable `organizationId` to all tenant-scoped models; create reversible migration with `createdBy` → `User.organizationId` backfill.
- [x] **3.2 [backend] Add `@CurrentTenant()` decorator**: Create `backend/src/common/decorators/current-tenant.decorator.ts` returning `req['tenant']`.
- [x] **3.3 [backend] Return 400 for missing tenant**: Update `backend/src/common/middleware/tenant.middleware.ts` to throw `BadRequestException` on missing tenant header for non-public routes.
- [x] **3.4 [backend] Filter service queries**: Update every `backend/src/modules/*/services/*.service.ts` to accept `organizationId`, append it to `findMany`/`findFirst`/`findUnique`/`update`/`delete`, and stamp it on creates ignoring body value.
- [x] **3.5 [backend] Wire tenant into controllers**: Pass `@CurrentTenant()` from each tenant-scoped controller into service calls.

## Phase 4: file-storage

- [x] **4.1 [backend] Extend models for S3 keys**: Add `s3Key`, `contentHash`, keep `filePath` in `Document` and `SiteCertificate` via `schema.prisma` + migration.
- [x] **4.2 [backend] Create `StorageService`**: Implement `backend/src/modules/storage/storage.service.ts` and `storage.module.ts` with `buildKey`, `upload`, `getPresignedUrl` (TTL ≤15 min), and `getBytesOrFallback`.
- [x] **4.3 [backend] Use storage for documents**: Refactor `backend/src/modules/documents/documents.controller.ts` and `documents.service.ts` to multipart upload, hash dedup, and presigned download.
- [x] **4.4 [backend] Use storage for site certificates**: Replace disk storage in `backend/src/modules/sites/sites.controller.ts` and `sites.service.ts` with `StorageService`.

## Phase 5: automation-pdf

- [x] **5.1 [backend] Align PMA PDF template**: Update `backend/src/modules/automation/pdf.service.ts` to render real `EnvironmentalAspect` fields with null-safe defaults.
- [x] **5.2 [backend] Async PDF generation**: Queue BullMQ job in `backend/src/modules/automation/automation.service.ts`; add `POST /environmental/pma/:id/generate-pdf` returning 202 + `jobId`, and `GET /environmental/jobs/:jobId` for status.
- [x] **5.3 [backend] Presigned PDF download**: Add `GET /environmental/pma/:id/pdf` returning presigned URL via `StorageService`; restrict enqueue to `ADMIN`/`MANAGER`.

## Phase 6: frontend-completeness

- [x] **6.1 [frontend] Create missing dashboard pages**: Add `quality`, `education`, `indicators` pages under `Frontend/src/app/dashboard/`. All render inside authenticated layout.
- [x] **6.2 [frontend] Build documents modal**: Create `Frontend/src/components/documents/DocumentModal.tsx` with `react-hook-form`, `zodResolver`, and Zod v4 enum `message` validation; wire into `Frontend/src/app/dashboard/documents/page.tsx`.
- [x] **6.3 [frontend] Align environmental types**: Update `Frontend/src/lib/services.ts` so `EnvironmentalAspect` type and enums match backend Prisma enums 1:1.
- [x] **6.4 [frontend] Implement refresh-token replay**: Update `Frontend/src/lib/api.ts` to retry once on 401 using refresh token, replay original request, and redirect to `/login` on failure.
- [x] **6.5 [frontend] Remove duplicate waste route**: Delete `Frontend/src/app/dashboard/environmental/waste/page.tsx` (keep `/dashboard/waste/page.tsx`). Verified: duplicate route does not exist — no deletion needed.

## Phase 7: docs-alignment

- [x] **7.1 [infra] Align docs with reality**: Update `README.md`, `ESTADO.md`, `QUICKSTART.md` with reproducible install/build/test commands, current role matrix, and updated coverage/test counts.
