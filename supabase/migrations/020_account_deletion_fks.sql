-- 020_account_deletion_fks.sql
--
-- Enables self-serve account deletion. Deleting a Supabase auth user cascades to
-- public.profiles (profiles.id references auth.users on delete cascade), but
-- several tables reference profiles(id) with the default NO ACTION rule. If the
-- user has contributed to anyone else's cookbook/household, auth.admin.deleteUser
-- fails with a foreign-key violation.
--
-- Here we re-point those FKs so a profile delete cleanly cascades:
--   * NOT NULL author/creator columns  -> ON DELETE CASCADE (remove the row)
--   * nullable audit columns           -> ON DELETE SET NULL (keep the row)
--
-- Constraints created inline in earlier migrations use the default
-- <table>_<column>_fkey names.

-- recipes.created_by (NOT NULL) -> cascade
alter table public.recipes
  drop constraint recipes_created_by_fkey,
  add constraint recipes_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete cascade;

-- recipe_stories.author_id (NOT NULL) -> cascade
alter table public.recipe_stories
  drop constraint recipe_stories_author_id_fkey,
  add constraint recipe_stories_author_id_fkey
    foreign key (author_id) references public.profiles(id) on delete cascade;

-- collections.created_by (NOT NULL) -> cascade
alter table public.collections
  drop constraint collections_created_by_fkey,
  add constraint collections_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete cascade;

-- book_invitations.invited_by (NOT NULL) -> cascade
alter table public.book_invitations
  drop constraint book_invitations_invited_by_fkey,
  add constraint book_invitations_invited_by_fkey
    foreign key (invited_by) references public.profiles(id) on delete cascade;

-- book_invitations.accepted_by (nullable) -> set null
alter table public.book_invitations
  drop constraint book_invitations_accepted_by_fkey,
  add constraint book_invitations_accepted_by_fkey
    foreign key (accepted_by) references public.profiles(id) on delete set null;

-- activity_events.actor_id (nullable) -> set null
alter table public.activity_events
  drop constraint activity_events_actor_id_fkey,
  add constraint activity_events_actor_id_fkey
    foreign key (actor_id) references public.profiles(id) on delete set null;

-- meal_plans.created_by (NOT NULL) -> cascade
alter table public.meal_plans
  drop constraint meal_plans_created_by_fkey,
  add constraint meal_plans_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete cascade;

-- grocery_items.created_by (NOT NULL) -> cascade
alter table public.grocery_items
  drop constraint grocery_items_created_by_fkey,
  add constraint grocery_items_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete cascade;
