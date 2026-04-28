-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── profiles ────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  known_for   text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── recipe_books ─────────────────────────────────────────────
create table public.recipe_books (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  cover_image_url  text,
  cover_style      text not null default 'sage',
  owner_id         uuid not null references public.profiles(id) on delete cascade,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─── book_members ─────────────────────────────────────────────
create table public.book_members (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.recipe_books(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('keeper', 'contributor', 'family')),
  created_at  timestamptz default now(),
  unique(book_id, user_id)
);

-- ─── book_invitations ─────────────────────────────────────────
create table public.book_invitations (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references public.recipe_books(id) on delete cascade,
  email        text not null,
  role         text not null check (role in ('contributor', 'family')),
  token        text not null unique,
  invited_by   uuid not null references public.profiles(id),
  accepted_by  uuid references public.profiles(id),
  accepted_at  timestamptz,
  expires_at   timestamptz not null,
  created_at   timestamptz default now()
);

-- ─── recipes ──────────────────────────────────────────────────
create table public.recipes (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references public.recipe_books(id) on delete cascade,
  title        text not null,
  description  text,
  photo_url    text,
  source_name  text,
  story        text,
  prep_minutes int,
  cook_minutes int,
  servings     int,
  category     text,
  tags         text[] default '{}',
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─── recipe_ingredients ───────────────────────────────────────
create table public.recipe_ingredients (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes(id) on delete cascade,
  position    int not null,
  quantity    text,
  unit        text,
  item        text not null,
  note        text,
  created_at  timestamptz default now()
);

-- ─── recipe_instructions ──────────────────────────────────────
create table public.recipe_instructions (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes(id) on delete cascade,
  position    int not null,
  body        text not null,
  created_at  timestamptz default now()
);

-- ─── recipe_stories ───────────────────────────────────────────
create table public.recipe_stories (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes(id) on delete cascade,
  author_id   uuid not null references public.profiles(id),
  body        text not null,
  created_at  timestamptz default now()
);

-- ─── recipe_reactions ─────────────────────────────────────────
create table public.recipe_reactions (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('love', 'made_it', 'favorite')),
  created_at  timestamptz default now(),
  unique(recipe_id, user_id, type)
);

-- ─── collections ──────────────────────────────────────────────
create table public.collections (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references public.recipe_books(id) on delete cascade,
  title        text not null,
  description  text,
  icon         text,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─── collection_recipes ───────────────────────────────────────
create table public.collection_recipes (
  id             uuid primary key default gen_random_uuid(),
  collection_id  uuid not null references public.collections(id) on delete cascade,
  recipe_id      uuid not null references public.recipes(id) on delete cascade,
  created_at     timestamptz default now(),
  unique(collection_id, recipe_id)
);

-- ─── activity_events ──────────────────────────────────────────
create table public.activity_events (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.recipe_books(id) on delete cascade,
  recipe_id   uuid references public.recipes(id) on delete cascade,
  actor_id    uuid references public.profiles(id),
  type        text not null,
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

-- ─── Indexes ──────────────────────────────────────────────────
create index on public.recipes (book_id, created_at desc);
create index on public.recipe_ingredients (recipe_id, position);
create index on public.recipe_instructions (recipe_id, position);
create index on public.recipe_reactions (recipe_id);
create index on public.recipe_reactions (user_id);
create index on public.recipe_stories (recipe_id);
create index on public.book_members (book_id, user_id);
create index on public.book_invitations (token);
create index on public.activity_events (book_id, created_at desc);
create index on public.collection_recipes (collection_id);

-- ─── Auto-add owner as keeper ─────────────────────────────────
create or replace function public.handle_new_recipe_book()
returns trigger language plpgsql security definer as $$
begin
  insert into public.book_members (book_id, user_id, role)
  values (new.id, new.owner_id, 'keeper');
  return new;
end;
$$;

create trigger on_recipe_book_created
  after insert on public.recipe_books
  for each row execute function public.handle_new_recipe_book();

-- ─── Auto-create profile on sign up ───────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── updated_at auto-bumper ───────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.recipe_books
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.collections
  for each row execute function public.set_updated_at();
