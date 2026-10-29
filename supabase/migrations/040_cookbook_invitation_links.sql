-- Single-use, seven-day bearer invitations. A pending link reserves one person;
-- unlike email invitations, separate links cannot be deduplicated by recipient.
create table public.book_invitation_links (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.recipe_books(id) on delete cascade,
  role text not null check (role in ('family', 'contributor')),
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  check (accepted_at is null or cancelled_at is null)
);
create index on public.book_invitation_links(book_id) where accepted_at is null and cancelled_at is null;
alter table public.book_invitation_links enable row level security;
create policy "book_invitation_links: read if keeper" on public.book_invitation_links
  for select to authenticated using (public.can_manage_book(book_id, auth.uid()));
-- No client write policies: all mutations must use the locked RPCs below.
revoke all on public.book_invitation_links from anon, authenticated;
grant select on public.book_invitation_links to authenticated;
grant all on public.book_invitation_links to service_role;

create or replace function public.book_sharing_seats(target_book_id uuid)
returns integer language sql volatile security definer set search_path = '' as $$
  select (select count(*)::integer from (
    select coalesce(lower(trim(u.email)), m.user_id::text) as person
    from public.book_members m
    join public.recipe_books b on b.id = m.book_id
    left join auth.users u on u.id = m.user_id
    where m.book_id = target_book_id and m.user_id <> b.owner_id
    union
    select lower(trim(i.email))
    from public.book_invitations i join public.recipe_books b on b.id = i.book_id
    where i.book_id = target_book_id and i.accepted_at is null and i.expires_at > now()
      and not exists (select 1 from auth.users u where u.id = b.owner_id and lower(trim(u.email)) = lower(trim(i.email)))
  ) people) + (select count(*)::integer from public.book_invitation_links l
    where l.book_id = target_book_id and l.accepted_at is null
      and l.cancelled_at is null and l.expires_at > now());
$$;

create function public.create_book_invitation_link(target_book_id uuid, invitation_role text)
returns public.book_invitation_links language plpgsql security definer set search_path = '' as $$
declare invitation public.book_invitation_links; enabled boolean; book_owner uuid;
begin
  if auth.uid() is null or not public.can_manage_book(target_book_id, auth.uid()) then
    raise exception 'Only the keeper can create invitation links.';
  end if;
  if invitation_role is null or invitation_role not in ('family', 'contributor') then
    raise exception 'Choose Family or Contributor access.';
  end if;
  -- Use the same cookbook-first lock order as email invitation acceptance.
  select sharing_enabled, owner_id into enabled, book_owner
    from public.recipe_books where id = target_book_id for update;
  if not public.can_manage_book(target_book_id, auth.uid()) then
    raise exception 'Only the keeper can create invitation links.';
  end if;
  if not public.account_can_upload(auth.uid()) then
    raise exception 'Invitation creation is unavailable for this account.';
  end if;
  if not coalesce(enabled, false) then
    raise exception 'Turn on sharing for this cookbook before inviting members.';
  end if;
  -- Freeze the entitlement while this invitation is reserved.
  perform 1 from public.billing_accounts where user_id = book_owner for share;
  if not public.book_owner_has_plus(target_book_id) then
    if not public.is_free_sharing_book(target_book_id) then
      raise exception 'Free sharing is available on your oldest cookbook. Upgrade to Plus to invite people to this book.';
    end if;
    if invitation_role <> 'family' then
      raise exception 'Free cookbooks can invite Family members only. The cookbook owner can upgrade to Plus to invite Contributors.';
    end if;
    if public.book_sharing_seats(target_book_id) >= 3 then
      raise exception 'This cookbook has used its 3 free sharing spots. Cancel a pending invitation, remove a member, or ask the owner to upgrade to Plus.';
    end if;
  end if;
  insert into public.book_invitation_links(book_id, role, invited_by)
    values (target_book_id, invitation_role, auth.uid()) returning * into invitation;
  return invitation;
end;
$$;

create function public.cancel_book_invitation_link(invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target_book uuid; invitation public.book_invitation_links;
begin
  select book_id into target_book from public.book_invitation_links where id = invitation_id;
  if auth.uid() is null or target_book is null or not public.can_manage_book(target_book, auth.uid()) then
    raise exception 'Only the keeper can cancel invitation links.';
  end if;
  perform 1 from public.recipe_books where id = target_book for update;
  select * into invitation from public.book_invitation_links where id = invitation_id for update;
  if not found or not public.can_manage_book(target_book, auth.uid()) then
    raise exception 'Only the keeper can cancel invitation links.';
  end if;
  if invitation.accepted_at is not null then
    raise exception 'This invitation has already been accepted.';
  end if;
  update public.book_invitation_links set cancelled_at = coalesce(cancelled_at, clock_timestamp())
    where id = invitation_id;
end;
$$;

create function public.accept_book_invitation_link(invitation_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation public.book_invitation_links; recipient uuid; target_book uuid; enabled boolean; book_owner uuid;
begin
  recipient := auth.uid();
  if recipient is null then
    raise exception 'Please sign in or create an account to accept this invitation.';
  end if;
  select book_id into target_book from public.book_invitation_links where token = invitation_token;
  if not found then raise exception 'This invitation is invalid or has expired.'; end if;
  select sharing_enabled, owner_id into enabled, book_owner
    from public.recipe_books where id = target_book for update;
  -- Re-read after acquiring locks: cancellation and another recipient may have
  -- committed while we waited. Previewing a link never invokes this function.
  select * into invitation from public.book_invitation_links where token = invitation_token for update;
  if not found or invitation.accepted_at is not null or invitation.cancelled_at is not null
    or invitation.expires_at <= clock_timestamp() then
    raise exception 'This invitation is invalid or has expired.';
  end if;
  if not coalesce(enabled, false) then
    raise exception 'Sharing is turned off for this cookbook. Ask the keeper to turn it on before joining.';
  end if;
  if exists (select 1 from public.book_members where book_id = target_book and user_id = recipient) then
    raise exception 'You are already a member of this cookbook. This invitation is still available for someone else.';
  end if;
  perform 1 from public.billing_accounts where user_id = book_owner for share;
  if not public.book_owner_has_plus(target_book) and invitation.role <> 'family' then
    raise exception 'This Contributor invitation needs Plus. Ask the keeper to send a Family invitation or upgrade to Plus.';
  end if;
  -- Release this anonymous reservation before inserting the identified member.
  -- The existing member trigger enforces sharing, oldest-book and seat limits;
  -- any failure rolls back consumption together with membership insertion.
  update public.book_invitation_links set accepted_by = recipient, accepted_at = clock_timestamp()
    where id = invitation.id;
  insert into public.book_members(book_id, user_id, role) values (target_book, recipient, invitation.role);
  return target_book;
end;
$$;

revoke all on function public.create_book_invitation_link(uuid, text) from public, anon;
revoke all on function public.cancel_book_invitation_link(uuid) from public, anon;
revoke all on function public.accept_book_invitation_link(text) from public, anon;
grant execute on function public.create_book_invitation_link(uuid, text) to authenticated;
grant execute on function public.cancel_book_invitation_link(uuid) to authenticated;
grant execute on function public.accept_book_invitation_link(text) to authenticated;
