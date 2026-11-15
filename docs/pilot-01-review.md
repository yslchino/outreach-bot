# Pilot review template

Complete batch-specific reviews privately. Do not commit recipient names, email addresses, spreadsheet exports, actual email bodies, internal account IDs, or provider receipts to this repository.

## Audience and copy

- Record the intended audience and exact recipient count privately.
- Confirm recipient identity, company, address, and business relevance.
- Preserve permission classifications; verification does not imply opt-in.
- Recheck reply and suppression state before approval.
- Review all saved subjects and bodies, personalized names, and factual claims.
- Inspect formatted and plain-text previews, sender, reply-to, current postal address, and opt-out instructions.

Public examples should use synthetic records, such as Test Contact at Example Manufacturing, contact@example.invalid.

## Operational readiness

- Verify receiving, content retrieval, exact-reference matching, opt-outs, and duplicate-event handling.
- Verify a completed current backup and a restore procedure.
- Confirm provider permission for the audience and the configured send limits.
- Record explicit approval identifying the batch before queuing it. Approve selected drafts starts with the current draft checked; only checked saved drafts enter the queue. Other messages remain unapproved. Select 1, Select 5, and Select 10 are selection shortcuts for the first available drafts in review order, not send actions; unavailable sizes are disabled.
- Failed or uncertain sends pause the campaign. Worker recovery also pauses interrupted attempts; recent bounce/complaint events hold the campaign before its next send. Review the reason, reconcile uncertain/processing records, and explicitly confirm resume. Failed messages are not retried.
- A campaign send claim serializes worker ticks across processes. Pause cannot recall a provider request already in flight.
- Review initial outcomes and replies before approving another batch.

Code deployment and draft review do not authorize sending. Keep sending, jobs, and AI disabled until separately authorized. Preserve uncertain-send records; do not clear history to force retries.
