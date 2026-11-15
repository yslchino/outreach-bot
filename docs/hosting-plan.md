# Deployment and recovery guide

V2 uses one continuously running Railway service and a separate MongoDB database. Express serves the built frontend, authenticated API, signed webhook, and database-aware /health endpoint.

Keep actual project URLs, database names, usernames, network configuration, billing settings, migration mappings, and recovery material in private operating records.

## Deployment

- railway.json selects Railpack, installs frontend build dependencies, builds the client, and starts node server/index.js.
- Use Node.js 24.x and one backend replica initially. Review rate limits, queue behavior, and concurrency before scaling.
- Store credentials in provider-managed secrets. Never copy environment files into public builds or issue reports.
- Bind hosted services to 0.0.0.0 using the provider-assigned port, an exact client origin, and a separate JWT secret.
- Use a dedicated database identity and appropriate network restrictions. Remote databases require ALLOW_REMOTE_DATABASE=true.
- Keep receiving available continuously; sleeping services and temporary PC-hosted tunnels can interrupt callbacks.
- Keep SENDING_ENABLED, JOBS_ENABLED, and AI_ENABLED false during deployment and receiving verification.

## Database changes

Create an encrypted complete backup and restore it into a separate test database before migration. Preserve identifiers, roles, message history, provider receipts, usage/reservations, suppression, and inbound-event ledgers. A contact spreadsheet alone is not a complete migration.

Prepare an explicit plan, freeze conflicting edits, map ownership deliberately, reconcile receiving events, and verify counts/indexes. Require approval before hosted writes. Keep actual identifiers and reports private.

Reconcile new hosted events before rolling back to an older snapshot. A stale restore can lose opt-outs or cause duplicate outreach.

## Backups and budget

Verify backup options in the actual account. An enabled schedule is not evidence of a completed current snapshot. Define recovery targets, confirm completion, retain encryption keys privately, and test restores separately.

Set provider billing alerts and limits. A Railway hard spending limit can stop both the app and receiving. The dashboard budget is a planning target, not a synchronized bill or combined cap. Check current provider pricing and backup availability before purchase.

## Acceptance

1. Run unit and isolated database integration tests, frontend lint, and a production build.
2. Deploy only approved source and verify the intended commit reports healthy.
3. Verify login, roles, stored drafts, send guards, and the served frontend.
4. Verify receiving and body retrieval with controlled records. Outbound email requires separate audience-specific approval.
5. Review complete rendered emails and postal/opt-out details before approving a campaign.

A push, deployment, or migration does not authorize sending. Do not clear suppression or message history as a deployment repair.

## Selected approval and worker holds

POST /api/campaigns/:id/launch requires confirmed=true and a nonempty, unique messageIds array (maximum 100). Each ID must be a current draft in that campaign; omitted selections do not mean approve all. Deploy the matching client and server together. Approval remains administrator-only and all sending/eligibility checks still apply.

The worker serializes each campaign with a database claim and pauses after provider failure, unknown delivery outcome, or interrupted processing. A later tick also holds recent failures, bounces, and complaints before advancing. Resolve uncertain/processing records and review provider evidence before confirming resume; this resumes only queued messages. A pause or hold cannot recall in-flight provider requests. Keep sending and jobs disabled during rollout and preserve receipt/idempotency records.
