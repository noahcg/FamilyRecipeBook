-- ─── households ───────────────────────────────────────────────
-- Households are private to a physical home. They are separate from
-- recipe books, which are shared across families. Meal plans and
-- grocery lists belong to households, not books.

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── household_members ────────────────────────────────────────
create table public.household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  created_at   timestamptz default now(),
  unique(household_id, user_id)
);

-- ─── meal_plans ───────────────────────────────────────────────
create table public.meal_plans (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id    uuid references public.recipes(id) on delete set null,
  planned_date date not null,
  meal_slot    text not null check (meal_slot in ('breakfast', 'lunch', 'dinner')),
  notes        text,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique(household_id, planned_date, meal_slot)
);

-- ─── Indexes ──────────────────────────────────────────────────
create index on public.household_members (user_id);
create index on public.household_members (household_id);
create index on public.meal_plans (household_id, planned_date);

-- ─── updated_at triggers ──────────────────────────────────────
create trigger set_updated_at before update on public.households
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.meal_plans
  for each row execute function public.set_updated_at();

-- ─── Auto-create household on profile creation ────────────────
create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer as $$
declare
  new_household_id uuid;
begin
  insert into public.households (name, owner_id)
  values (
    case
      when new.full_name is not null and trim(new.full_name) != ''
      then trim(new.full_name) || '''s Household'
      else 'My Household'
    end,
    new.id
  )
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- ─── Backfill existing profiles ───────────────────────────────
do $$
declare
  p record;
  new_household_id uuid;
begin
  for p in select * from public.profiles loop
    insert into public.households (name, owner_id)
    values (
      case
        when p.full_name is not null and trim(p.full_name) != ''
        then trim(p.full_name) || '''s Household'
        else 'My Household'
      end,
      p.id
    )
    returning id into new_household_id;

    insert into public.household_members (household_id, user_id, role)
    values (new_household_id, p.id, 'owner');
  end loop;
end;
$$;

-- ─── Helper functions ─────────────────────────────────────────
create or replace function public.is_household_member(household_uuid uuid, user_uuid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.household_members
    where household_id = household_uuid and user_id = user_uuid
  );
$$;

create or replace function public.get_user_household_id(user_uuid uuid)
returns uuid language sql security definer stable as $$
  select household_id from public.household_members
  where user_id = user_uuid
  limit 1;
$$;

create or replace function public.is_household_owner(household_uuid uuid, user_uuid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.household_members
    where household_id = household_uuid
      and user_id = user_uuid
      and role = 'owner'
  );
$$;

-- ─── RLS ──────────────────────────────────────────────────────
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.meal_plans        enable row level security;

-- households
create policy "households: read if member" on public.households
  for select using (public.is_household_member(id, auth.uid()));

create policy "households: update if owner" on public.households
  for update using (public.is_household_owner(id, auth.uid()));

-- household_members
create policy "household_members: read if same household" on public.household_members
  for select using (
    public.is_household_member(household_id, auth.uid())
  );

create policy "household_members: insert if owner" on public.household_members
  for insert with check (
    public.is_household_owner(household_id, auth.uid())
    or user_id = auth.uid()
  );

create policy "household_members: delete if owner" on public.household_members
  for delete using (
    public.is_household_owner(household_id, auth.uid())
    or user_id = auth.uid()
  );

-- meal_plans
create policy "meal_plans: read if household member" on public.meal_plans
  for select using (public.is_household_member(household_id, auth.uid()));

create policy "meal_plans: insert if household member" on public.meal_plans
  for insert with check (
    created_by = auth.uid()
    and public.is_household_member(household_id, auth.uid())
  );

create policy "meal_plans: update if household member" on public.meal_plans
  for update using (public.is_household_member(household_id, auth.uid()));

create policy "meal_plans: delete if household member" on public.meal_plans
  for delete using (public.is_household_member(household_id, auth.uid()));
