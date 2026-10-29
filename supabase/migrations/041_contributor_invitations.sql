-- Existing cookbooks remain Keeper-only until the Keeper opts in.
alter table public.recipe_books add column contributors_can_invite boolean not null default false;

create function public.can_invite_to_book(target_book_id uuid, target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select target_user_id = auth.uid() and (public.can_manage_book(target_book_id, target_user_id) or exists (
    select 1 from public.book_members m join public.recipe_books b on b.id = m.book_id
    where m.book_id = target_book_id and m.user_id = target_user_id
      and m.role = 'contributor' and b.contributors_can_invite
  ));
$$;
revoke all on function public.can_invite_to_book(uuid, uuid) from public, anon;
grant execute on function public.can_invite_to_book(uuid, uuid) to authenticated;

drop policy "book_invitations: insert if keeper and unrestricted" on public.book_invitations;
create policy "book_invitations: insert if authorized and unrestricted" on public.book_invitations
  for insert to authenticated with check (invited_by = auth.uid() and public.account_can_upload(auth.uid()) and public.can_invite_to_book(book_id, auth.uid()));
-- INSERT ... RETURNING needs read access to the creator's own invitation.
create policy "book_invitations: read own if authorized" on public.book_invitations
  for select to authenticated using (invited_by = auth.uid() and public.can_invite_to_book(book_id, auth.uid()));

create or replace function public.get_book_sharing_allowance(target_book_id uuid)
returns table (is_free boolean, used integer, seat_limit integer, remaining integer, can_share boolean)
language plpgsql security definer set search_path = '' as $$
declare free_plan boolean; seats integer;
begin
  if auth.uid() is null or not public.can_invite_to_book(target_book_id, auth.uid()) then
    raise exception 'You do not have permission to invite people to this cookbook.';
  end if;
  free_plan := not public.book_owner_has_plus(target_book_id);
  seats := public.book_sharing_seats(target_book_id);
  return query select free_plan, seats, case when free_plan then 3 else null::integer end,
    case when free_plan then greatest(3 - seats, 0) else null::integer end,
    not free_plan or public.is_free_sharing_book(target_book_id);
end;
$$;

create or replace function public.enforce_book_invitation_sharing()
returns trigger language plpgsql security definer set search_path = '' as $$
declare enabled boolean; contributor_invitations boolean;
begin
  if tg_op = 'UPDATE' then
    if new.book_id <> old.book_id or new.email <> old.email then
      raise exception 'Create a new invitation to change its cookbook or recipient.';
    end if;
    -- Acceptance/expiration only frees a reservation; do not reject historical
    -- contributor invitations when they are consumed after a downgrade.
    if new.accepted_at is not null or new.expires_at <= now() then return new; end if;
  end if;
  select sharing_enabled, contributors_can_invite into enabled, contributor_invitations from public.recipe_books where id = new.book_id for update;
  if tg_op = 'INSERT' and auth.uid() is not null and (new.invited_by <> auth.uid() or not (public.can_manage_book(new.book_id, auth.uid()) or (contributor_invitations and public.can_contribute_to_book(new.book_id, auth.uid())))) then
    raise exception 'You do not have permission to invite people to this cookbook.';
  end if;
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

