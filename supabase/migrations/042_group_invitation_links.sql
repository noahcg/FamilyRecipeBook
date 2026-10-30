-- Existing bearer links retain their single-use and reservation semantics.
-- New group links remain valid until expiry or cancellation and reserve no seats.
alter table public.book_invitation_links add column link_type text not null default 'single'
  check (link_type in ('single', 'group'));

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
    where l.book_id = target_book_id and l.link_type = 'single' and l.accepted_at is null
      and l.cancelled_at is null and l.expires_at > now());
$$;

create or replace function public.create_book_invitation_link(target_book_id uuid, invitation_role text)
returns public.book_invitation_links language plpgsql security definer set search_path = '' as $$
declare invitation public.book_invitation_links; enabled boolean; contributor_invitations boolean; book_owner uuid;
begin
  if auth.uid() is null or not public.can_invite_to_book(target_book_id, auth.uid()) then
    raise exception 'You do not have permission to invite people to this cookbook.';
  end if;
  if invitation_role is null or invitation_role not in ('family', 'contributor') then
    raise exception 'Choose Family or Contributor access.';
  end if;
  -- Use the same cookbook-first lock order as email invitation acceptance.
  select sharing_enabled, contributors_can_invite, owner_id into enabled, contributor_invitations, book_owner
    from public.recipe_books where id = target_book_id for update;
  if not (public.can_manage_book(target_book_id, auth.uid()) or (contributor_invitations and public.can_contribute_to_book(target_book_id, auth.uid()))) then
    raise exception 'You do not have permission to invite people to this cookbook.';
  end if;
  if not public.account_can_upload(auth.uid()) then
    raise exception 'Invitation creation is unavailable for this account.';
  end if;
  if not coalesce(enabled, false) then
    raise exception 'Turn on sharing for this cookbook before inviting members.';
  end if;
  -- Freeze the entitlement while checking invitation permissions.
  perform 1 from public.billing_accounts where user_id = book_owner for share;
  if not public.book_owner_has_plus(target_book_id) then
    if not public.is_free_sharing_book(target_book_id) then
      raise exception 'Free sharing is available on your oldest cookbook. Upgrade to Plus to invite people to this book.';
    end if;
    if invitation_role <> 'family' then
      raise exception 'Free cookbooks can invite Family members only. The cookbook owner can upgrade to Plus to invite Contributors.';
    end if;
  end if;
  insert into public.book_invitation_links(book_id, role, invited_by, link_type)
    values (target_book_id, invitation_role, auth.uid(), 'group') returning * into invitation;
  return invitation;
end;
$$;


create or replace function public.accept_book_invitation_link(invitation_token text)
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
    if invitation.link_type = 'group' then return target_book; end if;
    raise exception 'You are already a member of this cookbook. This invitation is still available for someone else.';
  end if;
  perform 1 from public.billing_accounts where user_id = book_owner for share;
  if not public.book_owner_has_plus(target_book) and invitation.role <> 'family' then
    raise exception 'This Contributor invitation needs Plus. Ask the keeper to send a Family invitation or upgrade to Plus.';
  end if;
  -- Legacy single-use links release their reservation; group links reserve no
  -- seats. The member trigger checks the current allowance under the book lock.
  if invitation.link_type = 'single' then
    update public.book_invitation_links set accepted_by = recipient, accepted_at = clock_timestamp()
      where id = invitation.id;
  end if;
  insert into public.book_members(book_id, user_id, role) values (target_book, recipient, invitation.role);
  return target_book;
end;
$$;

