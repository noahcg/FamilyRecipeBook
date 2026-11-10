-- Keep existing profiles exempt without changing their names or running an
-- UPDATE over user data. Profiles created after this migration require a name.
alter table public.profiles
  add column requires_profile_name boolean not null default false,
  alter column requires_profile_name set default true;
