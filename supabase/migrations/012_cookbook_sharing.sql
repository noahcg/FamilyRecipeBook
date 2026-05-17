alter table public.recipe_books
  add column if not exists sharing_enabled boolean not null default false;

update public.recipe_books rb
set sharing_enabled = true
where sharing_enabled = false
  and (
    exists (
      select 1
      from public.book_members bm
      where bm.book_id = rb.id
        and bm.role <> 'keeper'
    )
    or exists (
      select 1
      from public.book_invitations bi
      where bi.book_id = rb.id
        and bi.accepted_at is null
        and bi.expires_at >= now()
    )
  );
