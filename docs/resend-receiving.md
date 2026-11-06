# Resend reply handling

Resend is the selected receiving provider for GET Logistics. Replies will use `replies@outreach.getlogistics.llc` and appear under **Settings → Resend reply inbox**, with a matched reply preview in lead details. Outlook forwarding is off. Microsoft application registration is not required for this mode; the optional Outlook implementation is retained separately.

## Current setup

- Sending domain: `outreach.getlogistics.llc`.
- Receiving capability has been enabled in Resend. Receiving DNS verification is pending.
- Local configuration selects `REPLY_PROVIDER=resend` and sets `RESEND_RECEIVING_ADDRESS=replies@outreach.getlogistics.llc`.
- `RESEND_RECEIVING_ENABLED=false`, `SENDING_ENABLED=false`, and `JOBS_ENABLED=false` remain in place. The existing `EMAIL_REPLY_TO` remains Outlook until receiving is verified and connected.
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
6. Test with an explicitly approved internal recipient: a new plain-text reply, a later opt-out, an unmatched new thread, and a replayed webhook event. Isolated inbox-test emails sent outside campaigns cannot prove campaign matching; use synthetic staged campaign records for the full test.

When receiving mode is selected, startup refuses to enable campaign sending without activated receiving, its configured reply address, and the webhook signing secret. These configuration checks are not a substitute for a successful live end-to-end test. Existing recipient eligibility and postal-address checks also remain in effect.

## Processing behavior

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

Receiving counts toward the account's email quota. Hosting a continuously available webhook is separate from Resend's plan. Live receiving remains unverified until the MX record and public endpoint are connected.

References: [Receiving email](https://resend.com/docs/dashboard/receiving/introduction), [retrieving content](https://resend.com/docs/dashboard/receiving/get-email-content), [reply threading](https://resend.com/docs/dashboard/receiving/reply-to-emails).
