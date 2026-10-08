begin;

-- Authors may correct their notes; Keepers may edit or remove notes in their book.
-- The recipe, author, original date, and moderation state remain immutable.
create or replace function public.protect_recipe_story_metadata()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.recipe_id is distinct from old.recipe_id
    or new.author_id is distinct from old.author_id
    or new.author_display_name is distinct from old.author_display_name
    or new.created_at is distinct from old.created_at then
    raise exception 'note metadata cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_recipe_story_metadata() from public, anon, authenticated;
drop trigger if exists recipe_stories_protect_metadata on public.recipe_stories;
create trigger recipe_stories_protect_metadata before update on public.recipe_stories
  for each row execute function public.protect_recipe_story_metadata();

create policy "recipe_stories: update by author or keeper" on public.recipe_stories
  for update to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and not r.moderation_hidden
        and (public.can_manage_book(r.book_id, auth.uid())
          or (author_id = auth.uid() and public.is_book_member(r.book_id, auth.uid())))
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and not r.moderation_hidden
        and (public.can_manage_book(r.book_id, auth.uid())
          or (author_id = auth.uid() and public.is_book_member(r.book_id, auth.uid())))
    )
  );

drop policy if exists "recipe_stories: delete own" on public.recipe_stories;
create policy "recipe_stories: delete by author or keeper" on public.recipe_stories
  for delete to authenticated using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and not r.moderation_hidden
        and (public.can_manage_book(r.book_id, auth.uid())
          or (author_id = auth.uid() and public.is_book_member(r.book_id, auth.uid())))
    )
  );

commit;
