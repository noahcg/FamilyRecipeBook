-- Fix the polymorphic creation-limit trigger. A recipe_books NEW record has
-- owner_id, while a recipes NEW record has created_by; referencing both fields
-- in one conditional causes PostgreSQL to reject the trigger record shape.
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
  select plan into current_plan
  from public.billing_accounts
  where user_id = target_user;

  if current_plan = 'plus' then
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
