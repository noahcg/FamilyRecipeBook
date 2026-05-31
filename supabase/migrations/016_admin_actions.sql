-- Append-only audit log of privileged admin-panel actions.
--
-- The admin tooling reads and writes this table through the service-role client,
-- which bypasses RLS. RLS is enabled with NO policies so that no end user (anon
-- or authenticated) can read or write the log through the normal API.
--
-- Never store secrets here: no invite tokens, raw private recipe content, or
-- service-role keys. `summary` is human-readable; `metadata` is structured ids.

create table if not exists public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  summary     text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_actions_created_at_idx
  on public.admin_actions (created_at desc);

alter table public.admin_actions enable row level security;

-- Intentionally no policies: only the service-role client (which bypasses RLS)
-- may access this table.
