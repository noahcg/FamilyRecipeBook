-- Account deletion must remove the person without deleting content that belongs
-- to another member's cookbook. Cookbook ownership is resolved in application
-- code before auth deletion; authorship references deliberately survive it.

alter table public.recipes
  add column if not exists created_by_display_name text,
  alter column created_by drop not null;

alter table public.recipes
  drop constraint if exists recipes_created_by_fkey,
  add constraint recipes_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.recipe_stories
  add column if not exists author_display_name text,
  alter column author_id drop not null;

alter table public.recipe_stories
  drop constraint if exists recipe_stories_author_id_fkey,
  add constraint recipe_stories_author_id_fkey
    foreign key (author_id) references public.profiles(id) on delete set null;

-- These rows can be collaborative too. Preserve the content if its creator
-- leaves, while removing the now-invalid account reference.
alter table public.collections
  alter column created_by drop not null;
alter table public.collections
  drop constraint if exists collections_created_by_fkey,
  add constraint collections_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.meal_plans
  alter column created_by drop not null;
alter table public.meal_plans
  drop constraint if exists meal_plans_created_by_fkey,
  add constraint meal_plans_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.grocery_items
  alter column created_by drop not null;
alter table public.grocery_items
  drop constraint if exists grocery_items_created_by_fkey,
  add constraint grocery_items_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null;

-- Service-role-only operational record. It intentionally does not reference
-- auth/profiles so it survives hard auth deletion and makes failures auditable.
create table if not exists public.account_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  initiated_by uuid references public.profiles(id) on delete set null,
  status text not null check (status in ('processing', 'failed', 'complete')),
  impact jsonb not null default '{}'::jsonb,
  archive_status text not null default 'pending',
  email_status text not null default 'pending',
  storage_status text not null default 'pending',
  database_status text not null default 'pending',
  auth_status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists account_deletions_one_processing_per_user_idx
  on public.account_deletions (user_id) where status = 'processing';

alter table public.account_deletions enable row level security;
-- No policies: server-side service-role code owns this operational record.
