-- ─── user_settings ───────────────────────────────────────────
-- Private per-user settings. Only the owning user can read or write their own row.
create table public.user_settings (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  ai_provider text check (ai_provider in ('openai', 'anthropic')),
  ai_api_key  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings: read own" on public.user_settings
  for select using (user_id = auth.uid());

create policy "user_settings: write own" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();
