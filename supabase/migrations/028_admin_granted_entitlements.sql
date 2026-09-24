-- Admin-granted Plus access is independent of Stripe billing.
alter table public.billing_accounts
  add column grandfathered_plus boolean not null default false,
  add column grandfathered_at timestamptz,
  add column grandfathered_revoked_at timestamptz;

-- Everyone who already had an account when billing launched keeps permanent
-- Plus access unless an admin explicitly revokes the grant. New accounts use
-- the default false value above.
update public.billing_accounts
set
  grandfathered_plus = true,
  grandfathered_at = coalesce(grandfathered_at, now())
where grandfathered_plus = false;

-- Enforce admin-granted Plus at the database boundary too. Application checks
-- alone are not sufficient because recipes and cookbooks can have other insert
-- paths.
create or replace function public.enforce_free_creation_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_user uuid;
  current_plan text;
  has_grandfathered_plus boolean;
  cookbook_count integer;
  recipe_count integer;
begin
  if tg_table_name = 'recipe_books' then
    target_user := new.owner_id;
  else
    target_user := new.created_by;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_user::text, 26026));
  select plan, grandfathered_plus
    into current_plan, has_grandfathered_plus
  from public.billing_accounts
  where user_id = target_user;

  if current_plan = 'plus' or has_grandfathered_plus then
    return new;
  end if;

  if tg_table_name = 'recipe_books' then
    select count(*) into cookbook_count
    from public.recipe_books
    where owner_id = target_user;
    if cookbook_count >= 1 then
      raise exception using errcode = 'P0001', message = 'COOKBOOK_LIMIT_REACHED';
    end if;
  else
    select count(*) into recipe_count
    from public.recipes
    where created_by = target_user;
    if recipe_count >= 50 then
      raise exception using errcode = 'P0001', message = 'RECIPE_LIMIT_REACHED';
    end if;
  end if;

  return new;
end;
$$;
