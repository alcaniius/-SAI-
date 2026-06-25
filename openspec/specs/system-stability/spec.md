# system-stability Specification

## Purpose

Establish a reproducible backend build, working test infrastructure, and correct auth/config foundations. This capability eliminates build-blockers and correctness bugs that prevent the rest of the system from being developed or verified.

## Requirements

### Requirement: Backend Build MUST Succeed

The backend project MUST compile with `pnpm build` without missing-dependency errors. Missing runtime types (e.g. `multer`, `@types/multer`) MUST be installed in `package.json`.

#### Scenario: Clean build succeeds

- GIVEN the backend repository is freshly installed via `pnpm install`
- WHEN `pnpm build` is executed
- THEN the build exits with code 0
- AND no "Cannot find module" or implicit-any TypeScript errors are emitted

#### Scenario: Multer types resolve at compile time

- GIVEN `sites.controller` references `multer` types (`Express.Multer.File`, `FileFilterCallback`)
- WHEN the TypeScript compiler runs in `pnpm build`
- THEN no `TS2307` ("Cannot find module 'multer'") error is raised
- AND no `TS2503` ("Cannot find namespace 'Express.Multer'") error is raised

### Requirement: Test Harness MUST Have a localStorage Mock

The unit/e2e test setup MUST provide a `window.localStorage` polyfill via `jest-environment-jsdom` setup so Zustand `persist` middleware does not throw `ReferenceError: localStorage is not defined`.

#### Scenario: AuthStore test runs under jsdom

- GIVEN `authStore.test.ts` instantiates the persisted Zustand store
- WHEN the test is executed with `npx jest`
- THEN the test does not throw `ReferenceError`
- AND state rehydrates from the mock storage between test cases

### Requirement: Logout MUST Invalidate the Refresh Token String

`POST /auth/logout` MUST delete the `RefreshToken` row matched by the presented refresh-token string, never by `user.id`. Deleting by user id would revoke all sibling sessions.

#### Scenario: Single session logout

- GIVEN a user holds two valid refresh tokens `A` and `B` from two logins
- WHEN the user calls `POST /auth/logout` with `Authorization: Bearer <accessA>` (session A)
- THEN only refresh token `A` is removed from `refresh_tokens`
- AND refresh token `B` MUST still be accepted by `POST /auth/refresh`

#### Scenario: Logout with unknown token MUST NOT throw

- GIVEN an expired refresh token is presented on logout
- WHEN the logout service attempts deletion
- THEN the endpoint responds `200` (idempotent)
- AND no other refresh tokens are affected

### Requirement: PrismaService MUST Resolve DATABASE_URL via ConfigService

`PrismaService` MUST obtain the `DATABASE_URL` through `ConfigService.getOrThrow('DATABASE_URL')` and pass it to the `PrismaPg` adapter — never read `process.env.DATABASE_URL` directly.

#### Scenario: Missing env var fails fast

- GIVEN `DATABASE_URL` is absent from the runtime environment
- WHEN the NestJS application bootstraps
- THEN `ConfigService.getOrThrow` throws a clear configuration error
- AND the process exits before the HTTP server starts listening

### Requirement: Authorization Roles MUST Reference the Role Enum

All `@Roles(...)` decorators and DTO role fields MUST use the `Role` enum (`Role.ADMIN`, `Role.MANAGER`, `Role.USER`, `Role.AUDITOR`), not bare string literals.

#### Scenario: String-literal decorator is rejected

- GIVEN a controller declares `@Roles('ADMIN')`
- WHEN the module is type-checked
- THEN a lint/test guard flags the string-literal usage
- AND the project's role constants resolve to the `Role` enum values

#### Scenario: Role enum is the single source of truth

- GIVEN the database `Role` enum and the application `Role` enum
- WHEN an RBAC check compares a user role against `Role.AUDITOR`
- THEN the comparison is type-safe and exhaustive
- AND adding a new role requires updating only the enum