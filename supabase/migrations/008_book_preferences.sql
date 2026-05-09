alter table public.recipe_books
  add column if not exists icon text not null default 'bowl';

alter table public.user_settings
  add column if not exists default_book_id uuid references public.recipe_books(id) on delete set null;
