# Governed device operations workflow

## Scope

The new endpoint is `/api/governed-device-operations`. It implements authenticated device provisioning evidence, versioned telemetry intake, anomaly routing, maintenance approval, and operator outcomes. The state sequence is:

`requested → identity_verified → provisioned → telemetry_validated → anomaly_review → maintenance_approved → maintenance_complete → outcome_recorded`

Generated `gap-*` routes are intentionally unmounted. They remain source artifacts for later review and cannot be mistaken for connected capabilities.

## Safety and data boundaries

- Every request is authenticated and resolved against `governed_tenant_memberships`; token roles alone do not grant tenant access.
- Memberships can be restricted by opaque `subject_ref_prefix`. Case lists, evidence, history, assessments, and transitions apply that scope.
- Mutations require `Idempotency-Key`; reusing a key for different input fails with `IDEMPOTENCY_PAYLOAD_CONFLICT`.
- Transitions require `expectedVersion`, row locking, authoritative evidence, permitted roles, a reason, and independent approval where configured.
- Evidence stores an approved-storage pointer, source version, SHA-256 digest, capture time, and non-sensitive metadata. Raw content and obvious personal-data fields are rejected.
- Case identity, evidence, and events are protected from destructive updates/deletes by database constraints and triggers. The event history is readable at `GET /api/governed-device-operations/cases/:id/history`.
- Deterministic triage validates device identity, certificate/firmware/schema/unit versions, sequence gaps, latency, telemetry batch digests, and dual control. It always returns `automatedDecision: false` and `requiresHumanReview: true`.
- No MQTT broker, certificate authority, device, OTA pipeline, or control channel is supplied. The workflow cannot issue control or firmware commands.

The code and tests have not been professionally, legally, clinically, regulatorily, or production validated.

## Connector quarantine

The policy endpoint declares device registry/PKI, gateway/broker, time-series storage, CMMS, edge deployment, and alerting connectors. This repository contains no credentials or verified provider clients for them. Each is reported as `configured: false` and `quarantined_until_credentialed_and_contract_tested`. The connector-failure API only records sanitized operational failure metadata; it does not call a provider.

Before enabling any connector, supply credentials through an approved secret store, establish contracts and data-use authority, add signed-request and response-schema validation, run provider sandbox contract tests, and define retry/dead-letter ownership. Failures must leave the case in its prior state.

## Database and access provisioning

Migration `backend/migrations/001_governed_workflow.sql` is forward-only and contains no drop/down path. The application never applies it automatically. An operator should back up and use normal change control, then run:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/001_governed_workflow.sql
```

Provision tenant memberships separately through an administrator-controlled process. Do not expose membership creation as public self-service. Use opaque subject references; store source documents in approved encrypted systems.

## Non-destructive local run

1. Copy `.env.example` to `.env`, generate a unique JWT secret of at least 32 characters, and configure a dedicated database account. Provider variables may remain blank.
2. Install locked dependencies explicitly with `npm ci` in the package directories. Dependency installation is never part of startup.
3. Apply the governed migration explicitly as described above. Seeds are optional demo operations and are never part of startup.
4. Run `./start.sh`. It refuses occupied ports and missing dependencies; it does not kill processes, install packages, create/migrate/seed databases, or start PostgreSQL.
5. Keep `ENABLE_LEGACY_SCHEMA_BOOTSTRAP=false`, `ALLOW_MOCK_PROVIDERS=false`, and any demo/scheduler flags false. Production startup rejects unsafe flags.

## Verification

From `backend`, run `npm run check:governance`. The dependency-free Node test suite covers configuration, authorization context, sensitive-data rejection, deterministic/fail-closed assessment, optimistic concurrency, evidence gates, RBAC, dual control, tenant scope, idempotency, migration immutability, and router contracts. CI repeats these checks and validates `start.sh` syntax.

Database execution, real HTTP end-to-end testing, provider sandboxes, load tests, accessibility evaluation, and production security review remain explicit deployment gates because no database, provider, credentials, licensed data, hardware, or production infrastructure was used here.
