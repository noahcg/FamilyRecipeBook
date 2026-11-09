# Supabase maintenance plan

Status: proposed. A daily database backup freshness workflow has been prepared locally but is not active until deployed and configured. No alerts, photo backups, or other schedules have been activated by this document.

On November 9, 2026, a read-only inspection reported the production project as healthy, an 18 MB database, completed daily database backups including November 9, and PITR disabled. Backup listings do not prove restorability. Older local archives exist, but do not establish a current recurring Storage backup.

## Schedule

| Frequency | Work | Failure response |
| --- | --- | --- |
| Daily | Supabase Pro takes its managed database backup. Check the latest completed backup or, if enabled, the PITR recovery window, and report failures or unexpected gaps. | Alert the owner; do not restore automatically. |
| Daily | Check database availability, resource usage, storage capacity, and available provider alerts. | Alert on outages or sustained resource pressure; do not resize automatically. |
| Daily | Back up Storage objects to an independently protected destination, retaining historical versions and recording success and integrity evidence. | Alert on failed, incomplete, or stale backups; never propagate source deletions immediately. |
| Weekly | Review security and performance advisor findings and significant database errors. | Report actionable changes without including private recipes, credentials, or tokens. |
| Monthly | Review capacity trends, project access, backup retention, notification delivery, and recovery readiness. | Report gaps to the owner. |
| Quarterly | Rehearse database and object recovery in an isolated environment, and verify representative synthetic data and permissions. | Report failures; never restore over production. |
| Before database changes | Verify backup freshness, review migration history, and test the proposed change in staging. | Stop the release if the checks fail. |

## Activation prerequisites

- Obtain explicit approval for the scope and risk of read-only production inspection; the launch runbook requires approval even for inspection. Identify the exact production project without printing credentials. Approval for the November 9 inspection was provided; future inspection scope remains subject to applicable instructions.
- Confirm the actual backup mode and latest successful recovery point. Pro normally retains seven days of daily backups; PITR uses a different recovery window and is a paid add-on.
- Select a reliable scheduler and an alert destination; verify both successful delivery and failure reporting, including missed runs and expired credentials. A schedule alone is not monitoring.
- Select an encrypted, access-restricted, independently protected destination for Storage object backups. Agree retention, cost, restore procedure, and how deletions are handled. Storage object backups contain private user files and require explicit authorization for their destination and access.
- Provision an isolated staging or restore environment and verify that outbound email, billing, webhooks, and other side effects are disabled. The existing launch runbook says staging was not provisioned when it was written; verify its current status.
- Use the least-privileged available credentials and store them in the scheduler's secret store. Record ownership and rotation procedures. Never place credentials or user data in workflow logs.
- Reconcile the migration history before enabling ordinary migration pushes; see `docs/migration-history.md`.

## Operating boundaries

Checks must fail visibly if a provider response is unavailable, an API changes, credentials expire, a scheduled run is missed, or a backup is too old. Backup listings do not establish restorability. Escalate issues for review rather than applying schema changes, deleting files, restoring production, increasing paid services, changing security controls, or running disruptive maintenance automatically.

## Prepared database backup check

`.github/workflows/supabase-backup-check.yml` runs at 14:30 UTC daily and can be run manually. It requires repository variable `SUPABASE_PROJECT_REF` and secret `SUPABASE_MONITORING_ACCESS_TOKEN`; provision these only after reviewing the token's effective scope and authorizing its use in GitHub. The check fails if the newest completed backup is more than 36 hours old, the API is unavailable or unexpected, or PITR is enabled or its status is unknown. It only retrieves backup metadata and does not access content.

The workflow must be present on the default branch to run on schedule. Confirm GitHub Actions is enabled, failure notifications reach the owner, and a successful manual run is visible. Add an independent missed-run monitor: a GitHub Actions failure notification cannot report a run that never started. GitHub scheduled runs can be delayed and may be disabled in inactive repositories; this is not a continuous availability monitor. This workflow does not back up photos, verify restore capability, check database resource usage, or activate provider alerts.

Follow `LAUNCH_RUNBOOK.md` for the detailed restore rehearsal and production approval requirements. Decide recovery objectives and alert thresholds after inspecting the actual environment; do not assume this plan verifies current protection.
