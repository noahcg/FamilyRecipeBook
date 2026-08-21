alter table public.recipes
  add column if not exists photo_source text,
  add column if not exists photo_author text,
  add column if not exists photo_author_url text,
  add column if not exists photo_source_url text;
