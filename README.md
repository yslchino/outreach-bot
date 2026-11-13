# GET Logistics Outreach Workspace

A shared freight outreach workspace built with React, Express, MongoDB, and Resend. It brings lead imports, draft review, incoming replies, and durable message history into one application.

Built by Erick Hernandez for GET Logistics LLC. The project focuses on a small team's needs: explicit approvals, clear recipient permissions, predictable limits, and recovery when an email provider's outcome is uncertain.

## Source status

V2 is maintained on **v2-staging**. The **main** branch contains legacy V1 source and is not the V2 setup guide. They are separate deployment targets; do not merge into main as part of a V2 deployment.

This repository contains application source and synthetic tests. Live contact lists, mailbox content, operational runbooks, credentials, and database backups belong in private storage.

## Features

- Five named seats with administrator, operator, and viewer roles; public signup is closed.
- Excel/CSV imports with preview and confirmation, duplicate checks, source tracking, and suppression checks.
- Geographic lead filters and individually editable campaign drafts.
- Read-only formatted and plain-text email previews, including unsaved edits, sender, recipient, and postal/opt-out footer.
- Inbox navigation for replies, opt-outs, and unmatched messages needing review.
- Light and dark themes with a browser-saved preference.
- Explicit campaign approval, pause/resume, daily attempt limits, and durable message records.
- Signed Resend webhooks and reply matching using the exact sender and message references.
- Suppression and cancellation of pending messages after replies, opt-outs, bounces, or complaints.
- Manual reconciliation of uncertain sends; uncertain outcomes are never blindly retried.
- Optional AI drafting with a request cap. Sending, background jobs, and AI are disabled by default.

## Architecture

| Layer | Implementation |
| --- | --- |
| Frontend | React 19, Vite, custom CSS |
| API | Node.js 24, Express 5, authenticated role checks |
| Data | MongoDB / Mongoose; contacts, campaigns, message receipts, suppression ledger |
| Email | Resend or SMTP adapter; Resend receiving and signed events |
| Optional drafting | Anthropic SDK, invoked for a saved campaign draft |
| Hosting | One Railway service can serve the built client, API, and webhook |

The frontend uses a same-origin API by default. Provider credentials stay on the server. Database persistence alone does not guarantee backup or availability.

## Local setup

Requires **Node.js 24.x**, npm, and a separate MongoDB development instance. PowerShell examples use npm.cmd; other shells can use npm.

1. Install dependencies and copy the configuration template:

~~~powershell
git switch v2-staging
npm.cmd ci
npm.cmd ci --prefix client
Copy-Item .env.example .env
~~~

2. Generate a JWT secret, then set JWT_SECRET privately in the ignored .env file:

~~~powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
~~~

3. Start MongoDB bound to loopback. With Docker:

~~~powershell
docker run --name get-outreach-dev -p 127.0.0.1:27018:27017 -v get-outreach-dev-data:/data/db -d mongo:8.0
~~~

The default development database is mongodb://127.0.0.1:27018/outreach_v2_dev. Keep it separate from hosted data. The optional local:up launcher requires an existing portable MongoDB runtime under .local/mongodb/runtime; it does not install MongoDB.

4. Set BOOTSTRAP_USERNAME, BOOTSTRAP_DISPLAY_NAME, and a new BOOTSTRAP_PASSWORD privately, then run:

~~~powershell
npm.cmd run bootstrap-admin
~~~

Remove BOOTSTRAP_PASSWORD after successful setup. Add further users from Team. Never publish account access files or bootstrap values.

5. Start the backend and frontend in separate terminals:

~~~powershell
npm.cmd run dev
~~~

~~~powershell
npm.cmd --prefix client run dev
~~~

Open http://127.0.0.1:5173. The backend defaults to 127.0.0.1:5000. Node's built-in watcher restarts the development backend when loaded code changes. Keep VITE_API_URL unset for same-origin operation.

## Configuration and sending

.env.example contains the configuration template, with blank credentials.

| Setting | Default |
| --- | --- |
| SENDING_ENABLED | false |
| JOBS_ENABLED | false |
| AI_ENABLED | false |
| EMAIL_PROVIDER | disabled |
| RESEND_RECEIVING_ENABLED | false |
| ALLOW_REMOTE_DATABASE | false |
| DAILY_SEND_LIMIT | 25 attempts |
| MONTHLY_AI_DRAFT_LIMIT | 100 requests |

Importing or verifying an address does not imply consent. Business contacts remain separate from opted-in recipients. Provider approval flags record an operator's explicit configuration; they do not establish consent or independently verify provider policy. Confirm the provider permits the intended audience before enabling an adapter.

Previewing does not authorize a message. Approval applies to saved drafts. Sending requires valid configuration, eligible recipients, a postal address, suppression checks, explicit campaign approval, and enabled send controls. Provider acceptance and delivery are separate states.

## Replies and recovery

Resend receiving uses a signed POST to /api/webhooks/resend. The server retrieves message content with private credentials and matches replies using both the exact sender and message references. New conversations remain unmatched for review. Replies stop pending follow-ups; detected opt-outs also add a suppression.

- [Resend setup and processing](docs/resend-receiving.md)
- [Optional Outlook connection](docs/outlook-and-resend.md)
- [Deployment and recovery](docs/hosting-plan.md)
- [Private pilot review template](docs/pilot-01-review.md)
- [Security reporting and private data](SECURITY.md)

Keep actual recipients, mailbox identities, provider receipts, and recovery keys private. Never clear history or blindly retry an uncertain send.

## Checks

~~~powershell
npm.cmd test
npm.cmd run test:integration
npm.cmd --prefix client run lint
npm.cmd run build
~~~

The integration suite requires MongoDB on 127.0.0.1:27018. It creates uniquely named outreach_v2_test_* databases and retains them for inspection. Tests use synthetic records and mocked providers, do not load .env, and do not send live email. Browser behavior and live provider delivery require separate verification.

npm.cmd run check runs unit tests, frontend lint, and the build; database integration is a separate command. Check current dependency advisories with npm.cmd audit and npm.cmd --prefix client audit.

## Layout

~~~text
client/src/             Workspace pages, navigation, previews, themes
server/controllers/     Authenticated workspace and campaign actions
server/services/        Imports, rendering, delivery, replies, policy
server/models/          Contacts, campaigns, message history, ledgers
server/tests/           Unit and local HTTP tests
server/integration/     Isolated database workflow tests
docs/                   Generic setup and operating guidance
~~~

## Operating limits

The app targets a small internal team. It does not discover leads, independently verify mailbox ownership, guarantee inbox placement, or guarantee uninterrupted service. The budget display is a planning target, not a provider spending cap. Configure billing alerts, recurring backups, and restore verification separately.

Use one backend replica initially. Review concurrency, deployment topology, rate limits, and recovery before scaling.
