# Outlook replies and Resend delivery events

These connections do not enable sending. Keep `SENDING_ENABLED=false` and `JOBS_ENABLED=false` during setup. The existing ten-message pilot stays in draft.

## Microsoft account setup

1. In Microsoft Entra **App registrations**, register **GET Logistics reply inbox**. Its supported account types must include personal Microsoft accounts, because the reply inbox uses Outlook.com.
2. Add a **Web** redirect URI: `http://127.0.0.1:5000/api/outlook/callback`. Use this exact host consistently for the local API and browser; for staging/production, register the corresponding HTTPS callback instead.
3. Configure delegated Microsoft Graph permissions `User.Read` and `Mail.Read`. The authorization request also asks for `offline_access`. No mail-send, mail-write, or deletion permission is requested.
4. Create an application client secret. In the ignored local `.env`, fill `OUTLOOK_CLIENT_ID` and `OUTLOOK_CLIENT_SECRET`. Copy the secret **value**, not its ID. Never paste it into chat or frontend configuration.
5. Set `REPLY_PROVIDER=outlook`, `OUTLOOK_EXPECTED_EMAIL=getlogisticsllc@outlook.com`, and `OUTLOOK_REDIRECT_URI` to the registered callback. Set `RESEND_RECEIVING_ENABLED=false` when switching away from Resend receiving. A separate random `OUTLOOK_TOKEN_KEY` has been prepared locally. Keep that key private and backed up with other secrets; replacing it requires reconnecting the mailbox.
6. Restart the local API and open **Settings → Outlook reply inbox → Connect Outlook** as an administrator. Sign in to the expected mailbox. If that address is an alias and Microsoft returns a different primary address, explicitly configure `OUTLOOK_EXPECTED_EMAIL` to that primary address after verifying it belongs to the same intended mailbox.
7. Run **Scan replies** for one manual check. Scheduled checks run every five minutes only when `JOBS_ENABLED=true`; do not enable jobs during this setup, since that switch also starts the outbound worker.

The connection uses PKCE, a short-lived browser-bound state value, single-use authorization attempts, and a current administrator/session check. Refresh tokens and PKCE verifiers are encrypted with AES-256-GCM on the server. Access tokens are held in memory and never sent to the dashboard. Refresh-token rotation uses a database lease. Disconnect removes stored authorization and pending connection attempts; access can also be revoked in the Microsoft account's application permissions.

## Reply and unsubscribe behavior

- Resend replaces a supplied outbound Message-ID. Its signed `email.sent` webhook records the actual `message_id`; the scanner can retrieve it from Resend if a webhook has not arrived. Lookup failure stops matching for that contact instead of guessing from the subject.
- The Outlook scan requires both an exact known Message-ID reference and the expected sender. It scans the mailbox across folders, including archived messages, rather than only Inbox.
- A scan rotates through up to 50 sent contacts and reads at most 500 matching-sender messages per contact. Scans overlap their time windows by five minutes and preserve the start time as the checkpoint. A pagination-limit failure is reported, not presented as a successful complete scan.
- Matched replies mark contacts as replied and skip pending messages. A short subject/body preview is shown in lead details. Contacts with an earlier reply continue to be scanned so a later opt-out is processed.
- Clear standalone requests such as `unsubscribe`, `unsubscribe me`, `please remove me from your list`, `stop emailing me`, and `do not contact me` are recognized. Quoted content is excluded, and the original email footer is not treated as the recipient's request. Ambiguous wording, separate new threads without references, and other removal requests need manual review through **Suppress address**. This is deliberately a narrow parser, not a complete natural-language classifier.
- Opt-outs create a permanent normalized-address suppression and skip pending messages across campaigns. Disconnecting Outlook stops automatic reply/opt-out detection; the sender should not rely on automatic follow-ups while the inbox is disconnected or scans are failing.

## Resend webhook setup

The local route is `POST /api/webhooks/resend`. Resend needs a publicly reachable HTTPS URL for live events; `127.0.0.1` is not reachable from Resend. Prepare a separate staging service or a controlled HTTPS development tunnel before registering the endpoint. Publishing a service/tunnel is a separate operational step.

1. In Resend **Webhooks**, register `https://YOUR-API-HOST/api/webhooks/resend`.
2. Subscribe to `email.sent`, `email.delivered`, `email.bounced`, and `email.complained`.
3. Save the signing secret as `RESEND_WEBHOOK_SECRET` in that server's private environment and restart it. The Resend API key also needs to be present.
4. Verify signed sample events in staging. Invalid signatures and malformed supported events are rejected. Duplicate suppression writes are idempotent; late delivery/bounce events cannot downgrade a complaint.
5. A bounce or complaint suppresses the address and cancels pending messages. An event that races the save of an app-tagged message returns a retryable response; unrelated account emails, including isolated inbox tests, are ignored.

Successful inbox tests sent outside campaigns are recorded under ignored `.local/` and are not campaign messages. They do not exercise campaign reply matching by themselves. Use controlled test recipients in staging for a full send → reply → opt-out exercise before enabling the pilot.

## Checks

`npm test`, `npm run test:integration`, `npm --prefix client run lint`, and `npm run build` cover local behavior with synthetic contacts and mocked providers. The integration suite needs the local MongoDB instance started by `npm run local:up`. No Microsoft credentials or live email providers are used by these tests.

Live Microsoft consent/Graph access and live webhook delivery remain unverified until the account and public endpoint are configured. Recipient eligibility rules, the postal-address requirement, and campaign approval still apply; this feature does not enable or approve the pilot.

References: [Microsoft authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow), [Microsoft Graph list messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages), [Resend Message-ID support](https://resend.com/changelog/message-id-for-sent-emails).
