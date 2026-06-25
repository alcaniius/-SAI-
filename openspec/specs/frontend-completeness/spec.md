# frontend-completeness Specification

## Purpose

Make the frontend navigation and data layer match the backend's real surface: every sidebar link resolves to a working page, the document modal allows create/edit, services-shaped types align with backend DTOs, and the API client refresh handler is implemented. No sidebar link returns `404`.

## Requirements

### Requirement: Dashboard Pages MUST Exist for Every Sidebar Link

Pages MUST exist at `/dashboard/quality`, `/dashboard/education`, `/dashboard/indicators` so navigating from the sidebar never reaches the Next.js 404 route. Each page MAY render a placeholder ("coming soon") but MUST be routed and rendered under the authenticated dashboard layout.

#### Scenario: No sidebar 404 from any role

- GIVEN an authenticated user of any role
- WHEN every sidebar link rendered for that role is clicked
- THEN each target route renders a 200 page under `/dashboard/*`
- AND no navigation lands on the Next.js `not-found.tsx` page

#### Scenario: Placeholder includes domain title

- GIVEN the `/dashboard/quality` page is not yet implemented in the backend
- WHEN the user navigates to it
- THEN the page renders within the authenticated layout with a heading "Calidad — ISO 9001"
- AND no uncaught runtime error is surfaced in the browser console

### Requirement: Documents Create/Edit Modal MUST Function

A modal-driven create/edit flow for documents MUST be available from the documents list. The modal MUST use `react-hook-form` + `zodResolver`, validate with Zod v4 (`message` for enums — not `required_error`), and call `documentsService.create` / `.update`.

#### Scenario: Create modal submits valid payload

- GIVEN a `MANAGER+` user opens the documents list and clicks "New"
- WHEN the modal form is filled with a valid title and type
- THEN `documentsService.create` is invoked with the payload
- AND the list refreshes showing the new document

#### Scenario: Invalid submit shows validation messages

- GIVEN the create modal is open
- WHEN the user submits without a required `type`
- THEN Zod validation renders an inline error via the `message` option
- AND no API request is sent

### Requirement: services.ts Aspect Types MUST Align With Backend DTO

The `environmentalService` types in `Frontend/src/lib/services.ts` MUST match the backend `EnvironmentalAspect` fields (`name`, `impact` enum, `probability` enum, `significance`, `jsonData?`, `active`), honoring enum values exactly.

#### Scenario: Aspect create payload matches backend schema

- GIVEN the frontend `createAspect` builds its payload from `services.ts` types
- WHEN the payload is posted to `/environmental/aspects`
- THEN the backend `ValidationPipe` accepts it without enumerations mismatch
- AND `impact`/`probability`/`significance` values map 1:1 to the backend enums

### Requirement: api.ts MUST Implement the Refresh-Token Handler

`Frontend/src/lib/api.ts` MUST contain a response interceptor that, on `401`, attempts one `POST /auth/refresh` using the stored `refreshToken`, replays the original request on success, and redirects to `/login` on refresh failure.

#### Scenario: 401 triggers single refresh

- GIVEN an authenticated session whose access token expired
- WHEN a prior request returns `401`
- THEN the interceptor calls `/auth/refresh` exactly once
- AND on success the original request is replayed with the new access token

#### Scenario: Refresh failure redirects to login

- GIVEN the refresh token is also expired
- WHEN the interceptor attempts `/auth/refresh` and receives `401`
- THEN the `authStore.logout()` is invoked
- AND the user is navigated to `/login`

### Requirement: Duplicate Waste Route MUST Be Removed

The project MUST NOT register two routes resolving to the same waste/environmental path; only one route declaration MUST win so Next.js build does not surface an ambiguous-route warning.

#### Scenario: Build does not warn about duplicate route

- GIVEN `next build` is executed
- WHEN the App Router resolves routes
- THEN no "duplicate route" or precedence warning is emitted for waste/environmental paths
- AND exactly one route file maps to the resolved URL

### Requirement: Sidebar RBAC Filtering MUST Reflect Backend Roles

Sidebar links MUST be filtered against the authenticated user's `role` using the same matrix as the backend, so an `AUDITOR` (or `USER`) never sees a link to a screen they cannot reach (see `rbac-enforcement`).

#### Scenario: Role change re-renders sidebar

- GIVEN the `authStore` user role transitions from `MANAGER` to `USER`
- WHEN the dashboard layout re-renders
- THEN admin/manager-only links are removed from the sidebar DOM
- AND navigation previously visible is no longer clickable