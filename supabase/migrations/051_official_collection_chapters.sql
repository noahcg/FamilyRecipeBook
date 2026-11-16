-- Public collection previews may show the table of contents, but never recipe
-- titles, photos, family activity, or identifiers from the private source book.
create function public.official_collection_chapters(collection_slug text)
returns table(name text, recipe_count bigint)
language sql stable security definer set search_path = '' as $$
  with recipe_chapters as (
    select coalesce(nullif(trim(cat.name), ''), 'More recipes') as chapter_name,
      case when nullif(trim(cat.name), '') is not null then cat.position end as chapter_position
    from public.official_collections collection
    join public.recipe_books book on book.id = collection.book_id
      and book.owner_id = collection.publisher_id
    join public.recipes recipe on recipe.book_id = book.id and not recipe.moderation_hidden
    left join public.book_categories cat on cat.id = recipe.category_id and cat.book_id = book.id
    where collection.slug = collection_slug and collection.published
  )
  select chapter_name, count(*)
  from recipe_chapters
  group by chapter_name
  -- Recipes without a valid chapter come last. If the owner already has a
  -- chapter named "More recipes", merge the fallback into that chapter rather
  -- than exposing two indistinguishable headings.
  order by min(chapter_position) nulls last, chapter_name;
$$;

revoke all on function public.official_collection_chapters(text) from public, anon, authenticated;
grant execute on function public.official_collection_chapters(text) to anon, authenticated;
