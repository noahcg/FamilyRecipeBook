-- Original recipe scans/documents are private. The recipe ID, rather than
-- cookbook ID or uploader, is the first path segment so moves retain files
-- while access immediately follows the recipe's current cookbook membership.
begin;

-- Keep recipe creation/deletion from racing the ID registry seed and triggers.
lock table public.recipes in share row exclusive mode;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-originals', 'recipe-originals', false, 20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "recipe-originals: members read" on storage.objects
for select to authenticated using (
  bucket_id = 'recipe-originals'
  and exists (
    select 1 from public.recipes r
    where r.id::text = (storage.foldername(name))[1]
      and public.is_book_member(r.book_id, auth.uid())
  )
);

create policy "recipe-originals: editors upload" on storage.objects
for insert to authenticated with check (
  bucket_id = 'recipe-originals'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}_[a-zA-Z0-9 _-]+\.(jpg|png|webp|pdf)$'
  and exists (
    select 1 from public.recipes r
    where r.id::text = (storage.foldername(name))[1]
      and (
        public.can_manage_book(r.book_id, auth.uid())
        or (r.created_by = auth.uid() and public.can_contribute_to_book(r.book_id, auth.uid()))
      )
  )
);

create policy "recipe-originals: editors delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'recipe-originals'
  and exists (
    select 1 from public.recipes r
    where r.id::text = (storage.foldername(name))[1]
      and (
        public.can_manage_book(r.book_id, auth.uid())
        or (r.created_by = auth.uid() and public.can_contribute_to_book(r.book_id, auth.uid()))
      )
  )
);
-- No UPDATE policy: originals cannot be overwritten or moved between recipes.
-- Deleting a recipe revokes access to remaining objects; physical cleanup must
-- use the Storage API (never delete storage.objects rows directly).

-- Storage files outlive recipe rows until removed through the Storage API.
-- Reserve recipe IDs permanently so recreating a deleted UUID can never make
-- an orphaned original visible to a different cookbook. The unique INSERT is
-- also safe against concurrent deletion/recreation (a check-only tombstone
-- guard would race). This applies to direct inserts and every deletion path,
-- including cookbook/account cascades. Recipe IDs are immutable.
create table public.recipe_id_reservations (
  recipe_id uuid primary key
);
alter table public.recipe_id_reservations enable row level security;
revoke all on public.recipe_id_reservations from public, anon, authenticated;

insert into public.recipe_id_reservations (recipe_id)
select id from public.recipes;

create function public.reserve_recipe_id()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id then
      raise exception 'Recipe IDs cannot be changed' using errcode = '23514';
    end if;
    return new;
  end if;

  insert into public.recipe_id_reservations (recipe_id) values (new.id)
  on conflict (recipe_id) do nothing;
  if not found then
    raise exception 'Recipe ID has already been used' using errcode = '23505';
  end if;
  return new;
end;
$$;
revoke all on function public.reserve_recipe_id() from public, anon, authenticated;

create trigger reserve_recipe_id_before_insert
before insert on public.recipes
for each row execute function public.reserve_recipe_id();

create trigger preserve_recipe_id_before_update
before update of id on public.recipes
for each row execute function public.reserve_recipe_id();

commit;
