-- ─── recipe_ratings ───────────────────────────────────────────
create table public.recipe_ratings (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  rating      numeric(2,1) not null check (rating >= 0 and rating <= 5 and rating * 2 = floor(rating * 2)),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(recipe_id, user_id)
);

create index on public.recipe_ratings (recipe_id);
create index on public.recipe_ratings (user_id);

alter table public.recipe_ratings enable row level security;

create policy "recipe_ratings: read if member" on public.recipe_ratings
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_book_member(r.book_id, auth.uid())
    )
  );

create policy "recipe_ratings: insert own if member" on public.recipe_ratings
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_book_member(r.book_id, auth.uid())
    )
  );

create policy "recipe_ratings: update own" on public.recipe_ratings
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "recipe_ratings: delete own" on public.recipe_ratings
  for delete using (user_id = auth.uid());
