-- Optional sub-group label for ingredients (e.g. "For the sauce").
-- Groups are contiguous runs of the same group_label in position order;
-- null means the ingredient is ungrouped (the common case).
alter table public.recipe_ingredients
  add column if not exists group_label text;
