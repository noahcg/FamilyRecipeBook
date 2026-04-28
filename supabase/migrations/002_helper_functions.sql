-- ─── Helper functions for RLS ─────────────────────────────────

create or replace function public.is_book_member(book_uuid uuid, user_uuid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.book_members
    where book_id = book_uuid and user_id = user_uuid
  );
$$;

create or replace function public.get_book_role(book_uuid uuid, user_uuid uuid)
returns text language sql security definer stable as $$
  select role from public.book_members
  where book_id = book_uuid and user_id = user_uuid
  limit 1;
$$;

create or replace function public.can_manage_book(book_uuid uuid, user_uuid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.book_members
    where book_id = book_uuid
      and user_id = user_uuid
      and role = 'keeper'
  );
$$;

create or replace function public.can_contribute_to_book(book_uuid uuid, user_uuid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.book_members
    where book_id = book_uuid
      and user_id = user_uuid
      and role in ('keeper', 'contributor')
  );
$$;
