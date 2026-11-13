# Optional Outlook replies

Deployments can use Microsoft Graph for the optional Outlook reply connection instead of direct Resend receiving. Neither mode enables campaign sending.

## Setup

1. Register an application whose account types include the intended mailbox.
2. Register the API callback. Local development uses http://127.0.0.1:5000/api/outlook/callback; hosted environments need their corresponding HTTPS callback.
3. Configure delegated User.Read and Mail.Read permissions. The flow also requests offline_access. No mail-send, mail-write, or deletion permission is requested.
4. Privately set OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, OUTLOOK_REDIRECT_URI, OUTLOOK_EXPECTED_EMAIL, and a separate random OUTLOOK_TOKEN_KEY.
5. Select REPLY_PROVIDER=outlook and disable Resend receiving when switching away from it.
6. An administrator connects the mailbox from Settings. Verify the returned mailbox identity before accepting the connection.

Tokens are encrypted at rest. Keep the separate encryption key in private recovery storage; changing it requires reconnecting the mailbox. Authorization is browser-bound, one-time, and protected with PKCE.

Never commit mailbox addresses, application/account identifiers, tokens, consent screenshots, or live test evidence.

## Delivery events and validation

Resend sending can still use signed delivery events independently of the Outlook connection. See [Resend handling](resend-receiving.md).

Tests use mocked Microsoft responses and an isolated local database. Live consent, permissions, reply matching, and opt-outs require separate verification with approved test records.
