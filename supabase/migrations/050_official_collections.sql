-- Official collections expose a deliberately limited reading surface. Readers
-- are not family cookbook members and never gain access to private family data.
begin;

create table public.official_collections (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null unique references public.recipe_books(id) on delete cascade,
  slug text not null unique check (char_length(slug) between 3 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null check (char_length(trim(description)) between 1 and 2000),
  cover_style text not null check (cover_style ~ '^#[0-9A-Fa-f]{6}$'),
  publisher_id uuid not null references public.profiles(id) on delete cascade,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.official_collection_readers (
  collection_id uuid not null references public.official_collections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(collection_id, user_id)
);
create index official_collection_readers_user_idx on public.official_collection_readers(user_id, created_at desc);
alter table public.official_collections enable row level security;
alter table public.official_collection_readers enable row level security;
-- Official metadata is available only through the explicit preview/library RPCs.
-- Configuration is service-only; an admin's identity is checked by server code.
revoke all on public.official_collections from anon, authenticated;
revoke all on public.official_collection_readers from anon, authenticated;
grant select, delete on public.official_collection_readers to authenticated;
grant all on public.official_collections, public.official_collection_readers to service_role;
create policy "official readers: read own" on public.official_collection_readers
  for select to authenticated using (user_id = auth.uid());
create policy "official readers: remove own" on public.official_collection_readers
  for delete to authenticated using (user_id = auth.uid());

-- Serialize designation with membership and invitation mutations. Existing
-- sharing records are never silently removed by publication.
create function public.guard_official_collection_source()
returns trigger language plpgsql security definer set search_path = '' as $$
declare source_book uuid; publisher uuid;
begin
  if tg_table_name = 'recipe_books' then
    if new.owner_id is distinct from old.owner_id
      and exists(select 1 from public.official_collections c where c.book_id = old.id) then
      raise exception 'Remove the official collection designation before transferring cookbook ownership.' using errcode = '42501';
    end if;
    return new;
  end if;
  source_book := new.book_id;
  perform 1 from public.recipe_books where id = source_book for update;
  select c.publisher_id into publisher from public.official_collections c where c.book_id = source_book;
  if publisher is null then return new; end if;
  if tg_table_name = 'book_members' then
    if new.user_id <> publisher then
      raise exception 'Official collections are maintained by their owner. Readers add the collection through its public link.' using errcode = '42501';
    end if;
  elsif tg_table_name = 'book_invitations' then
    if new.accepted_at is null and new.expires_at > now() then
      raise exception 'Use the official collection link instead of family invitations.' using errcode = '42501';
    end if;
  elsif tg_table_name = 'book_invitation_links' then
    if new.accepted_at is null and new.cancelled_at is null and new.expires_at > now() then
      raise exception 'Use the official collection link instead of family invitations.' using errcode = '42501';
    end if;
  elsif tg_table_name = 'recipes' then
    if new.created_by <> publisher then
      raise exception 'Only owner-authored recipes may be included in an official collection.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_official_collection_source() from public, anon, authenticated;
create trigger official_source_owner before update of owner_id on public.recipe_books
  for each row execute function public.guard_official_collection_source();
create trigger official_source_members before insert or update on public.book_members
  for each row execute function public.guard_official_collection_source();
create trigger official_source_email_invitations before insert or update on public.book_invitations
  for each row execute function public.guard_official_collection_source();
create trigger official_source_link_invitations before insert or update on public.book_invitation_links
  for each row execute function public.guard_official_collection_source();
create trigger official_source_authorship before insert or update on public.recipes
  for each row execute function public.guard_official_collection_source();

create function public.configure_official_collection(
  actor_id uuid, target_book_id uuid, collection_slug text, collection_title text,
  collection_description text, collection_cover_style text, make_published boolean
) returns public.official_collections
language plpgsql security definer set search_path = '' as $$
declare source_owner uuid; configured public.official_collections;
begin
  select b.owner_id into source_owner from public.recipe_books b where b.id = target_book_id for update;
  if actor_id is null or source_owner is distinct from actor_id then
    raise exception 'You can only publish a cookbook you own.' using errcode = '42501';
  end if;
  -- Initial designation must also be safe: its guards apply to drafts. Existing
  -- collections can always be unpublished without waiting for source cleanup.
  if make_published or not exists(select 1 from public.official_collections c where c.book_id = target_book_id) then
    if exists(select 1 from public.book_members m where m.book_id = target_book_id and m.user_id <> actor_id) then
      raise exception 'Remove other cookbook members before publishing an official collection.' using errcode = '42501';
    end if;
    if exists(select 1 from public.book_invitations i where i.book_id = target_book_id and i.accepted_at is null and i.expires_at > now())
      or exists(select 1 from public.book_invitation_links l where l.book_id = target_book_id and l.accepted_at is null and l.cancelled_at is null and l.expires_at > now()) then
      raise exception 'Cancel pending family invitations before publishing an official collection.' using errcode = '42501';
    end if;
    if exists(select 1 from public.recipes r where r.book_id = target_book_id and r.created_by <> actor_id) then
      raise exception 'Only owner-authored recipes may be included in an official collection.' using errcode = '42501';
    end if;
  end if;
  insert into public.official_collections(book_id, slug, title, description, cover_style, publisher_id, published)
    values(target_book_id, trim(collection_slug), trim(collection_title), trim(collection_description), collection_cover_style, actor_id, make_published)
    on conflict(book_id) do update set slug = excluded.slug, title = excluded.title,
      description = excluded.description, cover_style = excluded.cover_style,
      publisher_id = excluded.publisher_id, published = excluded.published, updated_at = now()
    returning * into configured;
  insert into public.admin_actions(actor_id, action, target_type, target_id, summary, metadata)
    values(actor_id, 'configure_official_collection', 'cookbook', target_book_id::text,
      'Updated official collection publication settings.',
      jsonb_build_object('published', configured.published, 'collectionId', configured.id));
  return configured;
end;
$$;
revoke all on function public.configure_official_collection(uuid, uuid, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.configure_official_collection(uuid, uuid, text, text, text, text, boolean) to service_role;

create function public.official_collection_preview(collection_slug text)
returns table(id uuid, slug text, title text, description text, cover_style text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.slug, c.title, c.description, c.cover_style
  from public.official_collections c join public.recipe_books b on b.id = c.book_id and b.owner_id = c.publisher_id
  where c.slug = collection_slug and c.published;
$$;
revoke all on function public.official_collection_preview(text) from public;
grant execute on function public.official_collection_preview(text) to anon, authenticated;

create function public.official_collection_library()
returns table(id uuid, slug text, title text, description text, cover_style text, published boolean, recipe_count bigint)
language sql stable security definer set search_path = '' as $$
  select c.id, c.slug, c.title, c.description, c.cover_style,
    c.published and b.owner_id = c.publisher_id,
    case when c.published and b.owner_id = c.publisher_id then
      (select count(*) from public.recipes r where r.book_id = c.book_id and not r.moderation_hidden)
    else 0::bigint end
  from public.official_collection_readers reader
  join public.official_collections c on c.id = reader.collection_id
  join public.recipe_books b on b.id = c.book_id
  where reader.user_id = auth.uid()
  order by reader.created_at desc, c.id;
$$;
revoke all on function public.official_collection_library() from public, anon;
grant execute on function public.official_collection_library() to authenticated;

create function public.join_official_collection(target_collection_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare collection_book uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in to add this collection.' using errcode = '42501'; end if;
  -- Lock the collection so unpublication and joining have an explicit order.
  select c.book_id into collection_book from public.official_collections c
    join public.recipe_books b on b.id = c.book_id and b.owner_id = c.publisher_id
    where c.id = target_collection_id and c.published for share of c;
  if not found then raise exception 'This collection is no longer available.' using errcode = '42501'; end if;
  insert into public.official_collection_readers(collection_id, user_id)
    values(target_collection_id, auth.uid()) on conflict do nothing;
end;
$$;
revoke all on function public.join_official_collection(uuid) from public, anon;
grant execute on function public.join_official_collection(uuid) to authenticated;

-- This private helper centralizes authorization without modifying ordinary
-- cookbook membership or the access granted by existing family-table policies.
create function public.official_collection_readable_book(target_collection_id uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare source_book uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in to read this collection.' using errcode = '42501'; end if;
  select c.book_id into source_book from public.official_collections c
    join public.recipe_books b on b.id = c.book_id and b.owner_id = c.publisher_id
    join public.official_collection_readers reader on reader.collection_id = c.id and reader.user_id = auth.uid()
    where c.id = target_collection_id and c.published;
  if not found then raise exception 'Add this available collection to your library before reading it.' using errcode = '42501'; end if;
  return source_book;
end;
$$;
revoke all on function public.official_collection_readable_book(uuid) from public, anon, authenticated;

create function public.official_collection_recipes(target_collection_id uuid, search_query text default '', page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare source_book uuid; result jsonb; total bigint;
begin
  source_book := public.official_collection_readable_book(target_collection_id);
  if page_number is null or page_number < 0 or page_number > 1000000 or char_length(coalesce(search_query, '')) > 200 then
    raise exception 'Choose a valid recipe search and page.' using errcode = '22023';
  end if;
  select count(*) into total from public.recipes r
    where r.book_id = source_book and not r.moderation_hidden
      and (coalesce(trim(search_query), '') = '' or strpos(lower(r.title), lower(trim(search_query))) > 0);
  select coalesce(jsonb_agg(to_jsonb(page) order by page.title, page.id), '[]'::jsonb) into result from (
    select r.id, r.title, r.description, r.prep_minutes, r.cook_minutes, r.servings,
      cat.name as category_name, (r.photo_url is not null and r.photo_url <> '') as has_photo
    from public.recipes r
    left join public.book_categories cat on cat.id = r.category_id and cat.book_id = r.book_id
    where r.book_id = source_book and not r.moderation_hidden
      and (coalesce(trim(search_query), '') = '' or strpos(lower(r.title), lower(trim(search_query))) > 0)
    order by r.title, r.id limit 24 offset page_number * 24
  ) page;
  return jsonb_build_object('recipes', result, 'total', total);
end;
$$;

create function public.official_collection_recipe(target_collection_id uuid, target_recipe_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare source_book uuid; result jsonb;
begin
  source_book := public.official_collection_readable_book(target_collection_id);
  select jsonb_build_object('id', r.id, 'title', r.title, 'description', r.description,
    'prep_minutes', r.prep_minutes, 'cook_minutes', r.cook_minutes, 'servings', r.servings,
    'category_name', cat.name, 'has_photo', r.photo_url is not null and r.photo_url <> '',
    'ingredients', (select coalesce(jsonb_agg(jsonb_build_object('quantity', i.quantity, 'unit', i.unit,
      'item', i.item, 'note', i.note, 'group_label', i.group_label, 'position', i.position) order by i.position, i.id), '[]'::jsonb)
      from public.recipe_ingredients i where i.recipe_id = r.id),
    'instructions', (select coalesce(jsonb_agg(jsonb_build_object('body', i.body, 'group_label', i.group_label, 'position', i.position) order by i.position, i.id), '[]'::jsonb)
      from public.recipe_instructions i where i.recipe_id = r.id)) into result
  from public.recipes r
  left join public.book_categories cat on cat.id = r.category_id and cat.book_id = r.book_id
  where r.id = target_recipe_id and r.book_id = source_book and not r.moderation_hidden;
  return result;
end;
$$;

create function public.official_collection_photo(target_collection_id uuid, target_recipe_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare source_book uuid; result text;
begin
  source_book := public.official_collection_readable_book(target_collection_id);
  select r.photo_url into result from public.recipes r
    where r.id = target_recipe_id and r.book_id = source_book and not r.moderation_hidden;
  return result;
end;
$$;
revoke all on function public.official_collection_recipes(uuid, text, integer) from public, anon;
revoke all on function public.official_collection_recipe(uuid, uuid) from public, anon;
revoke all on function public.official_collection_photo(uuid, uuid) from public, anon;
grant execute on function public.official_collection_recipes(uuid, text, integer) to authenticated;
grant execute on function public.official_collection_recipe(uuid, uuid) to authenticated;
grant execute on function public.official_collection_photo(uuid, uuid) to authenticated;

commit;
