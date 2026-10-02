-- One authenticated transaction protects a recipe and its complete child lists.
-- SECURITY INVOKER retains every existing RLS policy and entitlement trigger.
begin;
create function public.save_recipe_atomic(
  p_book_id uuid,
  p_recipe_id uuid,
  p_fields jsonb,
  p_ingredients jsonb default null,
  p_instructions jsonb default null
) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  payload public.recipes;
  saved public.recipes;
  category_json jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if jsonb_typeof(p_fields) is distinct from 'object' then raise exception 'Invalid recipe fields' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(p_fields) k where k <> all(array['title', 'description', 'photo_url', 'source_name', 'story', 'prep_minutes', 'cook_minutes', 'servings', 'tags', 'import_method', 'source_url', 'import_source', 'import_metadata', 'nutrition', 'photo_source', 'photo_author', 'photo_author_url', 'photo_source_url', 'category_id'])) then
    raise exception 'Unsupported recipe field' using errcode='22023';
  end if;
  if p_ingredients is not null and jsonb_typeof(p_ingredients) <> 'array'
    or p_instructions is not null and jsonb_typeof(p_instructions) <> 'array' then
    raise exception 'Invalid recipe children' using errcode='22023';
  end if;
  if p_recipe_id is null then
    payload := jsonb_populate_record(null::public.recipes, jsonb_build_object('tags','[]'::jsonb,'import_metadata','{}'::jsonb,'nutrition','{}'::jsonb) || p_fields);
  else
    select * into saved from public.recipes where id=p_recipe_id and book_id=p_book_id for update;
    if not found then raise exception 'Recipe unavailable in this cookbook' using errcode='42501'; end if;
    payload := jsonb_populate_record(saved,p_fields);
  end if;
  if payload.category_id is not null and not exists(select 1 from public.book_categories where id=payload.category_id and book_id=p_book_id) then
    raise exception 'Category unavailable in this cookbook' using errcode='42501';
  end if;
  if p_recipe_id is null then
    insert into public.recipes(book_id,created_by,title, description, photo_url, source_name, story, prep_minutes, cook_minutes, servings, tags, import_method, source_url, import_source, import_metadata, nutrition, photo_source, photo_author, photo_author_url, photo_source_url, category_id)
      values(p_book_id,auth.uid(),payload.title, payload.description, payload.photo_url, payload.source_name, payload.story, payload.prep_minutes, payload.cook_minutes, payload.servings, payload.tags, payload.import_method, payload.source_url, payload.import_source, payload.import_metadata, payload.nutrition, payload.photo_source, payload.photo_author, payload.photo_author_url, payload.photo_source_url, payload.category_id) returning * into saved;
  else
    update public.recipes set
      title=payload.title,
      description=payload.description,
      photo_url=payload.photo_url,
      source_name=payload.source_name,
      story=payload.story,
      prep_minutes=payload.prep_minutes,
      cook_minutes=payload.cook_minutes,
      servings=payload.servings,
      tags=payload.tags,
      import_method=payload.import_method,
      source_url=payload.source_url,
      import_source=payload.import_source,
      import_metadata=payload.import_metadata,
      nutrition=payload.nutrition,
      photo_source=payload.photo_source,
      photo_author=payload.photo_author,
      photo_author_url=payload.photo_author_url,
      photo_source_url=payload.photo_source_url,
      category_id=payload.category_id, updated_at=now()
      where id=p_recipe_id and book_id=p_book_id returning * into saved;
    if not found then raise exception 'Recipe cannot be edited' using errcode='42501'; end if;
  end if;
  if p_ingredients is not null then
    delete from public.recipe_ingredients where recipe_id=saved.id;
    insert into public.recipe_ingredients(recipe_id,position,quantity,unit,item,note,group_label)
      select saved.id,ordinality::integer,entry->>'quantity',entry->>'unit',entry->>'item',entry->>'note',entry->>'group_label'
      from jsonb_array_elements(p_ingredients) with ordinality as children(entry,ordinality);
  end if;
  if p_instructions is not null then
    delete from public.recipe_instructions where recipe_id=saved.id;
    insert into public.recipe_instructions(recipe_id,position,body)
      select saved.id,ordinality::integer,entry->>'body'
      from jsonb_array_elements(p_instructions) with ordinality as children(entry,ordinality);
  end if;
  select jsonb_build_object('id',id,'name',name) into category_json from public.book_categories where id=saved.category_id;
  return to_jsonb(saved) || jsonb_build_object('category',category_json);
end;
$$;
revoke all on function public.save_recipe_atomic(uuid,uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_recipe_atomic(uuid,uuid,jsonb,jsonb,jsonb) to authenticated;
commit;
