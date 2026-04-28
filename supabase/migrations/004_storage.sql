-- ─── Storage buckets ──────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('recipe-images', 'recipe-images', true),
  ('book-covers',   'book-covers',   true),
  ('avatars',       'avatars',       true)
on conflict (id) do nothing;

-- ─── Storage policies ─────────────────────────────────────────

-- recipe-images: any authenticated user can upload, anyone can read
create policy "recipe-images: public read"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

create policy "recipe-images: authenticated upload"
  on storage.objects for insert
  with check (bucket_id = 'recipe-images' and auth.role() = 'authenticated');

create policy "recipe-images: owner delete"
  on storage.objects for delete
  using (bucket_id = 'recipe-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- book-covers
create policy "book-covers: public read"
  on storage.objects for select
  using (bucket_id = 'book-covers');

create policy "book-covers: authenticated upload"
  on storage.objects for insert
  with check (bucket_id = 'book-covers' and auth.role() = 'authenticated');

create policy "book-covers: owner delete"
  on storage.objects for delete
  using (bucket_id = 'book-covers' and auth.uid()::text = (storage.foldername(name))[1]);

-- avatars
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: own upload"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars: own delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
