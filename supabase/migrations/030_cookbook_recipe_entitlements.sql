-- Recipe capacity and Contributor access belong to the destination cookbook's
-- owner. A Plus owner sponsors Contributor access for invitees on any plan.
-- A Free owner may add up to 50 recipes to their one eligible (oldest) book;
-- existing Contributors become read-only while that owner is on Free.

create or replace function public.can_contribute_to_book(book_uuid uuid, user_uuid uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1
    from public.book_members m
    join public.recipe_books b on b.id = m.book_id
    where m.book_id = book_uuid
      and m.user_id = user_uuid
      and (
        m.role = 'keeper'
        or (m.role = 'contributor' and public.book_owner_has_plus(book_uuid))
      )
  );
$$;

create or replace function public.get_book_recipe_allowance(target_book_id uuid)
returns table (is_free boolean, used integer, recipe_limit integer, remaining integer)
language plpgsql security definer set search_path = '' as $$
declare free_plan boolean; recipe_count integer;
begin
  if auth.uid() is null or not public.is_book_member(target_book_id, auth.uid()) then
    raise exception 'You do not have access to this cookbook.';
  end if;
  free_plan := not public.book_owner_has_plus(target_book_id);
  select count(*)::integer into recipe_count from public.recipes where book_id = target_book_id;
  return query select free_plan, recipe_count,
    case when free_plan then 50 else null::integer end,
    case when free_plan then greatest(50 - recipe_count, 0) else null::integer end;
end;
$$;
revoke all on function public.get_book_recipe_allowance(uuid) from public, anon;
grant execute on function public.get_book_recipe_allowance(uuid) to authenticated;

-- Creators may delete their own recipe only while they still have effective
-- Contributor access. Keepers retain control of every recipe in their book.
drop policy if exists "recipes: delete if keeper or creator" on public.recipes;
create policy "recipes: delete if keeper or active creator" on public.recipes
  for delete using (
    public.can_manage_book(book_id, auth.uid())
    or (created_by = auth.uid() and public.can_contribute_to_book(book_id, auth.uid()))
  );

create or replace function public.enforce_free_creation_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_user uuid;
  current_plan text;
  has_grandfathered_plus boolean;
  cookbook_count integer;
  recipe_count integer;
  eligible_book uuid;
begin
  if tg_table_name = 'recipe_books' then
    target_user := new.owner_id;
  else
    select owner_id into target_user from public.recipe_books where id = new.book_id;
    if target_user is null then
      raise exception using errcode = 'P0001', message = 'COOKBOOK_NOT_FOUND';
    end if;
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
    return new;
  end if;

  -- Only the owner can add recipes while the cookbook operates on Free.
  if new.created_by <> target_user then
    raise exception using errcode = 'P0001', message = 'CONTRIBUTOR_REQUIRES_PLUS';
  end if;

  select id into eligible_book
  from public.recipe_books
  where owner_id = target_user
  order by created_at asc nulls last, id asc
  limit 1;
  if new.book_id <> eligible_book then
    raise exception using errcode = 'P0001', message = 'FREE_COOKBOOK_ONLY';
  end if;

  select count(*) into recipe_count
  from public.recipes
  where book_id = new.book_id;
  if recipe_count >= 50 then
    raise exception using errcode = 'P0001', message = 'RECIPE_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_free_recipe_move on public.recipes;
create trigger enforce_free_recipe_move before update of book_id on public.recipes
  for each row when (new.book_id is distinct from old.book_id)
  execute function public.enforce_free_creation_limits();
