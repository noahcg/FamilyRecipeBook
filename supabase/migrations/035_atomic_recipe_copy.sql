-- Authored collaboration data may be preserved only through this constrained
-- copy operation. Callers never supply another author's content or identity.
begin;
create function public.copy_recipe_atomic(p_source_book_id uuid,p_recipe_id uuid,p_target_book_id uuid,p_category_id uuid)
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
  select coalesce(jsonb_agg(jsonb_build_object('body',body) order by position),'[]'::jsonb)
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
-- Moving a recipe and dropping its source cookbook collection links is one
-- transaction. A narrow definer is necessary because source collection RLS
-- can no longer see the recipe after its cookbook changes. No callable API.
create function public.detach_moved_recipe_collections()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if new.book_id is distinct from old.book_id then
    delete from public.collection_recipes cr using public.collections c
      where cr.collection_id=c.id and cr.recipe_id=new.id and c.book_id=old.book_id;
  end if;
  return new;
end;
$$;
revoke all on function public.detach_moved_recipe_collections() from public,anon,authenticated;
create trigger detach_moved_recipe_collections after update of book_id on public.recipes
  for each row execute function public.detach_moved_recipe_collections();
commit;
