# Moderation playbook (internal draft)

This is an operational placeholder, not legal advice or a substitute for an approved incident runbook.

1. Triage only the case metadata. A case is not permission to browse a family, account, cookbook, storage bucket, or original file.
2. Prefer the narrowest reversible response. Hide pending review before a permanent content decision; restore when no violation is found.
3. Record a reason and internal note for every action. Never put raw private content, URLs, email addresses, or reporter identity in notes.
4. Preserve shared cookbooks and prior contributions. Content moderation must never invoke account deletion or ownership transfer.
5. For appeals, reopen the case, record the appeal event, and restore only if the decision is reversed.
6. `critical_sensitive` cases are locked: do not preview, download, copy, email, or attach media. Escalate only through the approved counsel/provider procedure.

## Production gate

- Privacy counsel: retention, access roles, reporter handling, appeals, and jurisdiction-specific requirements.
- Counsel: copyright notice-and-takedown process and repeat-abuse policy.
- Hosting/provider: abuse-response and critical-content escalation contacts/runbook.
- Security: validate logging redaction, service-role confinement, storage access, and no third-party scanning without written approval and disclosure.
- Product: approve the prohibited-content, reporting, repeat-abuse, and appeals policy text before publishing it as Terms or Privacy Policy.
