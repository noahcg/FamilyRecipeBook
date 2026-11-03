-- The selection belongs to the account, not to a shared cookbook.
alter table public.user_settings
  add column home_recipe_id uuid references public.recipes(id) on delete set null;

-- Existing user_settings policies restrict reads and writes to auth.uid().
