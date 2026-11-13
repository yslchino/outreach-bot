# Security and private data

## Reporting

Do not include credentials, recipient details, mailbox content, database exports, or raw environment files in public issues or pull requests. Use GitHub's private vulnerability reporting when available, or contact the maintainer through an established private channel.

Include the affected commit and reproduction steps using synthetic data. Do not test suspected issues against a live deployment without authorization.

## Repository boundaries

Application source and synthetic fixtures may be public. Keep these private:

- Provider keys, JWT secrets, OAuth tokens, webhook secrets, and encryption keys.
- Bootstrap passwords, account access files, and private certificates.
- Contact lists, real email bodies, attachments, and provider receipts.
- Database backups, migration reports, account IDs, and operational runbooks.

.env files, .local/, dependencies, uploads, logs, and build output are ignored. Ignore rules do not protect previously committed files. Inspect staged files before publishing.

## Exposure response

If a real credential was published, revoke or rotate it with its provider. Removing it in a new commit does not revoke it or remove historical copies. Review branches, tags, artifacts, and deployment logs. History rewriting and deleting hosted data require separate explicit approval and coordination.

Preserve authentication, approval gates, suppression, message receipts, and uncertain-send reconciliation when reporting or fixing an issue.
