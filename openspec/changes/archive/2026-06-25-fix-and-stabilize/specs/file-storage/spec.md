# file-storage Specification

## Purpose

Unify document and site-certificate file persistence behind S3/MinIO storage accessed through presigned URLs, with a backward-compatible dual-read fallback during migration and idempotent uploads.

## Requirements

### Requirement: Documents and Certificates MUST Use S3/MinIO Storage

File persistence for `Document`, `DocumentVersion`, and site certificate files MUST upload bytes to S3/MinIO via the configured provider; filesystem paths MUST NOT be required for new uploads.

#### Scenario: New document upload lands in MinIO

- GIVEN a `MANAGER+` user creates a document with an attached file
- WHEN `POST /documents` (or version) is executed
- THEN the file bytes are stored in the configured S3/MinIO bucket
- AND the persisted row stores the object key (not a local filesystem path)

### Requirement: Uploads MUST Be Idempotent

Uploading the same file twice (identical content hash within the same tenant) MUST NOT duplicate storage or duplicate the document record; a collision-aware path/key SHOULD be used.

#### Scenario: Duplicate upload reuses existing entry

- GIVEN an existing document file with content hash `H` in `org-A`
- WHEN another upload in `org-A` posts the same bytes for the same logical document
- THEN no second object is created in the bucket (or the same key is overwritten atomically)
- AND the response references the existing document/file entry

### Requirement: Downloads MUST Use Presigned URLs

`GET` of a stored file MUST return a short-lived presigned URL (or stream the bytes via a presigned redirect) rather than exposing a direct public S3 endpoint.

#### Scenario: Presigned URL has bounded TTL

- GIVEN a stored document file exists
- WHEN the client requests its download URL
- THEN the returned URL contains signature parameters and a configurable expiry (SHOULD ≤ 15 minutes)
- AND the URL is unusable past its expiry

### Requirement: Dual-Read Fallback MUST Support Migration

Read paths MUST attempt S3 first and, when the object key indicates a legacy local path AND the S3 object is absent, fall back to reading from the legacy local filesystem so in-flight documents remain accessible during migration.

#### Scenario: Legacy file read succeeds after migration start

- GIVEN a pre-migration document whose row stores a local filesystem path
- WHEN the download endpoint resolves the file
- THEN the S3 lookup fails (object not found) and the legacy local path is read instead
- AND the response returns the file bytes with `200`

#### Scenario: S3 object shadows legacy path post-migration

- GIVEN a migrated row where both an S3 object and a stale local path exist
- WHEN the download resolves the file
- THEN the S3 object is served
- AND the local path is not consulted

### Requirement: Storage Access MUST Be Tenant-Scoped

S3/MinIO object keys MUST include a tenant prefix (e.g. `tenants/<organizationId>/...`) so bucket-level isolation and per-tenant listing are possible; cross-tenant presigned URLs MUST NOT be issued via tenant endpoints.

#### Scenario: Key namespace includes organizationId

- GIVEN a document is uploaded for `org-A`
- WHEN the storage service computes the object key
- THEN the key starts with `tenants/org-A/`
- AND a presigned URL for the key cannot be requested via an `org-B`-scoped endpoint

### Requirement: RBAC MUST Apply to File Routes

Upload routes (`POST`, version add) follow the documents RBAC matrix; download routes (`GET`) are available to every authenticated role per the matrix (USER/AUDITOR read).

#### Scenario: AUDITOR may download but not upload

- GIVEN an authenticated `AUDITOR`
- WHEN the download URL endpoint is called for an existing document
- THEN the presigned URL is returned
- AND when the upload endpoint is called, the response is `403 Forbidden`