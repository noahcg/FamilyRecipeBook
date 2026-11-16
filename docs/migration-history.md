# Migration history reconciliation

## Production collection chapter preview migration (2026-11-13)

`051_official_collection_chapters.sql` was applied to the existing `FamilyRecipe`
production project (`wcoubzejnqnknvgdyjui`) through the Supabase Management API
as `20261113185839_homecooked_051_official_collection_chapters`. Source SHA-256:
`c1662042cffb0d2fefc4a30f339d49258f3cf920191927f06e074dffdc410796`.

Only this reviewed file was applied. It adds the public chapter-name/count RPC
for published collections without changing cookbook or recipe records. Preflight
verified migration `050`, absence of the new function, and completed managed
physical backup `2253368305` (`2026-11-13T09:03:47.795Z`). No full user-data export
was made. Post-application checks confirmed anonymous/authenticated chapter
preview privileges, continued anonymous recipe-content denial, and unchanged
pre-existing function definitions, public/Storage policies, and triggers.

Keep the original `051` file for new projects; do not replay it on this production
project. Older history mismatches remain unresolved, so repository-wide
`supabase db push` is still prohibited against production.

## Production official collections migration (2026-11-13)

`050_official_collections.sql` was applied to the existing `FamilyRecipe`
production project (`wcoubzejnqnknvgdyjui`) through the Supabase Management API
as `20261113182858_homecooked_050_official_collections`. Source SHA-256:
`ad02388148fb8b3ce23db14ac79325f18419fb4e0178a12854a31bcce7ff7efe`.

Only this reviewed file was applied. Preflight verified its schema dependencies
and exported the existing migration history and schema definitions to private
local evidence files. The recovery point is Supabase's completed managed physical
backup `2253368305`, created at `2026-11-13T09:03:47.795Z`. No full local user-data
export was made. Verification confirmed both collection tables have RLS enabled,
all five source guards exist, and publication/content function privileges match
the intended access model. All pre-existing public functions, public/Storage
policies, and public triggers remained intact. Both new tables were empty after
application: the migration did not designate or publish any cookbook.

The application deployment and explicit publication of a cookbook remain separate
steps. Keep the original `050` file for new projects; do not replay it on this
production project. No older migration-history entries were repaired or replayed;
the history mismatches documented below still prohibit a normal repository-wide
`supabase db push` against production.

## Production recipe note management migration (2026-10-08)

`039_recipe_note_management.sql` was applied to the existing production project
as `20261008190000_recipe_note_management.sql` from an isolated migration
directory. Source SHA-256:
`dcd80e2c736dbc6e1e5bbadf1436d2a9b91a8b59e127d221e965fb9b93753f41`.
The isolated dry run listed this file alone. The original `039` filename remains
in this repository for fresh projects; do not replay it on production. The
live schema dump after application confirmed the new update/delete policies and
metadata trigger, and the old delete-own policy was absent. A pre-migration
logical database backup is stored outside the repository in `private-backups`.
The other migration-history mismatches below remain unresolved, so do not run
`supabase db push` from this repository directory against production.

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
