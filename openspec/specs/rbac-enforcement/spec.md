# rbac-enforcement Specification

## Purpose

Guarantee that role-based access control is enforced consistently across the backend and reflected in the frontend navigation. No authenticated route bypasses role checks; `AUDITOR` is strictly read-only; the sidebar exposes only links the caller may access.

## Requirements

### Requirement: RolesGuard MUST Be Registered as APP_GUARD

`RolesGuard` MUST be registered as a global guard via `{ provide: APP_GUARD, useClass: RolesGuard }` so every controller is guarded without per-decorator `@UseGuards(RolesGuard)`.

#### Scenario: Untagged route defaults to authenticated-access

- GIVEN a controller method has no `@Roles(...)` decorator and is not marked `@Public`
- WHEN any authenticated user calls that route
- THEN the request is allowed (default-allow)
- AND the guard does not inspect `user.role`

#### Scenario: Guard executes even without explicit @UseGuards

- GIVEN a controller omits `@UseGuards(RolesGuard)`
- WHEN a `MANAGER` calls a `MANAGER`-only endpoint on that controller
- THEN access is granted
- AND when a `USER` calls the same endpoint, access is `403 Forbidden`

### Requirement: Auth Routes MUST Be Public

`/auth/login`, `/auth/register`, `/auth/refresh`, and `/health` MUST be marked `@Public` so the global guard permits unauthenticated access.

#### Scenario: Login succeeds without token

- GIVEN no `Authorization` header is present
- WHEN `POST /auth/login` is called with valid credentials
- THEN the endpoint returns `200` with tokens
- AND the global RolesGuard skips the route via `@Public`

### Requirement: AUDITOR Role MUST Be Read-Only

`AUDITOR` users MUST be granted `GET` access to read endpoints but MUST NOT perform any create/update/delete operation across every module.

#### Scenario: AUDITOR reads an aspect

- GIVEN an authenticated `AUDITOR` user
- WHEN `GET /environmental/aspects` is called
- THEN the list is returned `200`

#### Scenario: AUDITOR cannot create a document

- GIVEN an authenticated `AUDITOR` user
- WHEN `POST /documents` is called with a valid payload
- THEN the response is `403 Forbidden`

#### Scenario: AUDITOR cannot approve a document

- GIVEN an authenticated `AUDITOR` user
- WHEN `POST /documents/:id/approve` is called
- THEN the response is `403 Forbidden`

### Requirement: RBAC Matrix MUST Be Enforced per Endpoint

The system MUST enforce the documented access matrix:

| Area | ADMIN | MANAGER | USER | AUDITOR |
|------|-------|---------|------|---------|
| Users CRUD | Full | Read | ❌ | ❌ |
| Documents | Full | CRUD + approve | Create/Read | Read |
| Aspects | Full | CRUD | Read | Read |
| PMA / ANLA | Full | CRUD | PMA Read / ANLA ❌ | Read PMA / ❌ ANLA |

#### Scenario: USER cannot delete an aspect

- GIVEN an authenticated `USER`
- WHEN `DELETE /environmental/aspects/:id` is called
- THEN the response is `403 Forbidden`

### Requirement: Sidebar MUST Filter Links by Caller Role

The frontend `Sidebar` component MUST render only navigation links whose required role(s) include the authenticated user's role. Links leading to inaccessible pages MUST NOT appear.

#### Scenario: AUDITOR sees no create/edit links

- GIVEN the `authStore` holds a user with `role: 'AUDITOR'`
- WHEN the dashboard layout renders the sidebar
- THEN links to create/edit screens are absent from the rendered DOM
- AND no sidebar anchor resolves to a route requiring `MANAGER` or `ADMIN`

#### Scenario: MANAGER sees management links

- GIVEN a user with `role: 'MANAGER'`
- WHEN the sidebar renders
- THEN management links (documents approve, aspects CRUD) are present
- AND admin-only links (users delete) are absent