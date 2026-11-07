# Resend reply handling

Resend is the selected receiving provider for GET Logistics. Replies will use `replies@outreach.getlogistics.llc` and appear under **Settings → Resend reply inbox**, with a matched reply preview in lead details. Outlook forwarding is off. Microsoft application registration is not required for this mode; the optional Outlook implementation is retained separately.

## Current setup

- Sending domain: `outreach.getlogistics.llc`.
- Receiving capability and the Squarespace MX record are verified in Resend.
- Local configuration selects `REPLY_PROVIDER=resend` and sets `RESEND_RECEIVING_ADDRESS=replies@outreach.getlogistics.llc`.
- The approved temporary Cloudflare tunnel and Resend webhook are connected. `RESEND_RECEIVING_ENABLED=true` and `EMAIL_REPLY_TO=replies@outreach.getlogistics.llc` are configured locally. `SENDING_ENABLED=false` and `JOBS_ENABLED=false` remain in place.
- Public-path checks confirmed a valid signed synthetic event reaches the app, unsigned/tampered requests are rejected, and other API/dashboard routes are blocked. Live internal delivery, exact reply matching, follow-up cancellation, and opt-out suppression passed on November 6, 2026 (America/Los_Angeles).
- The pilot remains ten unsent drafts.

## Squarespace DNS

Add the following **new custom record** under `getlogistics.llc`. These values were retrieved from the domain's receiving records in the Resend API:

| Field | Value |
|---|---|
| Type | MX |
| Host | `outreach` |
| Mail server / Data | `receive.forge.rmta.net` |
| Priority | `10` |
| TTL | Squarespace default, 4 hours |

This record routes incoming mail at the `outreach` subdomain to Resend. Keep the root-domain records and the existing DKIM / `rsend.outreach` / `send.outreach` sending records. Verify receiving in Resend after saving; DNS propagation can delay verification. Sending and receiving are separate capabilities, so enabling receiving can show the domain as partially verified until its new MX record verifies.

## Public webhook and activation

1. Prepare a public HTTPS endpoint for `POST /api/webhooks/resend` on a separate staging service or a controlled development tunnel. Publishing/exposing an endpoint is a separate operational action; localhost cannot receive provider webhooks directly.
2. Register that URL in Resend Webhooks. Include `email.received`, `email.sent`, `email.delivered`, `email.bounced`, and `email.complained`. One endpoint handles all these events.
3. Store `RESEND_WEBHOOK_SECRET` and a Resend API key with permission to read received and sent email in the endpoint's private environment. Do not place credentials in frontend code or chat.
4. Only after receiving DNS and the callback path are ready, set `RESEND_RECEIVING_ENABLED=true` and `EMAIL_REPLY_TO=replies@outreach.getlogistics.llc`. Keep `SENDING_ENABLED=false` and `JOBS_ENABLED=false` throughout verification.
5. Restart the endpoint and app. A signed received event now fetches the body/headers from Resend. Resend's webhook metadata alone does not include the full email content.
6. Test with an explicitly approved internal recipient: a new plain-text reply, a later opt-out, an unmatched new thread, and a replayed webhook event. Isolated inbox-test emails sent outside campaigns cannot prove campaign matching; use a clearly labeled internal-test campaign with an explicitly authorized recipient for the live test.

When receiving mode is selected, startup refuses to enable campaign sending without activated receiving, its configured reply address, and the webhook signing secret. These configuration checks are not a substitute for a successful live end-to-end test. Existing recipient eligibility and postal-address checks also remain in effect.

## Processing behavior

### Optional temporary development relay

`node server/scripts/webhookRelay.js` binds only to `127.0.0.1:5001` and accepts only signed JSON POSTs at `/api/webhooks/resend`. It rejects all dashboard/API paths, caps request bodies at 256 KB, limits concurrent requests, and forwards the unchanged payload and signature headers to the local app. Configure the signing secret before starting it.

A temporary Cloudflare Quick Tunnel can point to this restricted relay after separate approval to open the public connection. It runs only while the PC and processes remain active, its hostname changes on restart, and it is for testing rather than a permanent production deployment. No tunnel is started by the application or local launcher.

The approved connection's current URL and Resend webhook ID are saved in ignored `.local/webhook-connection.json`; public-route test results are in `.local/webhook-public-check.json`. Process IDs are in `.local/webhook-tunnel.pid` and `.local/webhook-relay.pid`. If the tunnel stops, incoming email can still reach Resend, but callbacks to this PC stop. A new Quick Tunnel requires updating the registered webhook URL. Do not enable campaign sending based on this temporary connection's availability.

- Verify the raw webhook signature before database or Resend retrieval work.
- Persist an incoming-email ledger keyed by Resend email ID. Atomic leases prevent simultaneous duplicate processing. Terminal events are acknowledged without applying them again. Temporary errors return a retryable response; expired processing leases can be recovered on a later event retry.
- Retrieve email content only from fixed Resend API endpoints, with a 15-second timeout per request. Attachments and raw download URLs are not fetched. No automatic replies or forwards are sent.
- Require the configured receiving address, an exact sender, and an exact `In-Reply-To` or `References` match to a known accepted outbound message. If its actual Resend Message-ID was not saved yet, backfill up to ten original IDs per attempt. Provider errors or persistence races are retried rather than guessed from a subject.
- Matched replies mark the contact as replied and skip pending messages. Clear opt-outs also suppress the normalized email address across campaigns. Older events cannot overwrite a newer reply preview, and no incoming event removes a suppression.
- Unmatched messages remain visible for review. They do not automatically change a contact. HTML-only matched messages stop follow-ups but require content review; raw HTML is not rendered or used for body-based opt-out classification. Subject-only `unsubscribe` requests are still recognized when the reply matches.
- The body parser handles a small set of clear removal phrases. Ambiguous text, separate new threads, and HTML-only removal requests need human review using **Suppress address**. Received-message previews are limited to 4,000 characters and exclude quoted history where recognized.
- Failed events can be inspected/retried through Resend's webhook event dashboard. Do not clear a processed ledger record to force a resend.

## Verification

Run `npm test`, `npm run test:integration`, `npm --prefix client run lint`, and `npm run build`. Database integration tests use a unique localhost test database and mocked provider responses. They cover signed ingress, duplicate replay, delayed Message-ID metadata, temporary provider errors, opt-outs, out-of-order replies, and HTML review handling. No email is sent by these tests.

Receiving counts toward the account's email quota. Hosting a continuously available webhook is separate from Resend's plan. DNS and the temporary public endpoint are connected. Live provider-to-dashboard delivery was verified in the internal test below; permanent hosting remains outstanding.

References: [Receiving email](https://resend.com/docs/dashboard/receiving/introduction), [retrieving content](https://resend.com/docs/dashboard/receiving/get-email-content), [reply threading](https://resend.com/docs/dashboard/receiving/reply-to-emails).

## Live internal verification — November 6, 2026 (America/Los_Angeles)

Campaign: **INTERNAL TEST ONLY — Gmail reply and opt-out 01**. Exactly one owner-authorized email was submitted to the owner’s Gmail address. Sender: erick@outreach.getlogistics.llc; reply address: replies@outreach.getlogistics.llc.

| Check | Observed result |
|---|---|
| Outbound receipt | Provider ID 01a1b34e-d206-7a85-a017-64c6b73278e9; accepted and delivered |
| Actual outbound Message-ID | Saved and verified against Resend metadata |
| Normal reply | Incoming ID fee36e07-a3e4-4994-98bd-a354b5608be8; processed with exact sender and original message-reference match |
| Follow-up cancellation | Harmless internal follow-up changed from draft to skipped, with reason “Recipient replied.” |
| Opt-out reply | Incoming ID 7d4b1e83-59b5-49e5-98c2-1124ecdfbcf8; “Please remove me from your list.” processed as opt_out |
| Durable suppression | Owner’s Gmail contact is suppressed; address-level opt_out record exists; zero draft/queued messages for that address |
| New conversation | Earlier “Receiving Test” remains unmatched with no_exact_reply_reference |
| Restricted tunnel | Signed synthetic request returned 204; unsigned request 400; other API route 404 |
| Protected state | Washington pilot remains 10 unchanged drafts; 1,200 imported business_contact records remain separate from opted_in; sending, jobs, and AI disabled |

The test email was submitted directly through Resend for this one explicitly authorized internal operation and persisted in campaign/message history with its provider receipt and idempotency key. The normal campaign worker and its send guards were not exercised by this live send. No prospect message or follow-up was sent. Credentials and temporary hostname remain in ignored local files.

Limits: live bounce, complaint, HTML-only, duplicate replay, and failure recovery scenarios were not exercised during this manual test. Automated coverage is described above; this documentation update does not claim a fresh test-suite run. The temporary tunnel requires the PC and relay to stay online. The owner’s Gmail remains suppressed; do not clear suppression to repeat a send. See [pilot review](pilot-01-review.md) for current sending blockers.

## Account-specific outreach approval

The owner reports Resend approved outreach to the imported business contacts by phone. No written provider confirmation was reviewed. RESEND_OUTREACH_APPROVED defaults to false; true permits business_contact recipients through the Resend permission check without changing them to opted_in. The local ignored environment records the owner-confirmed approval. This flag does not enable sending, jobs, or AI and does not bypass verification, suppression, reply checks, postal address, campaign approval, or limits. Restart the backend to load configuration changes. No prospect send is authorized by this setting.
