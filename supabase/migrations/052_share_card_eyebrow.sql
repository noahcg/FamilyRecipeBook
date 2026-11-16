-- Existing cookbooks retain their current social-card appearance. The existing
-- recipe_books keeper update policy controls changes to this setting.
alter table public.recipe_books
  add column share_card_show_eyebrow boolean not null default true;
