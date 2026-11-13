# Resend receiving and delivery events

Generic setup and processing guidance. Keep actual mailboxes, DNS configuration, provider event IDs, test receipts, deployment URLs, and cutover evidence private.

## Setup

1. Configure a verified receiving domain using the records shown in the Resend account. Sending and receiving are separate capabilities.
2. Set REPLY_PROVIDER=resend and RESEND_RECEIVING_ADDRESS in private server configuration.
3. Register https://YOUR-APP/api/webhooks/resend. Subscribe to email.received, email.sent, email.delivered, email.bounced, and email.complained.
4. Store RESEND_API_KEY and RESEND_WEBHOOK_SECRET privately, with the permissions needed to retrieve incoming and sent messages.
5. Set EMAIL_REPLY_TO to the receiving address. Activate RESEND_RECEIVING_ENABLED when verification, signing credentials, and routing are ready.
6. Verify fresh delivery, body retrieval, exact-reference campaign matching, opt-outs, and duplicate replay with controlled records. Each outbound test needs audience-specific authorization.

Receiving does not enable sending, background jobs, or AI. Keep those disabled during setup.

## Workspace

**Inbox** in the main navigation shows stored incoming messages, processing results, timestamps, and plain text. Refresh replies retrieves records; it does not send email. Receiving configuration stays in Settings with an Open inbox shortcut.

## Processing

- Verify webhook signatures against the raw request body before processing.
- Retrieve message bodies and headers on the server; metadata alone is incomplete.
- Match campaign replies using the exact sender and an exact In-Reply-To or References match to a verified message ID. Never rely on the subject alone.
- Retain unmatched threads for review without changing unrelated contacts.
- Stop pending follow-ups on matched replies. Detected opt-outs also suppress the address.
- Require review for HTML-only messages; the inbox does not render untrusted email HTML.
- Persist delivery outcomes and suppress bounced or complained-about addresses.
- Do not reapply duplicate received events. Keep transient retrieval failures retryable.

## Development callbacks

The optional server/scripts/webhookRelay.js exposes only the signed webhook route on a loopback port. A temporary tunnel must not expose the dashboard or API. Retire temporary routing after permanent receiving is verified.

Do not publish live tunnel hostnames or signing secrets. Never kill a process based only on a stale PID file.

## Validation

Tests cover signing, matching, suppression, duplicates, and retry handling with synthetic records. They do not prove live provider availability. Retain live evidence privately and verify receiving after integration changes.

SMTP acceptance is not delivery; SMTP delivery outcomes need provider-specific receipts.
