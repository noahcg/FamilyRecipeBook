-- Admin broadcasts (founder announcement emails) + marketing opt-out.
--
-- Adds a marketing opt-in preference and a per-user unsubscribe token to
-- profiles, and a broadcasts table recording each announcement send. Sending,
-- recipient gathering, and unsubscribe writes all go through the service-role
-- client (server actions gate access with requireAdmin(); the unsubscribe route
-- is public but only flips the boolean by token). Follows the explicit-grants
-- pattern established in 017_admin_push_subscriptions.sql.

-- ─── profiles: marketing preference + unsubscribe token ──────────
alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default true,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_unsubscribe_token_idx
  on public.profiles (unsubscribe_token);

-- ─── broadcasts: one row per announcement send ───────────────────
create table if not exists public.broadcasts (
  id              uuid primary key default gen_random_uuid(),
  sent_by         uuid not null references auth.users(id),
  subject         text not null,
  body_html       text not null,
  recipient_count int not null default 0,
  failed_count    int not null default 0,
  status          text not null default 'sent'
                    check (status in ('sending', 'sent', 'partial_failure')),
  created_at      timestamptz not null default now()
);

create index if not exists broadcasts_created_at_idx
  on public.broadcasts (created_at desc);

alter table public.broadcasts enable row level security;

revoke all on table public.broadcasts from anon;
revoke all on table public.broadcasts from authenticated;
grant select, insert, update, delete on table public.broadcasts to service_role;
