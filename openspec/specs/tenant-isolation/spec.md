# tenant-isolation Specification

## Purpose

Ensure that every tenant-scoped read or write is filtered by the `organizationId` resolved from the request's tenant context (`X-Tenant-ID` header or subdomain). No authenticated user may access data belonging to a different organization.

## Requirements

### Requirement: Tenant Context MUST Be Resolved per Request

For every authenticated request to a tenant-scoped endpoint, the system MUST resolve a non-null `organizationId` from the `X-Tenant-ID` header (configurable via `DEFAULT_TENANT_HEADER`) or, when absent, from the request subdomain.

#### Scenario: Header resolves tenant

- GIVEN the request includes `X-Tenant-ID: org-123`
- WHEN the tenant middleware resolves the context
- THEN `organizationId === 'org-123'` is propagated to downstream services

#### Scenario: Missing tenant header on scoped route MUST fail

- GIVEN a tenant-scoped endpoint is called without `X-Tenant-ID` and no subdomain is present
- WHEN the request reaches the controller
- THEN the response is `400 Bad Request` with a tenant-required error
- AND no query is executed against the database

### Requirement: Tenant-Scoped Reads MUST Filter by organizationId

Every `findMany` / `findFirst` / `findUnique` against tenant-scoped models (Document, EnvironmentalAspect, PMA, ANLAReport, User) MUST include `where: { organizationId }` derived from the resolved tenant context.

#### Scenario: User A cannot list documents of org B

- GIVEN an authenticated user belonging to `org-A` and a request with `X-Tenant-ID: org-B`
- WHEN `GET /documents` is called
- THEN only documents with `organizationId === 'org-A'` (the caller's org) are returned
- AND no row with `organizationId === 'org-B'` appears in the response
- OR the request is `403 Forbidden` when tenant header mismatches the caller's organization

#### Scenario: E2E proves cross-tenant isolation

- GIVEN two organizations `org-A` and `org-B`, each with one document
- WHEN a user of `org-A` calls `GET /documents` with `X-Tenant-ID: org-A`
- THEN the response contains exactly one document and it belongs to `org-A`

### Requirement: Tenant-Scoped Writes MUST Stamp organizationId

Every `create` against a tenant-scoped model MUST set `organizationId` to the resolved tenant context, ignoring any client-supplied `organizationId` in the body.

#### Scenario: Body cannot spoof organizationId

- GIVEN a user of `org-A` posts a document with body `{ ..., organizationId: 'org-B' }`
- WHEN the create service persists the row
- THEN the persisted `organizationId === 'org-A'`
- AND the record is not visible to queries scoped to `org-B`

### Requirement: Updates and Deletes MUST Verify Tenant Ownership

`update` / `delete` operations MUST first fetch the record by `id AND organizationId`; if no row is found, the response MUST be `404 Not Found` regardless of the record's existence in another tenant.

#### Scenario: Cross-tenant delete returns 404

- GIVEN a document owned by `org-B` exists with id `doc-1`
- WHEN a user of `org-A` calls `DELETE /documents/doc-1`
- THEN the response is `404 Not Found`
- AND the `org-B` document remains intact in the database

### Requirement: Global Admin MUST Override Tenant Filtering

A user with role `ADMIN` MUST be able to access any tenant's data when the explicit `X-Tenant-ID` header is present, bypassing the organization-scoping filter without leaking unscoped data.

#### Scenario: ADMIN cross-tenant read

- GIVEN an `ADMIN` user of `org-A`
- WHEN `GET /documents` is called with `X-Tenant-ID: org-B`
- THEN `org-B` documents are returned
- AND no other organization's documents leak into the result set