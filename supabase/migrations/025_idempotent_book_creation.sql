-- A cookbook creation request carries a stable client-generated token. This
-- prevents a browser double-submit or a retried request from creating a
-- second cookbook when the first insert already committed.
alter table public.recipe_books
  add column if not exists creation_token uuid;

create unique index if not exists recipe_books_creation_token_idx
  on public.recipe_books (creation_token)
  where creation_token is not null;
