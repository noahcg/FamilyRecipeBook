alter table public.recipes
  drop constraint if exists recipes_import_method_check;

alter table public.recipes
  add column if not exists source_url text,
  add column if not exists import_source text,
  add column if not exists import_metadata jsonb not null default '{}'::jsonb,
  add column if not exists nutrition jsonb not null default '{}'::jsonb;

alter table public.recipes
  add constraint recipes_import_method_check
  check (import_method is null or import_method in ('image_upload', 'file_import'));
