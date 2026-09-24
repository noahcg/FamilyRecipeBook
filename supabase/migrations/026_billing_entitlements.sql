-- Free/Plus billing state, webhook idempotency, and atomic AI allowances.
create table public.billing_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'plus')),
  status text not null default 'free',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  last_payment_at timestamptz,
  access_until timestamptz,
  source_event_id text,
  source_event_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.billing_webhook_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null default false,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'failed')),
  error_message text
);

create table public.ai_allowance_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null default 'ai.recipeIdeas',
  period_start date not null,
  quantity_used integer not null default 0 check (quantity_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature, period_start)
);

alter table public.billing_accounts enable row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.ai_allowance_usage enable row level security;

create policy "billing_accounts: read own" on public.billing_accounts
  for select using (user_id = auth.uid());
create policy "ai_allowance_usage: read own" on public.ai_allowance_usage
  for select using (user_id = auth.uid());

create index billing_accounts_stripe_customer_idx on public.billing_accounts(stripe_customer_id);
create index billing_accounts_stripe_subscription_idx on public.billing_accounts(stripe_subscription_id);

create or replace function public.handle_new_billing_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.billing_accounts (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_billing
  after insert on public.profiles
  for each row execute function public.handle_new_billing_account();

insert into public.billing_accounts (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.consume_ai_allowance(
  target_user_id uuid,
  target_period_start date,
  allowance_limit integer,
  amount integer default 1
)
returns table (allowed boolean, remaining integer)
language plpgsql security definer set search_path = public as $$
declare
  used integer;
begin
  if amount <= 0 or allowance_limit < 0 then
    return query select false, 0;
    return;
  end if;
  insert into public.ai_allowance_usage(user_id, period_start, quantity_used)
  values (target_user_id, target_period_start, 0)
  on conflict (user_id, feature, period_start) do nothing;
  select quantity_used into used
  from public.ai_allowance_usage
  where user_id = target_user_id and feature = 'ai.recipeIdeas' and period_start = target_period_start
  for update;
  if used + amount > allowance_limit then
    return query select false, greatest(allowance_limit - used, 0);
    return;
  end if;
  update public.ai_allowance_usage
  set quantity_used = used + amount, updated_at = now()
  where user_id = target_user_id and feature = 'ai.recipeIdeas' and period_start = target_period_start;
  return query select true, allowance_limit - used - amount;
end;
$$;

-- Database-boundary protection for every insert path, including future actions.
create or replace function public.enforce_free_creation_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_user uuid;
  current_plan text;
  cookbook_count integer;
  recipe_count integer;
begin
  if tg_table_name = 'recipe_books' then
    target_user := new.owner_id;
  else
    target_user := new.created_by;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_user::text, 26026));
  select plan into current_plan from public.billing_accounts where user_id = target_user;
  if current_plan = 'plus' then return new; end if;
  if tg_table_name = 'recipe_books' then
    select count(*) into cookbook_count from public.recipe_books where owner_id = target_user;
    if cookbook_count >= 1 then raise exception using errcode = 'P0001', message = 'COOKBOOK_LIMIT_REACHED'; end if;
  else
    select count(*) into recipe_count from public.recipes where created_by = target_user;
    if recipe_count >= 50 then raise exception using errcode = 'P0001', message = 'RECIPE_LIMIT_REACHED'; end if;
  end if;
  return new;
end;
$$;

create trigger enforce_free_cookbook_limit before insert on public.recipe_books
  for each row execute function public.enforce_free_creation_limits();
create trigger enforce_free_recipe_limit before insert on public.recipes
  for each row execute function public.enforce_free_creation_limits();
