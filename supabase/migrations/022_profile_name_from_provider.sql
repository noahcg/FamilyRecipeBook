-- ─── Accept a provider-supplied name under either key ─────────
--
-- Email OTP sign-up carries no name at all (we ask for it on /onboarding),
-- and OAuth providers disagree on the metadata key: Supabase's Google
-- provider populates `full_name`, but `name` is what several others send.
-- Falling back to `name` means one fewer person gets asked for something we
-- were already told.
--
-- `create or replace` keeps the existing on_auth_user_created binding from
-- 001_initial_schema.sql intact and touches no rows.
-- No grants needed: this adds no tables.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  )), ''));
  return new;
end;
$$;
