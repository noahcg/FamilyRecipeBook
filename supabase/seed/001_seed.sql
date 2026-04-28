-- ─── Dev seed data ────────────────────────────────────────────
-- Run after the schema migrations. Requires a real user account.
-- Replace 'YOUR_USER_UUID' with an actual UUID from auth.users.

-- Example usage:
-- psql $DATABASE_URL -f supabase/seed/001_seed.sql

do $$
declare
  owner_id   uuid := 'YOUR_USER_UUID'; -- replace with real user id
  book_id    uuid;
  recipe1    uuid;
  recipe2    uuid;
  recipe3    uuid;
  recipe4    uuid;
  recipe5    uuid;
  recipe6    uuid;
  col1       uuid;
  col2       uuid;
  col3       uuid;
  col4       uuid;
begin

-- Book
insert into public.recipe_books (id, title, description, cover_style, owner_id)
values (gen_random_uuid(), 'The Family Table', 'Our family''s most loved recipes and memories, all in one place.', 'sage', owner_id)
returning id into book_id;

-- Profiles for sample members (create as dummy entries — won't have auth.users rows)
-- In production these would come from real signups.

-- Recipe 1
insert into public.recipes
  (id, book_id, title, description, source_name, story, prep_minutes, cook_minutes, servings, category, created_by)
values (
  gen_random_uuid(),
  book_id,
  'Grandma''s Apple Pie',
  'A classic double-crust apple pie with cinnamon-spiced filling.',
  'Grandma Rose',
  'Grandma made this every Thanksgiving without fail. She never used a recipe — just feel and memory. I watched her make it a hundred times before I finally wrote it down.',
  30, 60, 8, 'Dessert', owner_id
) returning id into recipe1;

-- Recipe 1 ingredients
insert into public.recipe_ingredients (recipe_id, position, quantity, unit, item) values
  (recipe1, 1, '2', 'cups', 'all-purpose flour'),
  (recipe1, 2, '1', 'tsp', 'salt'),
  (recipe1, 3, '2/3', 'cup', 'butter, chilled'),
  (recipe1, 4, '6', 'tbsp', 'ice water'),
  (recipe1, 5, '6', '', 'large apples, peeled and sliced'),
  (recipe1, 6, '3/4', 'cup', 'sugar'),
  (recipe1, 7, '2', 'tsp', 'cinnamon'),
  (recipe1, 8, '1/4', 'tsp', 'nutmeg'),
  (recipe1, 9, '2', 'tbsp', 'butter');

-- Recipe 1 instructions
insert into public.recipe_instructions (recipe_id, position, body) values
  (recipe1, 1, 'Make the crust: Mix flour and salt. Cut in chilled butter until mixture resembles coarse crumbs. Add ice water a tablespoon at a time until dough holds together.'),
  (recipe1, 2, 'Divide dough in half, flatten into disks, wrap and refrigerate for 1 hour.'),
  (recipe1, 3, 'Preheat oven to 425°F. Mix apples with sugar, cinnamon, and nutmeg.'),
  (recipe1, 4, 'Roll out one disk on a floured surface. Transfer to a 9-inch pie pan.'),
  (recipe1, 5, 'Add the apple filling and dot with butter. Roll out the second crust and place over filling. Seal and crimp edges.'),
  (recipe1, 6, 'Cut vents in the top crust. Bake 45–55 minutes until golden and bubbling.');

-- Recipe 2
insert into public.recipes
  (id, book_id, title, description, source_name, story, prep_minutes, cook_minutes, servings, category, created_by)
values (
  gen_random_uuid(),
  book_id,
  'Lemon Herb Chicken',
  'Juicy roast chicken with fresh herbs and bright lemon.',
  'Mom',
  'Sunday evenings always smelled like this. It''s the simplest recipe but the house felt full whenever it was in the oven.',
  15, 90, 4, 'Dinner', owner_id
) returning id into recipe2;

insert into public.recipe_ingredients (recipe_id, position, quantity, unit, item) values
  (recipe2, 1, '1', '', 'whole chicken, about 4 lbs'),
  (recipe2, 2, '2', '', 'lemons, zested and halved'),
  (recipe2, 3, '4', 'cloves', 'garlic, minced'),
  (recipe2, 4, '3', 'tbsp', 'fresh rosemary, chopped'),
  (recipe2, 5, '3', 'tbsp', 'fresh thyme'),
  (recipe2, 6, '3', 'tbsp', 'olive oil'),
  (recipe2, 7, '1', 'tsp', 'salt'),
  (recipe2, 8, '1/2', 'tsp', 'black pepper');

insert into public.recipe_instructions (recipe_id, position, body) values
  (recipe2, 1, 'Preheat oven to 425°F. Pat chicken dry with paper towels.'),
  (recipe2, 2, 'Mix lemon zest, garlic, herbs, and olive oil. Rub all over the chicken, including under the skin.'),
  (recipe2, 3, 'Stuff cavity with lemon halves. Place in a roasting pan.'),
  (recipe2, 4, 'Roast 1 hour 30 minutes, or until juices run clear. Rest 10 minutes before carving.');

-- Recipe 3
insert into public.recipes
  (id, book_id, title, description, source_name, story, prep_minutes, cook_minutes, servings, category, created_by)
values (
  gen_random_uuid(),
  book_id,
  'Classic Spaghetti',
  'A rich, slow-cooked meat sauce over spaghetti.',
  'Dad',
  'Dad''s spaghetti was the first thing he ever taught me to cook. The sauce takes three hours but it''s worth every minute.',
  20, 180, 6, 'Dinner', owner_id
) returning id into recipe3;

-- Recipe 4
insert into public.recipes
  (id, book_id, title, description, source_name, prep_minutes, cook_minutes, servings, category, created_by)
values (
  gen_random_uuid(),
  book_id,
  'Sunday Pancakes',
  'Fluffy buttermilk pancakes, perfect for lazy mornings.',
  'Mom',
  20, 20, 4, 'Breakfast', owner_id
) returning id into recipe4;

-- Recipe 5
insert into public.recipes
  (id, book_id, title, description, source_name, prep_minutes, cook_minutes, servings, category, created_by)
values (
  gen_random_uuid(),
  book_id,
  'Chicken Enchiladas',
  'Cheesy chicken enchiladas with homemade red sauce.',
  'Aunt Lisa',
  30, 40, 6, 'Dinner', owner_id
) returning id into recipe5;

-- Recipe 6
insert into public.recipes
  (id, book_id, title, description, source_name, prep_minutes, cook_minutes, servings, category, created_by)
values (
  gen_random_uuid(),
  book_id,
  'Homemade Biscuits',
  'Flaky, buttery biscuits ready in 30 minutes.',
  'Grandma Rose',
  10, 15, 12, 'Bread', owner_id
) returning id into recipe6;

-- Collections
insert into public.collections (id, book_id, title, icon, created_by)
values (gen_random_uuid(), book_id, 'Holidays', '🎄', owner_id)
returning id into col1;

insert into public.collections (id, book_id, title, icon, created_by)
values (gen_random_uuid(), book_id, 'Quick Meals', '⚡', owner_id)
returning id into col2;

insert into public.collections (id, book_id, title, icon, created_by)
values (gen_random_uuid(), book_id, 'Sunday Dinners', '🍽️', owner_id)
returning id into col3;

insert into public.collections (id, book_id, title, icon, created_by)
values (gen_random_uuid(), book_id, 'Grandma''s Recipes', '❤️', owner_id)
returning id into col4;

-- Collection recipes
insert into public.collection_recipes (collection_id, recipe_id) values
  (col1, recipe1),
  (col3, recipe2),
  (col3, recipe3),
  (col2, recipe4),
  (col4, recipe1),
  (col4, recipe6);

-- Sample reactions
insert into public.recipe_reactions (recipe_id, user_id, type) values
  (recipe1, owner_id, 'love'),
  (recipe1, owner_id, 'favorite'),
  (recipe2, owner_id, 'love'),
  (recipe3, owner_id, 'made_it'),
  (recipe4, owner_id, 'love');

-- Story
insert into public.recipe_stories (recipe_id, author_id, body) values
  (recipe1, owner_id, 'I made this for Christmas last year and everyone asked for the recipe. The secret really is the cold butter.');

end $$;
