# Original recipe privacy checks

Run against an isolated local/staging Supabase project after migration 024;
never create/delete these test fixtures in production. Use actual authenticated
Storage API sessions, since SQL-only object inserts do not test bucket limits.

Create cookbook A and B, a Keeper and Contributor in A, a Family member in A,
and an unrelated Keeper in B. Create a recipe in A owned by the Contributor.
Upload a PDF under `<recipe UUID>/<new UUID>_original.pdf` using its author.

- Keeper in A: list/download/sign/upload/delete succeed for the recipe.
- Owning Contributor: list/download/sign/upload/delete succeed.
- Different Contributor in A: list/download/sign succeed; upload/delete fail.
- Family (including a demoted creator): list/download/sign succeed;
  upload/delete fail.
- Unauthenticated and cookbook B sessions: list returns no objects;
  download/sign/upload/delete cannot access the original from A.
- Direct Storage uploads: PDF/JPEG/PNG/WebP up to 20 MiB accepted; SVG and
  oversized uploads rejected by bucket constraints. Overwrite/upsert fails.
- Move recipe A to B with the authorized move action: B members can read it;
  A-only members cannot obtain a new download URL. Previously signed download
  URLs may remain usable for their five-minute lifetime.
- Copy recipe A to B: destination receives a separate file; removing the
  destination file does not remove source. Users without source membership
  or target editing permission cannot invoke the copy helper successfully.
- Delete a recipe directly; repeat via deleting its cookbook and via creator
  account cascade. In each case retain its UUID and an original path. As a
  Keeper of B, attempt INSERT into recipes with that UUID and your own
  cookbook/creator IDs: it must fail `23505 Recipe ID has already been used`.
  The orphaned path must remain unreadable to every client session.
- Attempt UPDATE of a recipe's id to a deleted UUID and to a fresh UUID:
  both must fail `23514 Recipe IDs cannot be changed`.
- SELECT/INSERT/UPDATE/DELETE on recipe_id_reservations and direct execution
  of reserve_recipe_id must be inaccessible to anon/authenticated roles.
- In two database sessions, concurrently delete a recipe and insert its ID
  into another cookbook: insertion must fail, even after deletion commits.
- Create a fresh recipe normally and confirm ingredient/instruction writes,
  cookbook moves, and recipe deletion still work.

The local Node tests cover server-action authorization with mocked clients;
these live checks are required to verify deployed RLS and Storage behavior.
Physical orphan cleanup is a separate Storage API maintenance task. Never
remove reservations or delete storage.objects rows directly.
