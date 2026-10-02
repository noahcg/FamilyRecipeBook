-- Deploy app media route and this migration together. Preserve stored URLs as
-- identifiers; public Storage endpoints no longer serve private family bytes.
-- Roll forward preferred. Reopening buckets would reintroduce public access.
begin;
update storage.buckets set public = false, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id in ('recipe-images','book-covers','avatars');

drop policy if exists "recipe-images: public read" on storage.objects;
drop policy if exists "book-covers: public read" on storage.objects;
drop policy if exists "avatars: public read" on storage.objects;
drop policy if exists "recipe-images: unrestricted authenticated upload" on storage.objects;
drop policy if exists "recipe-images: authenticated upload" on storage.objects;
drop policy if exists "book-covers: authenticated upload" on storage.objects;
drop policy if exists "avatars: own upload" on storage.objects;
drop policy if exists "recipe-images: owner delete" on storage.objects;
drop policy if exists "book-covers: owner delete" on storage.objects;
drop policy if exists "avatars: own delete" on storage.objects;

-- The caller cannot pass a different user. Referenced photos require membership
-- even for their original uploader; only unreferenced drafts allow owner preview.
create or replace function public.can_read_private_media(bucket text, object_path text)
returns boolean language sql stable security definer set search_path = public as $$
 select auth.uid() is not null and case bucket
 when 'recipe-images' then
   exists (select 1 from public.recipes r where right(r.photo_url, length('/storage/v1/object/public/recipe-images/' || object_path)) = '/storage/v1/object/public/recipe-images/' || object_path
     and not r.moderation_hidden and public.is_book_member(r.book_id, auth.uid()))
   or (split_part(object_path,'/',1) = auth.uid()::text and not exists
     (select 1 from public.recipes r where right(r.photo_url, length('/storage/v1/object/public/recipe-images/' || object_path)) = '/storage/v1/object/public/recipe-images/' || object_path))
 when 'book-covers' then
   exists (select 1 from public.recipe_books b where right(b.cover_image_url,length('/storage/v1/object/public/book-covers/' || object_path)) = '/storage/v1/object/public/book-covers/' || object_path and public.is_book_member(b.id,auth.uid()))
   or (split_part(object_path,'/',1) = auth.uid()::text and not exists
     (select 1 from public.recipe_books b where right(b.cover_image_url,length('/storage/v1/object/public/book-covers/' || object_path)) = '/storage/v1/object/public/book-covers/' || object_path))
 when 'avatars' then
   exists (select 1 from public.profiles p where right(p.avatar_url,length('/storage/v1/object/public/avatars/' || object_path)) = '/storage/v1/object/public/avatars/' || object_path and
     (p.id = auth.uid() or exists(select 1 from public.book_members a join public.book_members b on a.book_id=b.book_id where a.user_id=auth.uid() and b.user_id=p.id)
      or exists(select 1 from public.household_members a join public.household_members b on a.household_id=b.household_id where a.user_id=auth.uid() and b.user_id=p.id)))
   or split_part(object_path,'/',1) = auth.uid()::text
 else false end
$$;
revoke all on function public.can_read_private_media(text,text) from public, anon;
grant execute on function public.can_read_private_media(text,text) to authenticated, service_role;
create policy "private media: member read" on storage.objects for select to authenticated
 using (bucket_id in ('recipe-images','book-covers','avatars') and public.can_read_private_media(bucket_id,name));
create policy "private media: own upload" on storage.objects for insert to authenticated
 with check (bucket_id in ('recipe-images','book-covers','avatars') and split_part(name,'/',1)=auth.uid()::text
   and name ~ '^[0-9a-f-]{36}/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$' and public.account_can_upload(auth.uid()));
create policy "avatars: own replace" on storage.objects for update to authenticated
 using (bucket_id='avatars' and split_part(name,'/',1)=auth.uid()::text)
 with check (bucket_id='avatars' and split_part(name,'/',1)=auth.uid()::text and name ~ '^[0-9a-f-]{36}/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$' and public.account_can_upload(auth.uid()));
-- Run reference checks outside caller RLS so an uploader cannot delete an
-- image retained by a cookbook they have since left or by a copied recipe.
create or replace function public.private_media_is_unreferenced(bucket text, object_path text)
returns boolean language sql stable security definer set search_path = public as $$
 select case bucket
 when 'recipe-images' then not exists(select 1 from public.recipes r where right(r.photo_url,length('/storage/v1/object/public/recipe-images/' || object_path))='/storage/v1/object/public/recipe-images/' || object_path)
 when 'book-covers' then not exists(select 1 from public.recipe_books b where right(b.cover_image_url,length('/storage/v1/object/public/book-covers/' || object_path))='/storage/v1/object/public/book-covers/' || object_path)
 when 'avatars' then true else false end
$$;
revoke all on function public.private_media_is_unreferenced(text,text) from public, anon;
grant execute on function public.private_media_is_unreferenced(text,text) to authenticated, service_role;
create policy "private media: unreferenced owner delete" on storage.objects for delete to authenticated
 using (bucket_id in ('recipe-images','book-covers','avatars') and split_part(name,'/',1)=auth.uid()::text
   and public.private_media_is_unreferenced(bucket_id,name));

-- Prevent a guessed private object URL from being attached to one's own recipe
-- to manufacture access. Existing values are preserved; intentional public
-- shares and currently readable recipe copies can be saved into another book.
create or replace function public.check_private_media_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
declare media_url text; old_url text; bucket text; object_path text;
begin
 if auth.role() = 'service_role' then return new; end if;
 if tg_table_name='recipes' then
   media_url := new.photo_url; if tg_op='UPDATE' then old_url := old.photo_url; end if;
 elsif tg_table_name='recipe_books' then
   media_url := new.cover_image_url; if tg_op='UPDATE' then old_url := old.cover_image_url; end if;
 else
   media_url := new.avatar_url; if tg_op='UPDATE' then old_url := old.avatar_url; end if;
 end if;
 if media_url is null or media_url is not distinct from old_url then return new; end if;
 bucket := substring(media_url from '/storage/v1/object/public/(recipe-images|book-covers|avatars)/');
 if bucket is null then return new; end if;
 object_path := split_part(media_url,'/storage/v1/object/public/' || bucket || '/',2);
 if bucket = 'recipe-images' and tg_table_name <> 'recipes' or bucket='book-covers' and tg_table_name <> 'recipe_books' or bucket='avatars' and tg_table_name <> 'profiles' then
   raise exception 'Invalid image bucket' using errcode='42501';
 end if;
 -- Serialize references with deletion, including copies in other cookbooks.
 perform pg_advisory_xact_lock(hashtextextended(bucket || '/' || object_path, 0));
 if auth.uid() is null or not exists(select 1 from storage.objects where bucket_id=bucket and name=object_path) then
   raise exception 'Image is unavailable' using errcode='42501';
 end if;
 if public.can_read_private_media(bucket,object_path) then return new; end if;
 if bucket='recipe-images' and exists(select 1 from public.recipes r join public.recipe_public_shares s on s.recipe_id=r.id where r.photo_url=media_url and not r.moderation_hidden) then return new; end if;
 raise exception 'You cannot use this private image' using errcode='42501';
end $$;
revoke all on function public.check_private_media_assignment() from public, anon, authenticated;
create trigger recipes_check_private_media before insert or update on public.recipes for each row execute function public.check_private_media_assignment();
create trigger books_check_private_media before insert or update on public.recipe_books for each row execute function public.check_private_media_assignment();
create trigger profiles_check_private_media before insert or update on public.profiles for each row execute function public.check_private_media_assignment();
-- RLS can evaluate before a concurrent recipe reference commits. Recheck under
-- the same lock in a volatile trigger, rather than relying only on that snapshot.
create or replace function public.protect_referenced_private_media()
returns trigger language plpgsql security definer set search_path = public as $$
begin
 if old.bucket_id in ('recipe-images','book-covers') then
   perform pg_advisory_xact_lock(hashtextextended(old.bucket_id || '/' || old.name, 0));
   if not public.private_media_is_unreferenced(old.bucket_id,old.name) then
     raise exception 'This image is still used by a cookbook' using errcode='23503';
   end if;
 end if;
 return old;
end $$;
revoke all on function public.protect_referenced_private_media() from public, anon, authenticated;
create trigger objects_protect_referenced_private_media before delete on storage.objects
 for each row execute function public.protect_referenced_private_media();
commit;
