-- ─── grocery_items ────────────────────────────────────────────
-- Household-scoped shopping list. Designed for future store/aisle
-- integration: aisle and sort_order are nullable now and will be
-- populated by store-lookup APIs later. category uses standardized
-- store-section names so they map cleanly to store department APIs.

create table public.grocery_items (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name         text not null,
  quantity     text,
  unit         text,
  category     text not null default 'Other',
  -- Future: populated by store API (e.g. "Aisle 4", "Dairy Section")
  aisle        text,
  -- Future: integer sort position within a store's aisle sequence
  sort_order   int,
  -- Future: user/AI preference notes ("organic only", "any brand")
  notes        text,
  recipe_id    uuid references public.recipes(id) on delete set null,
  checked      boolean not null default false,
  checked_by   uuid references public.profiles(id) on delete set null,
  checked_at   timestamptz,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz default now()
);

create index on public.grocery_items (household_id);
create index on public.grocery_items (household_id, checked);

-- ─── RLS ──────────────────────────────────────────────────────
alter table public.grocery_items enable row level security;

create policy "grocery_items: read if household member" on public.grocery_items
  for select using (public.is_household_member(household_id, auth.uid()));

create policy "grocery_items: insert if household member" on public.grocery_items
  for insert with check (
    created_by = auth.uid()
    and public.is_household_member(household_id, auth.uid())
  );

create policy "grocery_items: update if household member" on public.grocery_items
  for update using (public.is_household_member(household_id, auth.uid()));

create policy "grocery_items: delete if household member" on public.grocery_items
  for delete using (public.is_household_member(household_id, auth.uid()));
