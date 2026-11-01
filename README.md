# GET Logistics Outreach Workspace · V2

A five-user internal outreach workspace built with React, Express, MongoDB, Claude, and a configurable email adapter.

**Workflow:** import leads → verify addresses and permission → create campaign → edit drafts → administrator approves → durable queue → message journal → review due follow-up drafts.

Sending, background jobs, and AI calls are **off by default**. This revision has not been deployed.

## What's new

- Responsive sidebar workspace: Overview, Leads, Campaigns, Activity, Team, Settings.
- Five named accounts: owner/admin, operator, viewer. Public signup is closed.
- Database-backed permission checks and revocable eight-hour sessions. Disabling or changing an account revokes its sessions.
- A protected owner account in seat 1 prevents accidental administrator lockout.
- Campaigns and individual messages are separate records; sent bodies are not overwritten by later campaigns.
- Preview-and-confirm .xlsx/CSV imports, normalized emails, duplicate and suppression checks, source tracking, and explicit address/permission review.
- Spreadsheet parsing runs in a worker with a 5-second timeout, memory limits, and no inherited environment variables.
- Admin approval, pause/resume, durable per-message claims, a global normalized-email reservation, daily attempt limits.
- Resend returned errors are checked. Unknown transport outcomes are held for manual reconciliation, never automatically retried.
- Suppressions stop all queued messages to an address. Signed Resend webhooks update delivery/bounce/complaint outcomes.
- Gmail reply matching requires the correct sender and an exact message reference; it includes archived replies.
- Follow-ups become **editable drafts after at least three elapsed days**, prepared from the campaign screen. An administrator must approve them.
- Template drafts cost nothing. Optional Claude generation has a monthly request cap; web research is disabled.

## Local development

### This machine is configured

The Windows workspace now uses an isolated portable MongoDB 8.0.34 instance on
`127.0.0.1:27018`, with its runtime, data, and logs under ignored `.local/mongodb/`.
The archive was downloaded from [MongoDB's official releases](https://www.mongodb.com/try/download/community-edition/releases)
and verified against its SHA-256 checksum. Docker and a Windows service are not required.

~~~powershell
npm run local:up
~~~

This starts or reuses the local database, backend, and frontend, and refuses to run
if sending, AI, scheduled jobs, or a remote database are enabled.
Services run in the background and must be started again after a reboot.
The backend and database bind to loopback only.

Local login details are in `.local/dev-access.json`. The initial administrator is
`chino`; its randomly generated password is not committed. Keep this file private.
The bootstrap password has been removed from `.env`.

There are five clearly labeled `[TEST]` contacts and four stored drafts for UI review.
Their addresses use `.invalid` domains. No accepted or delivered emails are fabricated
in the development workspace. The separate integration-test databases contain explicitly
mocked message outcomes and are never used by the preview.

### Fresh setup

Requires Node.js **24.x** and a separate MongoDB development database.

1. Install the locked dependencies:

~~~powershell
npm ci
npm ci --prefix client
Copy-Item .env.example .env
~~~

2. Generate a JWT secret:

~~~powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
~~~

Put that value in `.env` as `JWT_SECRET`. Never commit `.env`.

3. Start a local MongoDB instance. If Docker Desktop is available, this creates a development-only instance bound to loopback:

~~~powershell
docker run --name get-outreach-dev -p 127.0.0.1:27018:27017 -v get-outreach-dev-data:/data/db -d mongo:8.0
~~~

The default URI is `mongodb://127.0.0.1:27018/outreach_v2_dev`. For Atlas, create a **separate development database and limited database user**, set `MONGODB_URI`, and deliberately set `ALLOW_REMOTE_DATABASE=true`. Do not copy production credentials into local development.

4. Set `BOOTSTRAP_USERNAME`, `BOOTSTRAP_DISPLAY_NAME`, and `BOOTSTRAP_PASSWORD` in `.env`. Passwords require at least 12 characters, at most 72 UTF-8 bytes.

~~~powershell
npm run bootstrap-admin
~~~

This initializes the named owner in seat 1. It refuses to run if an active administrator already exists. Remove `BOOTSTRAP_PASSWORD` afterward. Add the other four accounts from Team settings.

5. Run the backend and frontend in separate terminals:

~~~powershell
npm run dev
~~~

~~~powershell
npm --prefix client run dev
~~~

Open [localhost:5173](http://localhost:5173). Vite proxies `/api` to the local backend; it never defaults to the production URL. Keep `VITE_API_URL` unset for same-origin operation.

## Development defaults

| Variable | Default / purpose |
| --- | --- |
| SENDING_ENABLED | false; prevents all provider sends |
| JOBS_ENABLED | false; stops queue and Gmail scheduling |
| EMAIL_PROVIDER | disabled; select resend or smtp deliberately |
| AI_ENABLED | false; manual templates remain available |
| DAILY_SEND_LIMIT | 25; shared across the entire workspace |
| MONTHLY_AI_DRAFT_LIMIT | 100; requests, not dollars |
| BUSINESS_TIMEZONE | America/Los_Angeles; daily allowance boundaries |
| ALLOW_REMOTE_DATABASE | false; remote URIs require explicit opt-in |
| CLIENT_ORIGIN | http://localhost:5173 |

The $50/month setting is a **budget target**, not a synchronized bill or dollar-based spending cap. Provider charges must be monitored in their own accounts. No new runtime packages were added for v2.

## Spreadsheet imports and geographic selection

- Import up to 2,000 data rows / 1 MB from the first worksheet. Header aliases include Email, Company, First Name, Last Name, Region, State, and Industry.
- Preview mapped columns, source row numbers, missing states, invalid rows, existing contacts, and suppressed addresses before saving. Existing contacts are preserved; repeat confirmation does not duplicate records.
- Preview batches belong to the uploading user and expire after 24 hours. Completed batches retain summary metadata and discard staged contact rows.
- Address verification records the reporting user and timestamp. Verified cold contacts retain the `business_contact` classification; verification never implies opt-in.
- Leads and campaign recipient selection support region, dependent state, industry, and missing-field filters. Geographic labels from the source are preserved; Transportation entries remain available for manual shipper-fit review.
- `POST /api/contacts/import/preview` stages an upload; `GET /api/contacts/import/:id` pages through it; `POST /api/contacts/import/:id/confirm` requires `{ "confirmed": true }`. The old `POST /api/contacts/import` path stages a preview only.
- Importing never generates messages or invokes email/AI providers.

## Recipients and sending

Each lead must have a verified address and an explicitly reviewed permission classification. Verification is a recorded human check, not an automatic email-validation service.

- **Resend:** only explicitly opted-in leads can use this adapter. Resend prohibits unsolicited cold outreach; a paid plan does not remove that restriction.
- **SMTP:** configure a provider that permits the intended recipient type. Business-contact outreach also requires `SMTP_OUTREACH_APPROVED=true`; this flag records your configuration choice, not an endorsement or deliverability guarantee.

Set the sender, reply-to, postal address, and provider credentials before enabling `SENDING_ENABLED`. Startup rejects incomplete enabled configurations. Messages include a postal-address footer and an instruction to unsubscribe by reply.

The queue starts only when `JOBS_ENABLED=true`. One backend instance is the initial deployment target. The worker processes one message per active campaign every ten seconds, with a global daily attempt allowance. Failed or abandoned reservations still consume that day's attempt allowance conservatively.

Approvals apply to **saved** draft content. Pause takes effect before the next provider call; a message already in flight can finish. Disabling an account revokes its access but does not cancel previously approved campaigns; pause those separately if needed.

### Uncertain outcomes

A timeout, interrupted worker, or failure to save a provider receipt can produce `uncertain`. Check provider records and reconcile from Activity as an administrator. Record the evidence and provider ID where available.

Reconciliation records an outcome; it **does not resend**. Recipient reservations remain in place. There is intentionally no one-click retry of a failed or uncertain message in this release.

### Delivery events

For Resend, set `RESEND_WEBHOOK_SECRET` and configure the provider to POST to:

~~~text
https://YOUR-APP/api/webhooks/resend
~~~

Subscribe to `email.delivered`, `email.bounced`, and `email.complained`. Signature verification happens against the raw body. Bounce and complaint events suppress the recipient. SMTP acceptance is recorded, but SMTP delivery/complaint events require a provider-specific integration; the UI will show delivery as unknown.

### Replies and follow-ups

Configure Gmail credentials securely on the server. The old browser OAuth token-display routes are retired. Tokens are never returned to the dashboard.

Hourly scans run at minute 5 and require exact `In-Reply-To` or `References` matches to recorded message IDs. Confirm the selected provider preserves the supplied Message-ID before relying on automatic matching. If it rewrites IDs, use manual reply marking until a provider-specific mapping is implemented.

A body-only unsubscribe reply is treated as a reply and stops that lead's queued messages. Subject lines containing “unsubscribe” also add a suppression automatically. Other unsubscribe requests must be entered through “Suppress address.” Do not rely on body parsing for opt-out handling.

After initial sending completes, use **Prepare due follow-ups** in the campaign. Only unreplied, unsuppressed leads with accepted originals older than three days qualify. Follow-ups are stored and individually editable before batch approval.

## Tests and checks

~~~powershell
npm test
npm run test:integration
npm --prefix client run lint
npm run build
~~~

Or run `npm run check`. Tests use mocked providers and users, plus temporary localhost HTTP servers; they do not load `.env`, connect to production, or send email.

Coverage includes:
- Closed registration and retired v1 routes.
- Disabled/revoked sessions and database-derived roles.
- Concurrent seat allocation and campaign draft locks.
- Entire-batch approval rejection when a recipient is ineligible.
- Normalized recipient reservations, import validation and duplicate handling.
- Provider rejection versus unknown outcome.
- Provider acceptance followed by database-save failure.
- Suppression, pause, daily limits, and a reply arriving immediately before send.
- Exact reply-reference matching and timezone boundaries.

**Validation:** the unit suite and a real local MongoDB integration suite pass. Run `npm run test:integration` after starting the local database. Each run retains a uniquely named `outreach_v2_test_*` database for inspection; it never drops data. Successful-send scenarios use a mocked provider in a separate process. Live provider credentials, DNS, Gmail matching, SMTP delivery, and production migration remain untested.

## Deployment plan — requires a separate approval

The backend can serve `client/dist`, allowing a single service and same-origin API calls. Railway/Nixpacks configuration installs both locked dependency sets, builds the frontend, starts Express, and uses `/health` for database readiness.

1. Create staging with its own database, credentials, and sending/jobs disabled.
2. Bootstrap the owner and add the other four users.
3. Verify lead import, draft editing, role restrictions, queue recovery, and legacy-history visibility.
4. Test delivery only to explicitly approved internal test recipients after a separate sending authorization.
5. Verify sender DNS, Gmail account identity, exact reply headers, suppressions, and provider event signatures.
6. Export and test restoration of production data before any production transition.
7. Review the production change and deploy only with explicit authorization.

No deployment, production database migration, or outbound email is part of the local implementation.

## Legacy data and access

- V1 JWTs are rejected. Existing users without a v2 seat and explicit activation cannot sign in.
- Bootstrap only the intended owner; do not automatically promote all legacy users.
- Old email/follow-up fields remain untouched and appear as labeled legacy history in lead details.
- Legacy sent contacts are not eligible for a new initial campaign.
- No bulk normalization, deletion, or deduplication migration runs at startup.
- MongoDB creates the v2 indexes at startup. Test this on a restored staging copy before production.
- V1 email, automation, AI, and browser OAuth endpoints return HTTP 410.

## Backup and cost discipline

Keep React, Express, and MongoDB. Start with one service and one mailbox; five workspace accounts do not require five provider seats or mailboxes.

Plan around a $10 hosting allowance, $5 AI allowance, $15 mailbox/provider allowance, and $20 for backups/contingency. Actual costs depend on existing subscriptions and provider suitability. Five new paid mailboxes may exceed this allocation.

Atlas Free does not provide managed backups. Schedule encrypted exports to private storage and perform restore tests on a separate database. Do not place database dumps, credentials, or contact lists in Git or a public build directory. Backup automation is a required operational follow-up, not implemented here.

## Layout

~~~text
client/src/
  App.jsx               Session and sidebar shell
  api.js, hooks.js      API errors, session handling, data loading
  components/UI.jsx     Shared accessible UI elements and message viewer
  pages/                Overview, Leads, Campaigns, Activity, Team, Settings
server/
  app.js, index.js       HTTP app, database startup, job lifecycle
  config.js             Safe defaults and configuration validation
  controllers/          Auth, leads, campaigns, reconciliation
  models/               Users, contacts, campaigns, messages, usage, suppression, reservations
  services/             Queue processing, mail adapters, imports, AI, recipient policy
  jobs/                 Gmail reply scanning
  tests/                Node test suite with no live integrations
~~~
