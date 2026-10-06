-- Record a completed first sign-in once per newly created account.
-- The start time excludes existing accounts when this migration is applied.
create table public.signup_conversion_tracking (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now()
);

create table public.signup_conversion_config (
  singleton boolean primary key default true check (singleton),
  started_at timestamptz not null default now()
);
insert into public.signup_conversion_config (singleton) values (true);

alter table public.signup_conversion_tracking enable row level security;
alter table public.signup_conversion_config enable row level security;
revoke all on public.signup_conversion_tracking from anon, authenticated;
revoke all on public.signup_conversion_config from anon, authenticated;

create function public.record_first_sign_in()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if auth.uid() is null then return false; end if;

  insert into public.signup_conversion_tracking (user_id)
  select u.id
  from auth.users u
  cross join public.signup_conversion_config c
  where u.id = auth.uid()
    and u.created_at >= c.started_at
  on conflict (user_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

revoke all on function public.record_first_sign_in() from public, anon;
grant execute on function public.record_first_sign_in() to authenticated;
