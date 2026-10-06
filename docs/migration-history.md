# Migration history reconciliation

## Production signup conversion migration (2026-10-05)

`037_signup_conversion_tracking.sql` was applied to the existing production
project as `20261005220000_signup_conversion_tracking.sql` from an isolated
migration directory. Source SHA-256:
`9260637f39ce43c48cc47108431a670bb90afe2b4ecdfc3e395581d9fb6bffda`.
The isolated dry run listed this file alone. The original `037` filename remains
in this repository for fresh projects; do not replay it on production. Reconcile
the remaining older migration filenames before using this repository directory
for a production `supabase db push`.

Committed migrations include two distinct 026 files and two distinct 027 files.
The Supabase CLI identifies migrations by numeric version, so these cannot be
safely pushed as a normal migration directory. Preserve the original files:
renaming them in place can replay SQL against an already migrated environment.

## New empty staging project

Run `npm run migrations:prepare` to create a unique temporary output directory,
or `npm run migrations:prepare -- /private/tmp/homecooked-migrations` with an
empty explicit output directory. This generates a complete, uniquely versioned copy
in the original lexical execution order and a source-to-version manifest with SHA-256 checksums. Copy
the SQL files into an isolated Supabase CLI project's migration directory,
then apply only to a new empty staging database. Keep the manifest with the
release evidence. Never use this baseline directory on an existing project.
The fullSchema test executes every original SQL file in the same order.

## Existing staging or production project

Before any write, export the Supabase migration history (versions, names and
statements), take a recoverable database backup, and compare actual schema
objects with BOTH files at each duplicate version. A recorded version 026 or
027 alone does not establish which file ran. Check tables/functions/policies
and column definitions, not only table names. Preserve that inspection and
original SQL checksums with the release evidence.

For each missing original file, have the operator apply its reviewed SQL once
under a new unique timestamp version through an isolated migration directory.
Already applied originals must be recorded as applied using Supabase migration
repair only after their exact schema effects are confirmed; do not execute them
again. Keep a manifest mapping each original filename to its reconciled version
and applied status. Reconcile all original migrations, including the new
hardening migrations, before enabling normal CLI pushes. First rehearse this
procedure on a restored staging copy; confirm schema and policy tests there.

There is deliberately no automated repair against an existing project: local
filenames cannot determine remote history, and applying or marking ambiguous
migrations without inspection risks losing privacy protections. Production
inspection and mutation require the explicit approval in AGENTS.md.
