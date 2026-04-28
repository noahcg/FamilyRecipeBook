-- ─── Enable RLS on all tables ─────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.recipe_books      enable row level security;
alter table public.book_members      enable row level security;
alter table public.book_invitations  enable row level security;
alter table public.recipes           enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_instructions enable row level security;
alter table public.recipe_stories    enable row level security;
alter table public.recipe_reactions  enable row level security;
alter table public.collections       enable row level security;
alter table public.collection_recipes enable row level security;
alter table public.activity_events   enable row level security;

-- ─── profiles ────────────────────────────────────────────────
-- Users can read profiles of people they share a book with
create policy "profiles: read shared members" on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.book_members bm1
      join public.book_members bm2 on bm1.book_id = bm2.book_id
      where bm1.user_id = auth.uid() and bm2.user_id = profiles.id
    )
  );

create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid());

-- ─── recipe_books ─────────────────────────────────────────────
create policy "recipe_books: read if member" on public.recipe_books
  for select using (public.is_book_member(id, auth.uid()));

create policy "recipe_books: insert authenticated" on public.recipe_books
  for insert with check (auth.uid() = owner_id);

create policy "recipe_books: update if keeper" on public.recipe_books
  for update using (public.can_manage_book(id, auth.uid()));

create policy "recipe_books: delete if keeper" on public.recipe_books
  for delete using (public.can_manage_book(id, auth.uid()));

-- ─── book_members ─────────────────────────────────────────────
create policy "book_members: read if member of same book" on public.book_members
  for select using (public.is_book_member(book_id, auth.uid()));

create policy "book_members: insert if keeper" on public.book_members
  for insert with check (public.can_manage_book(book_id, auth.uid()) or user_id = auth.uid());

create policy "book_members: update if keeper" on public.book_members
  for update using (public.can_manage_book(book_id, auth.uid()));

create policy "book_members: delete if keeper" on public.book_members
  for delete using (public.can_manage_book(book_id, auth.uid()));

-- ─── book_invitations ─────────────────────────────────────────
create policy "book_invitations: read if keeper" on public.book_invitations
  for select using (public.can_manage_book(book_id, auth.uid()));

create policy "book_invitations: insert if keeper" on public.book_invitations
  for insert with check (public.can_manage_book(book_id, auth.uid()));

create policy "book_invitations: update to accept" on public.book_invitations
  for update using (
    public.can_manage_book(book_id, auth.uid())
    or (accepted_by = auth.uid() and accepted_at is null)
  );

create policy "book_invitations: delete if keeper" on public.book_invitations
  for delete using (public.can_manage_book(book_id, auth.uid()));

-- ─── recipes ──────────────────────────────────────────────────
create policy "recipes: read if member" on public.recipes
  for select using (public.is_book_member(book_id, auth.uid()));

create policy "recipes: insert if contributor or keeper" on public.recipes
  for insert with check (
    public.can_contribute_to_book(book_id, auth.uid())
    and created_by = auth.uid()
  );

create policy "recipes: update if keeper or creator" on public.recipes
  for update using (
    public.can_manage_book(book_id, auth.uid())
    or (created_by = auth.uid() and public.can_contribute_to_book(book_id, auth.uid()))
  );

create policy "recipes: delete if keeper or creator" on public.recipes
  for delete using (
    public.can_manage_book(book_id, auth.uid())
    or created_by = auth.uid()
  );

-- ─── recipe_ingredients ───────────────────────────────────────
create policy "recipe_ingredients: read if member" on public.recipe_ingredients
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_book_member(r.book_id, auth.uid())
    )
  );

create policy "recipe_ingredients: modify if can edit recipe" on public.recipe_ingredients
  for all using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (
          public.can_manage_book(r.book_id, auth.uid())
          or (r.created_by = auth.uid() and public.can_contribute_to_book(r.book_id, auth.uid()))
        )
    )
  );

-- ─── recipe_instructions ──────────────────────────────────────
create policy "recipe_instructions: read if member" on public.recipe_instructions
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_book_member(r.book_id, auth.uid())
    )
  );

create policy "recipe_instructions: modify if can edit recipe" on public.recipe_instructions
  for all using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (
          public.can_manage_book(r.book_id, auth.uid())
          or (r.created_by = auth.uid() and public.can_contribute_to_book(r.book_id, auth.uid()))
        )
    )
  );

-- ─── recipe_stories ───────────────────────────────────────────
create policy "recipe_stories: read if member" on public.recipe_stories
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_book_member(r.book_id, auth.uid())
    )
  );

create policy "recipe_stories: insert if member" on public.recipe_stories
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_book_member(r.book_id, auth.uid())
    )
  );

create policy "recipe_stories: delete own" on public.recipe_stories
  for delete using (author_id = auth.uid());

-- ─── recipe_reactions ─────────────────────────────────────────
create policy "recipe_reactions: read if member" on public.recipe_reactions
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_book_member(r.book_id, auth.uid())
    )
  );

create policy "recipe_reactions: insert own if member" on public.recipe_reactions
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_book_member(r.book_id, auth.uid())
    )
  );

create policy "recipe_reactions: delete own" on public.recipe_reactions
  for delete using (user_id = auth.uid());

-- ─── collections ──────────────────────────────────────────────
create policy "collections: read if member" on public.collections
  for select using (public.is_book_member(book_id, auth.uid()));

create policy "collections: insert if contributor or keeper" on public.collections
  for insert with check (public.can_contribute_to_book(book_id, auth.uid()));

create policy "collections: update if contributor or keeper" on public.collections
  for update using (public.can_contribute_to_book(book_id, auth.uid()));

create policy "collections: delete if keeper" on public.collections
  for delete using (public.can_manage_book(book_id, auth.uid()));

-- ─── collection_recipes ───────────────────────────────────────
create policy "collection_recipes: read if member" on public.collection_recipes
  for select using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and public.is_book_member(c.book_id, auth.uid())
    )
  );

create policy "collection_recipes: modify if contributor or keeper" on public.collection_recipes
  for all using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id
        and public.can_contribute_to_book(c.book_id, auth.uid())
    )
  );

-- ─── activity_events ──────────────────────────────────────────
create policy "activity_events: read if member" on public.activity_events
  for select using (public.is_book_member(book_id, auth.uid()));

create policy "activity_events: insert if member" on public.activity_events
  for insert with check (public.is_book_member(book_id, auth.uid()));
