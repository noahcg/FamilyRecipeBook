-- ─── Grocery meal-plan day labels ────────────────────────────
-- Opt-in, per-user preference: when on, ingredients imported from
-- the meal plan are tagged with the weekday(s) they were planned
-- for (e.g. {Monday,Thursday}), shown as a small badge on the list.
-- Both columns live on existing tables, so no new GRANTs are needed.

alter table public.user_settings
  add column if not exists grocery_meal_day_labels boolean not null default false;

-- Full weekday names (Monday..Sunday) for the meals this item came from.
alter table public.grocery_items
  add column if not exists meal_days text[];
