-- Admin-only Web Push subscriptions.
--
-- Server actions gate access with requireAdmin() and use the service-role
-- client. RLS is enabled with no anon/authenticated policies, so end users
-- cannot read or write subscriptions through the normal API.

create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_push_subscriptions_user_id_idx
  on public.admin_push_subscriptions (user_id);

alter table public.admin_push_subscriptions enable row level security;

revoke all on table public.admin_push_subscriptions from anon;
revoke all on table public.admin_push_subscriptions from authenticated;
grant select, insert, update, delete on table public.admin_push_subscriptions to service_role;
