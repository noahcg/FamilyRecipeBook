-- A distinct entry point prevents older save functions from silently discarding
-- instruction headings when application code is deployed before migration 044.
create function public.save_recipe_with_instruction_groups(
  p_book_id uuid,
  p_recipe_id uuid,
  p_fields jsonb,
  p_ingredients jsonb default null,
  p_instructions jsonb default null
) returns jsonb
language sql security invoker set search_path = pg_catalog, public as $$
  select public.save_recipe_atomic(p_book_id, p_recipe_id, p_fields, p_ingredients, p_instructions);
$$;
revoke all on function public.save_recipe_with_instruction_groups(uuid,uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_recipe_with_instruction_groups(uuid,uuid,jsonb,jsonb,jsonb) to authenticated;
