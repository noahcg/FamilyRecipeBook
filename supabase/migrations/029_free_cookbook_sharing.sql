-- Free cookbook owners may share with three other people, with Family access.
-- Existing memberships survive a downgrade. New invitations/members and role
-- changes are checked against the owner's current entitlement, including grants.
-- Row locks serialize invitation creation and acceptance for each cookbook.

create or replace function public.book_owner_has_plus(target_book_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select ba.grandfathered_plus or ba.status in ('active', 'trialing')
    from public.recipe_books b join public.billing_accounts ba on ba.user_id = b.owner_id
    where b.id = target_book_id
  ), false);
$$;

-- After a downgrade, keep access to all existing books, but allow new Free
-- sharing only on the owner's oldest cookbook (a deterministic single book).
create or replace function public.is_free_sharing_book(target_book_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select target_book_id = (
    select b.id from public.recipe_books b
    where b.owner_id = (select owner_id from public.recipe_books where id = target_book_id)
    order by b.created_at asc nulls last, b.id asc limit 1
  );
$$;
revoke all on function public.is_free_sharing_book(uuid) from public, anon, authenticated;

-- Count people, not invitation rows. A pending invitation to an existing member
-- or a duplicate invitation to the same normalized email does not consume a seat.
create or replace function public.book_sharing_seats(target_book_id uuid)
returns integer language sql volatile security definer set search_path = '' as $$
  select count(*)::integer from (
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
  ) people;
$$;

revoke all on function public.book_owner_has_plus(uuid) from public, anon, authenticated;
revoke all on function public.book_sharing_seats(uuid) from public, anon, authenticated;

create or replace function public.get_book_sharing_allowance(target_book_id uuid)
returns table (is_free boolean, used integer, seat_limit integer, remaining integer, can_share boolean)
language plpgsql security definer set search_path = '' as $$
declare free_plan boolean; seats integer;
begin
  if auth.uid() is null or not public.can_manage_book(target_book_id, auth.uid()) then
    raise exception 'Only the keeper can view sharing limits.';
  end if;
  free_plan := not public.book_owner_has_plus(target_book_id);
  seats := public.book_sharing_seats(target_book_id);
  return query select free_plan, seats, case when free_plan then 3 else null::integer end,
    case when free_plan then greatest(3 - seats, 0) else null::integer end,
    not free_plan or public.is_free_sharing_book(target_book_id);
end;
$$;
revoke all on function public.get_book_sharing_allowance(uuid) from public, anon;
grant execute on function public.get_book_sharing_allowance(uuid) to authenticated;

create or replace function public.enforce_book_invitation_sharing()
returns trigger language plpgsql security definer set search_path = '' as $$
declare enabled boolean;
begin
  if tg_op = 'UPDATE' then
    if new.book_id <> old.book_id or new.email <> old.email then
      raise exception 'Create a new invitation to change its cookbook or recipient.';
    end if;
    -- Acceptance/expiration only frees a reservation; do not reject historical
    -- contributor invitations when they are consumed after a downgrade.
    if new.accepted_at is not null or new.expires_at <= now() then return new; end if;
  end if;
  select sharing_enabled into enabled from public.recipe_books where id = new.book_id for update;
  if not coalesce(enabled, false) then
    raise exception 'Turn on sharing for this cookbook before inviting members.';
  end if;
  if not public.book_owner_has_plus(new.book_id) then
    if not public.is_free_sharing_book(new.book_id) then
      raise exception 'Free sharing is available on your oldest cookbook. Existing members keep access to your other cookbooks. Upgrade to Plus to invite more people to those books.';
    end if;
    if new.role <> 'family' then
      raise exception 'Free cookbooks can invite Family members only. The cookbook owner can upgrade to Plus to invite Contributors.';
    end if;
    if public.book_sharing_seats(new.book_id) > 3 then
      raise exception 'This cookbook has used its 3 free sharing spots. Cancel a pending invitation, remove a member, or ask the owner to upgrade to Plus.';
    end if;
  end if;
  return new;
end;
$$;
create trigger enforce_book_invitation_sharing after insert or update on public.book_invitations
  for each row execute function public.enforce_book_invitation_sharing();

create or replace function public.enforce_book_member_sharing()
returns trigger language plpgsql security definer set search_path = '' as $$
declare book_owner uuid; enabled boolean;
begin
  if tg_op = 'UPDATE' then
    if new.book_id <> old.book_id or new.user_id <> old.user_id then
      raise exception 'Membership cannot be moved to another cookbook or person.';
    end if;
    if new.role = old.role then return new; end if;
  end if;
  select owner_id, sharing_enabled into book_owner, enabled from public.recipe_books where id = new.book_id for update;
  if new.user_id = book_owner then
    if new.role <> 'keeper' then raise exception 'The cookbook owner must remain its keeper.'; end if;
    return new;
  end if;
  if tg_op = 'INSERT' and not coalesce(enabled, false) then
    raise exception 'Sharing is turned off for this cookbook. Ask the keeper to turn it on before joining.';
  end if;
  if not public.book_owner_has_plus(new.book_id) then
    if tg_op = 'INSERT' and not public.is_free_sharing_book(new.book_id) then
      raise exception 'Free sharing is available on the owner’s oldest cookbook. Ask the owner to upgrade to Plus to invite more people to this book.';
    end if;
    if new.role <> 'family' then
      raise exception 'Free cookbooks can invite Family members only. The cookbook owner can upgrade to Plus to invite Contributors.';
    end if;
    if tg_op = 'INSERT' and public.book_sharing_seats(new.book_id) > 3 then
      raise exception 'This cookbook has used its 3 free sharing spots. Ask the keeper to free a spot or upgrade to Plus.';
    end if;
  end if;
  return new;
end;
$$;
create trigger enforce_book_member_sharing after insert or update on public.book_members
  for each row execute function public.enforce_book_member_sharing();

-- Acceptance authenticates the recipient inside the database and commits the
-- membership and invitation together. Existing membership roles never change.
create or replace function public.accept_book_invitation(invitation_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invite public.book_invitations%rowtype; recipient uuid; recipient_email text; enabled boolean;
begin
  recipient := auth.uid();
  if recipient is null then raise exception 'Please sign in or create an account to accept this invitation.'; end if;
  select email into recipient_email from auth.users where id = recipient;
  select * into invite from public.book_invitations where token = invitation_token;
  if not found or invite.accepted_at is not null or invite.expires_at <= now() then
    raise exception 'This invitation is invalid or has expired.';
  end if;
  if recipient_email is null or lower(trim(recipient_email)) <> lower(trim(invite.email)) then
    raise exception 'Sign in with the email address this invitation was sent to.';
  end if;
  -- Always acquire the cookbook lock before the invitation lock. Re-read after
  -- waiting so cancellation, concurrent acceptance, and edits cannot go stale.
  select sharing_enabled into enabled from public.recipe_books where id = invite.book_id for update;
  select * into invite from public.book_invitations where token = invitation_token for update;
  if not found or invite.accepted_at is not null or invite.expires_at <= now() then
    raise exception 'This invitation is invalid or has expired.';
  end if;
  if not coalesce(enabled, false) then
    raise exception 'Sharing is turned off for this cookbook. Ask the keeper to turn it on before joining.';
  end if;
  if not exists (select 1 from public.book_members where book_id = invite.book_id and user_id = recipient) then
    if not public.book_owner_has_plus(invite.book_id) and invite.role <> 'family' then
      raise exception 'This Contributor invitation needs Plus. Ask the keeper to send a Family invitation or upgrade to Plus.';
    end if;
    insert into public.book_members(book_id, user_id, role) values (invite.book_id, recipient, invite.role);
  end if;
  update public.book_invitations set accepted_by = recipient, accepted_at = now() where id = invite.id;
  return invite.book_id;
end;
$$;
revoke all on function public.accept_book_invitation(text) from public, anon;
grant execute on function public.accept_book_invitation(text) to authenticated;

-- Invitees accept through the narrow RPC; direct updates remain keeper-only.
drop policy if exists "book_invitations: update to accept" on public.book_invitations;
create policy "book_invitations: update if keeper" on public.book_invitations
  for update using (public.can_manage_book(book_id, auth.uid()))
  with check (public.can_manage_book(book_id, auth.uid()));

-- Keeper update policies cover cookbook metadata, not ownership transfers or
-- changing which cookbook qualifies for Free sharing. These identities have no
-- user-facing edit workflow; trusted service maintenance remains possible.
create or replace function public.protect_cookbook_sharing_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and
    (new.owner_id is distinct from old.owner_id or new.created_at is distinct from old.created_at) then
    raise exception 'Cookbook ownership and creation date cannot be changed.';
  end if;
  return new;
end;
$$;
create trigger protect_cookbook_sharing_identity before update on public.recipe_books
  for each row execute function public.protect_cookbook_sharing_identity();

