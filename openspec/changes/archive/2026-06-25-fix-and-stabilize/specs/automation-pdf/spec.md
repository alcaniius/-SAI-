# automation-pdf Specification

## Purpose

Ensure the PMA PDF generator renders real `EnvironmentalAspect` fields without runtime errors, runs asynchronously through BullMQ, and exposes the result via a presigned URL or polling endpoint.

## Requirements

### Requirement: PDF Template MUST Read Real EnvironmentalAspect Fields

The PMA PDF template MUST reference only fields that exist on the `EnvironmentalAspect` model (`name`, `impact`, `probability`, `significance`, `jsonData`, `active`). It MUST NOT reference undefined attribute names or rely on dummy/placeholder data.

#### Scenario: PDF renders all populated fields

- GIVEN an `EnvironmentalAspect` with `name`, `impact = HIGH`, `probability = VERY_HIGH`, `significance = CRITICAL`
- WHEN the PMA PDF job renders the template
- THEN the generated file contains the values `name`, `HIGH`, `VERY_HIGH`, `CRITICAL`
- AND the file is a valid PDF (opening bytes `%PDF-`)

#### Scenario: Missing optional fields do not crash

- GIVEN an `EnvironmentalAspect` with `jsonData = null` and `active = true`
- WHEN the PMA PDF job renders the template
- THEN the job completes without throwing
- AND the rendered section for optional fields is omitted or rendered as empty — never as `undefined` / `NaN`

### Requirement: PDF Generation MUST Run Asynchronously via BullMQ

`POST /environmental/pma/:id/generate-pdf` MUST enqueue a job on the `pdf-generation` queue and return `202 Accepted` with the `jobId`. The generation MUST NOT block the HTTP request.

#### Scenario: Enqueue returns 202

- GIVEN a valid PMA owned by the caller's tenant
- WHEN `POST /environmental/pma/:id/generate-pdf` is called by an `ADMIN` or `MANAGER`
- THEN the response is `202 Accepted`
- AND the response body contains `{ jobId }`
- AND the PDF bytes are not yet produced synchronously

#### Scenario: Retry on transient failure

- GIVEN the PDF job fails on the first attempt due to a transient error
- WHEN BullMQ retries (3 attempts, exponential backoff)
- THEN the job is retried up to 3 times
- AND on a successful retry the `generatedPdf` field of the PMA is populated

### Requirement: Caller MUST Be Able to Verify PDF Completion

The client MUST be able to poll `GET /environmental/jobs/:jobId` to inspect progress, and once complete retrieve the PDF via `GET /environmental/pma/:id/pdf`.

#### Scenario: Polling reports completion

- GIVEN a job is enqueued and processing
- WHEN the client polls `GET /environmental/jobs/:jobId`
- THEN the response includes `{ state, progress }`
- AND upon completion `state === 'completed'`

#### Scenario: Download URL is returned once completed

- GIVEN the PDF job has completed
- WHEN the client calls `GET /environmental/pma/:id/pdf`
- THEN the response contains a presigned download URL valid for a limited time (SHOULD be configurable)
- AND calling the URL yields the PDF bytes

### Requirement: Access to PDF Routes MUST Be Enforced by RBAC

Generation routes are restricted to `ADMIN` and `MANAGER`; read routes (`/pdf`, `/jobs`) are available to all authenticated roles per the access matrix, including `USER` and `AUDITOR`.

#### Scenario: USER cannot enqueue but can read

- GIVEN a `USER`
- WHEN `POST /environmental/pma/:id/generate-pdf` is called
- THEN the response is `403 Forbidden`
- AND when the same USER calls `GET /environmental/pma/:id/pdf` after generation completes, the response is `200`