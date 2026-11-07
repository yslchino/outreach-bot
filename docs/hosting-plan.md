# Permanent hosting plan — GET Logistics V2

Prepared November 6, 2026 (America/Los_Angeles). Planning only: no account creation, purchase, deployment, database migration, DNS change, webhook cutover, or send authorization.

## Recommended layout

One continuously running Railway app service serves the built React frontend, authenticated Express API, and signed Resend webhook. Use one replica initially because rate limits are in memory. Disable Railway application sleeping/serverless mode for this receiving service. Use MongoDB Atlas for a separate hosted database. Keep the local development database independent after migration. No Vite development server, Cloudflare tunnel, or local relay is needed for the eventual hosted app.

The owner selected Railway Hobby as the initial plan for the small pilot. Pro remains an upgrade option if operational needs or account features justify it. Five application users do not each need a Railway infrastructure seat. Start with the provider HTTPS hostname to avoid a DNS dependency; an app-specific custom hostname can be added separately later.

## Budget

Planning figures, not a quote or an account inspection. Usage, tax, existing subscriptions, domain renewal, and paid upgrades must be reviewed before purchase.

| Component | Monthly planning allowance | Basis / limitation |
|---|---|---|
| Railway Hobby app | $5 minimum; budget $5–$10 initially | $5 subscription includes $5 resource usage; overage is additional. Estimate, not a spending cap. One continuously running app service. |
| Atlas M0 database | $0 | Candidate for the small pilot; check storage, indexes, connections, and workload before choosing. Not a production availability guarantee. |
| M0 backup preview | Up to $3 if available | Private preview, daily snapshot, four retained snapshots. Availability must be confirmed in this account. |
| Backup/export storage and monitoring | Reserve $5 | Estimate; select actual services and price before purchase. |
| Existing Resend free tier | $0 assumed | Confirm actual account plan and available combined sending/receiving quota. No paid upgrade or overages enabled by this plan. |
| Planned subtotal | $10–$18 | Hobby $5–$10, M0 $0, optional backups $0–$3, and $5 reserve. Leaves approximately $32–$40 under $50 before tax and existing costs. |

If M0 capacity or backup options are unsuitable, consider Atlas Flex instead: $8 base to $30 per 30 days depending on operations. With Hobby budgeted at $5–$10, Flex adds $8–$30 plus backup/monitoring costs. The low-usage estimate is $18–$23 including a $5 reserve; the high end is $40–$45 before tax and existing costs. Neither is a guaranteed bill or spending cap; measure usage before upgrading.

Set billing alerts before operation. A hard Railway spending stop can interrupt incoming reply processing; choose its threshold consciously and alert before it is reached. Backups and availability take priority over silently assuming a zero-cost database is sufficient.

## Existing repository readiness

- railway.json: Railpack build; automatically installs root dependencies, then explicitly runs npm ci --prefix client --include=dev before npm run build; node server/index.js, /health readiness, restart on failure.
- package.json engines pins Node 24.x for Railpack. nixpacks.toml is retained as legacy configuration and is not used by the Railpack builder.
- server/app.js: serves client/dist, API authentication routes, raw signed webhook parser before JSON parser, database-aware /health.
- server/index.js: connects database and initializes model indexes before listening; jobs depend on JOBS_ENABLED.
- server/config.js: production binds 0.0.0.0 by default, accepts Railway PORT; rejects remote MongoDB unless ALLOW_REMOTE_DATABASE=true.
- Current policy records owner-confirmed Resend outreach approval without changing business_contact to opted_in.

The initial plan inspected these files. During staging preparation, railway.json was updated locally to select Railpack and install frontend development dependencies needed by Vite. No service was deployed by this change. Verify the generated Railpack plan and actual build logs before acceptance; a local Vite build is not a container-build verification. Build artifacts remain ephemeral and reproducible.

## Hosted environment template

Configure privately through the provider, never commit real values:

| Setting | Hosted value / handling |
|---|---|
| NODE_ENV | production |
| HOST | 0.0.0.0; do not copy localhost HOST |
| PORT | Provider assigned; do not force local port |
| MONGODB_URI | Dedicated Atlas database URI, TLS, scoped database user |
| ALLOW_REMOTE_DATABASE | true only in hosted environment |
| CLIENT_ORIGIN | Exact eventual HTTPS app origin |
| JWT_SECRET | New high-entropy hosted secret |
| SENDING_ENABLED | false |
| JOBS_ENABLED | false |
| AI_ENABLED | false |
| EMAIL_PROVIDER | disabled until a separately authorized sending change |
| EMAIL_FROM | Erick Hernandez / erick@outreach.getlogistics.llc |
| EMAIL_REPLY_TO | replies@outreach.getlogistics.llc |
| REPLY_PROVIDER | resend |
| RESEND_RECEIVING_ENABLED | true once private receiving credentials and routing are ready |
| RESEND_RECEIVING_ADDRESS | replies@outreach.getlogistics.llc |
| RESEND_API_KEY | Private provider key with required retrieval permissions |
| RESEND_WEBHOOK_SECRET | Secret for the webhook registration pointing at the hosted endpoint |
| RESEND_OUTREACH_APPROVED | true based on owner confirmation for this account/use case |
| POSTAL_ADDRESS | Owner-provided business address, copied privately from local configuration |
| DAILY_SEND_LIMIT | 25 maximum configured initially; does not authorize sends |
| BUSINESS_TIMEZONE | America/Los_Angeles |

Do not bulk-copy local environment files, bootstrap passwords, development access files, or unused Outlook/Gmail/AI credentials. Test the built client uses the same-origin API. Configure a dedicated least-privilege Atlas user and network access; choose a supported outbound-IP/network approach before provisioning rather than silently opening database access to the entire internet.

## Database continuity and backup

Before cutover, create an encrypted complete export and prove it can be restored into a separate test database. Preserve ObjectIds and all application collections, including users/roles, contacts and provenance, campaigns, messages/provider receipts/Message-IDs, suppressions, usage counters, outreach reservations, import batches, inbound-email ledger, and mailbox/OAuth state if present. Do not import contacts alone or reset durable send history. Invalidate stale OAuth attempts and review any mailbox secrets deliberately rather than copying them without their encryption keys.

Reconcile the source immediately before migration: 1,200 business_contact records, 10 pilot drafts with the approved freight copy, one accepted internal message, skipped internal follow-up, two processed internal replies, and the owner's Gmail opt-out suppression. Count all collections and inspect unique indexes. Preserve user identity references; rotate credentials deliberately and confirm the five-seat limit remains effective.

Plan a brief edit freeze. Receiving can still mutate the source, so take a final synchronized export after pausing local webhook ingress, then import and validate the target. Provider webhook retries can bridge this interval, but verify current retry behavior and available event replay before cutover; do not assume indefinite retries. Review provider receipts for events during the gap and replay missing events through the supported provider mechanism. Never synthesize a successful received event or clear the ledger to force processing.

Choose daily encrypted backups with a target of at most 24 hours of data loss and a documented restore procedure. If the M0 backup preview is unavailable, select and price an automated export/backup job before launch, or choose a tier with suitable backups. Keep a pre-cutover snapshot and verify an independent restore. A managed database alone is not a backup.

## Preparation and acceptance sequence

1. Review this plan and choose the Railway/Atlas tiers, network access approach, backup method, and billing limits. Inspect existing accounts before creating duplicate projects. Obtain explicit authorization before purchases or deployment.
2. Run unit tests, database integration tests in their isolated test database, frontend lint, and production build. Review auth/rate limiting behind Railway's proxy before exposing the app; configure trusted proxies only for the verified topology.
3. Prepare hosted secrets privately and keep sending/jobs/AI false. Deploy a separate non-sending environment only after approval. Verify health, HTTPS, login, role boundaries, same-origin frontend, API authentication, and one-replica behavior. The authenticated dashboard is intentionally hosted; do not expose local dashboard/API routes through the temporary tunnel.
4. Restore the database snapshot; check counts, indexes, message identity, permissions, suppressions, and draft state. Freeze edits and complete the final synchronization before webhook cutover.
5. Point the existing Resend webhook registration to /api/webhooks/resend on the hosted HTTPS origin, preserving its event subscriptions. Confirm signing-secret handling. Check account endpoint limits before attempting a second registration. Only one database should actively process live callbacks after cutover.
6. Verify signed/unsigned ingress, delivery-event processing, exact-reference matching, suppression, and duplicate replay. Any new email requires separate audience-specific authorization; the prior exactly-one test authorization is exhausted, and the owner's Gmail remains suppressed. Use replay and mocked tests where appropriate.
7. Prove receiving works with the PC/tunnel offline. Reconcile events during migration and retire the temporary routing only after hosted acceptance.
8. Inspect all 10 rendered pilot emails, including final sender, reply address, business footer, and unsubscribe instructions. Sending remains a separate explicit batch approval and control change; no campaign may be queued by this migration.

## Failure and rollback

Keep local data and the encrypted pre-cutover backup intact. If hosted acceptance fails before new hosted events, return webhook routing to the verified local endpoint and reconcile provider retries. If the hosted database has processed events or edits, export/reconcile those changes and suppressions before rollback; reverting to a stale database risks duplicate sends and lost opt-outs. Keep all sending controls disabled throughout. Do not clear message history, suppression, or inbound-ledger records as a repair step.

## Current authorization boundary

Only the plan is completed. No provider account, infrastructure, database, DNS, or Resend webhook has been changed by this planning task. No prospect email is authorized. No commit or push was made.

## Official references checked

- https://docs.railway.com/pricing
- https://docs.railway.com/pricing/plans
- https://www.mongodb.com/docs/atlas/billing/atlas-flex-costs/
- https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/
- https://resend.com/pricing

Provider pricing and preview availability can change; confirm in the actual account before provisioning.
