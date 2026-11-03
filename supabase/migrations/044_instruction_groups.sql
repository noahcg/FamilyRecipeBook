-- One authenticated transaction protects a recipe and its complete child lists.
-- SECURITY INVOKER retains every existing RLS policy and entitlement trigger.
begin;
alter table public.recipe_instructions add column group_label text check (char_length(group_label) <= 100);
create or replace function public.save_recipe_atomic(
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
    insert into public.recipe_instructions(recipe_id,position,body,group_label)
      select saved.id,ordinality::integer,entry->>'body',nullif(trim(entry->>'group_label'),'')
      from jsonb_array_elements(p_instructions) with ordinality as children(entry,ordinality);
  end if;
  select jsonb_build_object('id',id,'name',name) into category_json from public.book_categories where id=saved.category_id;
  return to_jsonb(saved) || jsonb_build_object('category',category_json);
end;
$$;
revoke all on function public.save_recipe_atomic(uuid,uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_recipe_atomic(uuid,uuid,jsonb,jsonb,jsonb) to authenticated;
create or replace function public.copy_recipe_atomic(p_source_book_id uuid,p_recipe_id uuid,p_target_book_id uuid,p_category_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  source public.recipes;
  copied jsonb;
  copied_id uuid;
  ingredients jsonb;
  instructions jsonb;
begin
  if auth.uid() is null or p_source_book_id=p_target_book_id then
    raise exception 'Invalid recipe copy' using errcode='42501';
  end if;
  -- Keep membership removals and primary recipe edits from racing the snapshot.
  perform 1 from public.book_members where user_id=auth.uid()
    and book_id in (p_source_book_id,p_target_book_id) for share;
  if not public.is_book_member(p_source_book_id,auth.uid())
    or not public.can_contribute_to_book(p_target_book_id,auth.uid())
    or not public.account_can_upload(auth.uid()) then
    raise exception 'Recipe copy not permitted' using errcode='42501';
  end if;
  select * into source from public.recipes where id=p_recipe_id
    and book_id=p_source_book_id and not moderation_hidden for share;
  if not found then raise exception 'Recipe unavailable' using errcode='42501'; end if;
  if p_category_id is not null and not exists(select 1 from public.book_categories where id=p_category_id and book_id=p_target_book_id) then
    raise exception 'Category unavailable in destination' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('quantity',quantity,'unit',unit,'item',item,'note',note,'group_label',group_label) order by position),'[]'::jsonb)
    into ingredients from public.recipe_ingredients where recipe_id=source.id;
  select coalesce(jsonb_agg(jsonb_build_object('body',body,'group_label',group_label) order by position),'[]'::jsonb)
    into instructions from public.recipe_instructions where recipe_id=source.id;
  -- save_recipe_atomic still executes entitlement/ID/media triggers. Its
  -- definer context is intentional here; the authorization checks above are
  -- complete and the copied data comes exclusively from the authorized source.
  copied := public.save_recipe_atomic(p_target_book_id,null,
    jsonb_build_object('title',source.title,'description',source.description,
      'photo_url',source.photo_url,'photo_source',source.photo_source,'photo_author',source.photo_author,
      'photo_author_url',source.photo_author_url,'photo_source_url',source.photo_source_url,
      'source_name',source.source_name,'story',source.story,'prep_minutes',source.prep_minutes,
      'cook_minutes',source.cook_minutes,'servings',source.servings,'category_id',p_category_id,
      'tags',coalesce(source.tags,'{}'::text[])),ingredients,instructions);
  copied_id := (copied->>'id')::uuid;
  insert into public.recipe_stories(recipe_id,author_id,body,created_at)
    select copied_id,author_id,body,created_at from public.recipe_stories where recipe_id=source.id and not moderation_hidden;
  insert into public.recipe_reactions(recipe_id,user_id,type,created_at)
    select copied_id,user_id,type,created_at from public.recipe_reactions where recipe_id=source.id;
  insert into public.recipe_ratings(recipe_id,user_id,rating,created_at)
    select copied_id,user_id,rating,created_at from public.recipe_ratings where recipe_id=source.id;
  insert into public.activity_events(book_id,recipe_id,actor_id,type,metadata)
    values(p_target_book_id,copied_id,auth.uid(),'recipe_created',jsonb_build_object('recipe_title',source.title,'copied_from',p_source_book_id));
  return copied;
end;
$$;
revoke all on function public.copy_recipe_atomic(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.copy_recipe_atomic(uuid,uuid,uuid,uuid) to authenticated;

commit;
