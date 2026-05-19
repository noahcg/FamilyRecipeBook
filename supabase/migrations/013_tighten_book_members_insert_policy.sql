-- Remove the self-insert clause from book_members insert policy.
--
-- The previous policy allowed any authenticated user to insert a row where
-- user_id = auth.uid(), which let them grant themselves any role (including
-- 'keeper') in any book whose UUID they knew. Legitimate paths do not need
-- this clause:
--   - Book creation: handle_new_recipe_book() trigger is security definer.
--   - Invite acceptance: members.ts uses the service-role client.

drop policy if exists "book_members: insert if keeper" on public.book_members;

create policy "book_members: insert if keeper" on public.book_members
  for insert with check (public.can_manage_book(book_id, auth.uid()));
