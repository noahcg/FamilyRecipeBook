alter table public.recipes
  add column import_method text;

alter table public.recipes
  add constraint recipes_import_method_check
  check (import_method is null or import_method in ('image_upload'));
