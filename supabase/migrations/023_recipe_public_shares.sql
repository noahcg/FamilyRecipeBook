-- Opaque, stable links for deliberately shared recipes. This table has no
-- client-facing RLS policy: public reads are served through a narrow,
-- server-only data shape rather than exposing recipe rows themselves.
create table public.recipe_public_shares (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null unique references public.recipes(id) on delete cascade,
  share_id uuid not null unique default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index recipe_public_shares_share_id_idx on public.recipe_public_shares (share_id);

alter table public.recipe_public_shares enable row level security;
