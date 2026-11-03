begin;

alter table public.recipe_books add column share_card_custom_path text;
alter table public.recipe_books add constraint share_card_one_photo
  check (share_card_recipe_id is null or share_card_custom_path is null);

-- A custom card may reference only a real upload belonging to the keeper.
create function public.check_custom_share_card() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.share_card_custom_path is null or
     (tg_op = 'UPDATE' and new.share_card_custom_path is not distinct from old.share_card_custom_path) then
    return new;
  end if;
  if new.share_card_custom_path !~ '^[0-9a-f-]{36}/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$' or
     (auth.role() is distinct from 'service_role' and (auth.uid() is null or split_part(new.share_card_custom_path, '/', 1) <> auth.uid()::text or not public.can_manage_book(new.id, auth.uid()))) then
    raise exception 'You cannot use this private image' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('recipe-images/' || new.share_card_custom_path, 0));
  if not exists (select 1 from storage.objects where bucket_id = 'recipe-images' and name = new.share_card_custom_path) then
    raise exception 'Image is unavailable' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.check_custom_share_card() from public, anon, authenticated;
create trigger check_custom_share_card before insert or update of share_card_custom_path on public.recipe_books
  for each row execute function public.check_custom_share_card();

-- Keepers can preview the selected upload even after cookbook ownership changes.
create policy "share card: keeper read" on storage.objects for select to authenticated
  using (bucket_id = 'recipe-images' and exists (
    select 1 from public.recipe_books b where b.share_card_custom_path = name and public.can_manage_book(b.id, auth.uid())
  ));

-- The existing locked deletion trigger calls this function before deleting.
create or replace function public.private_media_is_unreferenced(bucket text, object_path text)
returns boolean language sql stable security definer set search_path = public as $$
 select case bucket
 when 'recipe-images' then not exists(select 1 from public.recipes r where right(r.photo_url,length('/storage/v1/object/public/recipe-images/' || object_path))='/storage/v1/object/public/recipe-images/' || object_path)
   and not exists(select 1 from public.recipe_books b where b.share_card_custom_path = object_path)
 when 'book-covers' then not exists(select 1 from public.recipe_books b where right(b.cover_image_url,length('/storage/v1/object/public/book-covers/' || object_path))='/storage/v1/object/public/book-covers/' || object_path)
 when 'avatars' then true else false end
$$;
commit;
