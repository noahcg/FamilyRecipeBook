-- ─── book_categories ─────────────────────────────────────────
-- Per-cookbook chapter categories. Each book is seeded with the
-- default 12 names on creation, and users can rename/add/remove
-- them from book settings. Recipes reference a category by id so
-- that renames flow through automatically.

create table public.book_categories (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.recipe_books(id) on delete cascade,
  name        text not null,
  position    int not null,
  is_default  boolean not null default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (book_id, name)
);

create index book_categories_book_position_idx
  on public.book_categories (book_id, position);

create trigger set_updated_at before update on public.book_categories
  for each row execute function public.set_updated_at();

alter table public.book_categories enable row level security;

create policy "book_categories: read if member" on public.book_categories
  for select using (public.is_book_member(book_id, auth.uid()));

create policy "book_categories: insert if contributor or keeper" on public.book_categories
  for insert with check (public.can_contribute_to_book(book_id, auth.uid()));

create policy "book_categories: update if contributor or keeper" on public.book_categories
  for update using (public.can_contribute_to_book(book_id, auth.uid()));

create policy "book_categories: delete if contributor or keeper" on public.book_categories
  for delete using (public.can_contribute_to_book(book_id, auth.uid()));

-- ─── Default chapter list ─────────────────────────────────────
-- Returns the seed name/position rows used when a cookbook is created.
-- Column names are prefixed (cat_*) because `position` is a reserved word
-- inside RETURNS TABLE. Mirror src/lib/recipeCategories.ts
-- (DEFAULT_CATEGORY_SEED) if either changes.
create or replace function public.default_book_categories()
returns table (cat_name text, cat_position int) language sql immutable as $$
  values
    ('Breakfast',   0),
    ('Lunch',       1),
    ('Dinner',      2),
    ('Appetizer',   3),
    ('Side Dish',   4),
    ('Dessert',     5),
    ('Snack',       6),
    ('Soup',        7),
    ('Salad',       8),
    ('Bread',       9),
    ('Drink',      10),
    ('Other',      11);
$$;

-- Seed defaults for every existing cookbook (one-time backfill).
insert into public.book_categories (book_id, name, position, is_default)
select rb.id, d.cat_name, d.cat_position, true
from public.recipe_books rb
cross join public.default_book_categories() d
on conflict (book_id, name) do nothing;

-- ─── Auto-seed on new cookbook creation ───────────────────────
-- Security definer so the seeding bypasses RLS, matching the
-- handle_new_recipe_book() pattern that adds the owner as a keeper.
create or replace function public.handle_new_book_categories()
returns trigger language plpgsql security definer as $$
begin
  insert into public.book_categories (book_id, name, position, is_default)
  select new.id, d.cat_name, d.cat_position, true
  from public.default_book_categories() d;
  return new;
end;
$$;

create trigger on_recipe_book_created_seed_categories
  after insert on public.recipe_books
  for each row execute function public.handle_new_book_categories();

-- ─── recipes.category_id ──────────────────────────────────────
-- Add the FK column; backfill from the existing free-text column;
-- any unmatched recipes fall into the cookbook's "Other" row.
alter table public.recipes
  add column category_id uuid references public.book_categories(id) on delete set null;

create index recipes_category_id_idx on public.recipes (category_id);

-- 1. Case-insensitive match from existing text to the seeded category rows.
update public.recipes r
set category_id = bc.id
from public.book_categories bc
where bc.book_id = r.book_id
  and lower(bc.name) = lower(coalesce(r.category, ''));

-- 2. Anything still null (blank/null category text, or a value that didn't
--    match a seeded default) gets dropped into that book's "Other" row.
update public.recipes r
set category_id = bc.id
from public.book_categories bc
where r.category_id is null
  and bc.book_id = r.book_id
  and bc.name = 'Other';

-- 3. Drop the legacy free-text column. Single source of truth from here on.
alter table public.recipes drop column category;
