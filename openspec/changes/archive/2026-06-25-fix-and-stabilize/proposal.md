# Proposal: Fix and Stabilize SAI

## Intent

Leave SAI fully functional, stable, and consistent with its docs. A reality check found the backend build broken, RBAC/tenant isolation incomplete, frontend pages missing/404-linked from the sidebar, and docs overstating the real state. This change closes every critical gap — no new features.

## Scope

### In Scope
- Build unblock (`multer`/`@types/multer`); test infra (jsdom `localStorage` mock).
- Auth logout bug: delete by refresh-token string, not user id.
- RBAC: `RolesGuard` as `APP_GUARD`, read restrictions, `AUDITOR` usage, `Role` enum over string literals.
- Tenant isolation: `organizationId` filtering across query services.
- Automation PMA PDF template aligned to real `EnvironmentalAspect` fields.
- Unified file storage (documents + site certificates → S3/MinIO).
- `PrismaService` → `ConfigService` for `DATABASE_URL`.
- Frontend: missing pages (`quality`, `education`, `indicators`, documents create/edit modal), `services.ts` Aspect types, `api.ts` refresh handler, duplicate waste route, sidebar RBAC filtering.
- Docs alignment (`README`, `ESTADO`, `QUICKSTART`) with reproducible state.

### Out of Scope
- New features: LMS, Quality domain logic, Mobile app, FastAPI carbon microservice.
- Performance tuning beyond correctness; CI/CD pipeline redesign.

## Capabilities

### New Capabilities
- `system-stability`: build, test infra, logout bug, PrismaService config, Role enum usage
- `rbac-enforcement`: global guard, read restrictions, AUDITOR role, sidebar RBAC UI
- `tenant-isolation`: organizationId query filtering across services
- `automation-pdf`: PMA template EnvironmentalAspect field alignment
- `file-storage`: unify documents + certificates to S3/MinIO
- `frontend-completeness`: missing pages, type alignment, documents modal, api.ts, dup route

### Modified Capabilities
- None (no existing specs in `openspec/specs/`)

## Approach

Phased, dependency-ordered; each phase unblocks the next and maps to a review-sized PR slice.

- **P1 — Unblock**: install `multer`, fix logout, add `localStorage` mock, `PrismaService`→`ConfigService`. Build green; tests reproducible.
- **P2 — Security & correctness**: RBAC `APP_GUARD` + read roles + `AUDITOR`; tenant `organizationId` filtering; PMA PDF field fix; `Role` enum literals.
- **P3 — Frontend completeness**: missing pages, `services.ts` types, documents modal, `api.ts` refresh, dup waste route, sidebar RBAC.
- **P4 — Documentation alignment**: rewrite `README`/`ESTADO`/`QUICKSTART` to match reality.

Strict TDD (Jest/Vitest); follow existing patterns; no Prisma schema breaks without reversible migration.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/modules/sites/sites.controller.ts` | Modified | multer dep + import (build fix) |
| `backend/src/modules/auth/auth.service.ts` | Modified | logout by refresh-token string |
| `backend/src/app.module.ts` + controllers | Modified | `RolesGuard` APP_GUARD; `@Roles(Role.X)` |
| `backend/src/modules/*/services` | Modified | `organizationId` filtering |
| `backend/src/modules/automation/**` | Modified | PMA PDF field names |
| `backend/src/prisma/prisma.service.ts` | Modified | `ConfigService` for DATABASE_URL |
| `backend/src/modules/documents, sites` | Modified | S3/MinIO storage unification |
| `Frontend/src/lib/{services,api}.ts` | Modified | Aspect types; refresh handler |
| `Frontend/src/app/dashboard/{quality,education,indicators}` | New | missing pages |
| `Frontend/src/components/Sidebar*` | Modified | RBAC link filtering |
| `README.md`, `ESTADO.md`, `QUICKSTART.md` | Modified | reality alignment |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tenant filter breaks existing queries | Med | per-service, gate behind org resolution; e2e tests |
| RBAC guard locks out valid users | Med | default-allow untagged; `@Public` for auth routes |
| File storage migration loses existing docs | Med | dual-read fallback; migration script; local path compat |
| PR exceeds 400-line review budget | High | chain PRs per phase/capability |
| Prisma migration required | Low | reversible only; no schema breaks in stabilize |

## Rollback Plan

Per-phase branches; revert each PR independently. `multer` removable; `APP_GUARD` via provider removal; tenant filters additive (remove guard/service call); PDF/pages/docs = git revert. No destructive DB changes planned.

## Dependencies

- `multer` + `@types/multer` (backend) — install before P1 build fix.
- MinIO/S3 bucket configured (docker-compose) — for file-storage unification.
- No external API or schema changes.

## Success Criteria

- [ ] `pnpm build` (backend) + `next build` (frontend) succeed.
- [ ] Backend unit/e2e + frontend Vitest green (DB/Redis mocked).
- [ ] Logout invalidates the correct refresh token.
- [ ] Every read endpoint enforces `@Roles`; `AUDITOR` read-only works.
- [ ] Tenant-scoped queries filter by `organizationId`.
- [ ] PMA PDF renders real `EnvironmentalAspect` fields, no runtime errors.
- [ ] No sidebar 404 links; pages exist for every role.
- [ ] `README`/`ESTADO`/`QUICKSTART` match reproducible build/test/coverage numbers.
