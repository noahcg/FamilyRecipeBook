-- Privacy-preserving moderation.  Cases contain references and minimal labels,
-- never recipe bodies, originals, storage paths, emails, or profile snapshots.
begin;

alter table public.recipes add column if not exists moderation_hidden boolean not null default false;
alter table public.recipe_stories add column if not exists moderation_hidden boolean not null default false;
alter table public.profiles add column if not exists moderation_upload_restricted boolean not null default false;

create table if not exists public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'open' check (status in ('open','hidden_pending_review','resolved','appealed','critical_sensitive')),
  severity text not null default 'low' check (severity in ('low','medium','high','critical')),
  target_type text not null check (target_type in ('asset','recipe','story','cookbook','membership','account')),
  target_id uuid not null,
  cookbook_id uuid references public.recipe_books(id) on delete set null,
  target_owner_user_id uuid references public.profiles(id) on delete set null,
  reported_by_user_id uuid references public.profiles(id) on delete set null,
  reason_code text not null check (reason_code in ('inappropriate_image','harassment','privacy_concern','copyright_concern','spam_scam','other')),
  reporter_statement text check (char_length(reporter_statement) <= 1000),
  assigned_to_admin_id uuid references public.profiles(id) on delete set null,
  decision text check (decision in ('no_action','restored','removed','restricted','suspended','banned')),
  decision_by_admin_id uuid references public.profiles(id) on delete set null,
  internal_notes text,
  prior_visibility jsonb not null default '{}'::jsonb,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  appeal_deadline_at timestamptz
);

create unique index if not exists moderation_open_report_once_idx
  on public.moderation_cases(reported_by_user_id, target_type, target_id)
  where status in ('open','hidden_pending_review','appealed');
create index if not exists moderation_cases_queue_idx on public.moderation_cases(status, severity desc, opened_at asc);

create table if not exists public.moderation_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.moderation_cases(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  reason_code text,
  safe_metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists moderation_case_events_case_idx on public.moderation_case_events(case_id, created_at);

alter table public.moderation_cases enable row level security;
alter table public.moderation_case_events enable row level security;
-- Intentionally no policies. End users cannot read/write cases or events via
-- PostgREST; narrowly-scoped server actions use the service role after checks.

create or replace function public.account_can_upload(user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select not moderation_upload_restricted from public.profiles where id = user_id), false)
$$;
revoke all on function public.account_can_upload(uuid) from public, anon;
grant execute on function public.account_can_upload(uuid) to authenticated;

drop policy if exists "recipes: read if member" on public.recipes;
create policy "recipes: read if member and not moderated" on public.recipes
  for select using (not moderation_hidden and public.is_book_member(book_id, auth.uid()));
drop policy if exists "recipes: insert if contributor or keeper" on public.recipes;
create policy "recipes: insert if contributor or keeper and unrestricted" on public.recipes
  for insert with check (public.account_can_upload(auth.uid()) and public.can_contribute_to_book(book_id, auth.uid()) and created_by = auth.uid());
drop policy if exists "book_invitations: insert if keeper" on public.book_invitations;
create policy "book_invitations: insert if keeper and unrestricted" on public.book_invitations
  for insert with check (public.account_can_upload(auth.uid()) and public.can_manage_book(book_id, auth.uid()));
drop policy if exists "recipe_stories: read if member" on public.recipe_stories;
create policy "recipe_stories: read if member and not moderated" on public.recipe_stories
  for select using (not moderation_hidden and exists (select 1 from public.recipes r where r.id = recipe_id and not r.moderation_hidden and public.is_book_member(r.book_id, auth.uid())));

-- These controls are service-role-only. Existing owner update policies must not
-- let a member unhide their own content or clear an upload restriction.
create or replace function public.prevent_client_moderation_control_changes()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if auth.role() <> 'service_role' then
    if tg_table_name = 'profiles' and new.moderation_upload_restricted is distinct from old.moderation_upload_restricted then
      raise exception 'moderation controls may only be changed by the moderation service' using errcode = '42501';
    end if;
    if tg_table_name in ('recipes', 'recipe_stories') and new.moderation_hidden is distinct from old.moderation_hidden then
      raise exception 'moderation controls may only be changed by the moderation service' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.prevent_client_moderation_control_changes() from public, anon, authenticated;
drop trigger if exists recipes_prevent_client_moderation_control_changes on public.recipes;
create trigger recipes_prevent_client_moderation_control_changes before update on public.recipes for each row execute function public.prevent_client_moderation_control_changes();
drop trigger if exists stories_prevent_client_moderation_control_changes on public.recipe_stories;
create trigger stories_prevent_client_moderation_control_changes before update on public.recipe_stories for each row execute function public.prevent_client_moderation_control_changes();
drop trigger if exists profiles_prevent_client_moderation_control_changes on public.profiles;
create trigger profiles_prevent_client_moderation_control_changes before update on public.profiles for each row execute function public.prevent_client_moderation_control_changes();

drop policy if exists "recipe-images: authenticated upload" on storage.objects;
create policy "recipe-images: unrestricted authenticated upload" on storage.objects for insert
  with check (bucket_id = 'recipe-images' and auth.role() = 'authenticated' and public.account_can_upload(auth.uid()));
drop policy if exists "recipe-originals: editors upload" on storage.objects;
create policy "recipe-originals: unrestricted editors upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'recipe-originals' and public.account_can_upload(auth.uid())
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}_[a-zA-Z0-9 _-]+\.(jpg|png|webp|pdf)$'
  and exists (select 1 from public.recipes r where r.id::text = (storage.foldername(name))[1] and not r.moderation_hidden and (public.can_manage_book(r.book_id, auth.uid()) or (r.created_by = auth.uid() and public.can_contribute_to_book(r.book_id, auth.uid()))))
);

commit;
