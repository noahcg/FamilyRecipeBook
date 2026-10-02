-- A household's UUID is not an invitation. Only an existing owner may add
-- members; initial owner creation runs through handle_new_profile as definer.
begin;
drop policy "household_members: insert if owner" on public.household_members;
create policy "household_members: insert if owner" on public.household_members
  for insert to authenticated with check (
    public.is_household_owner(household_id, auth.uid())
  );

-- Quota limits are trusted server inputs, never caller-controlled client values.
revoke all on function public.consume_ai_allowance(uuid, date, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_ai_allowance(uuid, date, integer, integer)
  to service_role;
-- Branch before accessing table-specific record fields. SQL AND expressions
-- still bind nonexistent fields and previously broke normal profile/recipe edits.
create or replace function public.prevent_client_moderation_control_changes()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if auth.role() <> 'service_role' then
    if tg_table_name = 'profiles' then
      if new.moderation_upload_restricted is distinct from old.moderation_upload_restricted then
        raise exception 'moderation controls may only be changed by the moderation service' using errcode = '42501';
      end if;
    elsif tg_table_name in ('recipes', 'recipe_stories') then
      if new.moderation_hidden is distinct from old.moderation_hidden then
        raise exception 'moderation controls may only be changed by the moderation service' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
commit;
