# Changelog

## 2026-05-28

### Grocery list from the meal plan
- Added an **Add to grocery list** button to the meal plan header that pulls this week's planned meals' ingredients straight onto the grocery list — the same import the grocery page already offered, now available where you actually plan. It always targets the **current calendar week** (regardless of the week on screen), de-dupes against items already on the list, and shows inline feedback with a **View list** link.
- New opt-in setting under **Settings → Grocery List → "Label ingredients by day"**: when on, ingredients brought over from the meal plan are tagged with the weekday(s) they were planned for and shown as a small badge on the list — e.g. ground beef for Monday and Thursday dinners appears as **Mon, Thu**. Days are **unioned across every recipe** that uses the ingredient, ordered Monday-first.
- The label preference is read **at import time** (not retroactive) and applies to both import entry points (meal plan button and the grocery page's import).
- Migration `015_grocery_meal_day_labels.sql` adds `user_settings.grocery_meal_day_labels` (per-user toggle, default off) and `grocery_items.meal_days` (`text[]`). Both are columns on existing tables, so no new Data API grants are required.

## 2026-05-27

### Custom chapter categories
- Every cookbook now owns its own **chapter list**. Defaults seeded on creation are unchanged (Breakfast, Lunch, Dinner, Appetizer, Side Dish, Dessert, Snack, Soup, Salad, Bread, Drink, Other) — but users can **rename, reorder, add, and delete chapters per book** from Settings → Chapters.
- Renames flow through automatically because recipes reference categories by id; existing recipes in "Dinner" stay put when "Dinner" becomes "Main Course".
- **Delete is blocked when a chapter still has recipes**: the manager opens a "Move these N recipes" modal with a picker (defaults to **Other**) and runs the reassign + delete atomically.
- The **AI recipe generator** now receives each cookbook's actual chapter list at request time (Cloudflare, OpenAI, and Anthropic providers), so a book with a custom "Tapas" chapter gets suggestions that land in Tapas.
- **Recipe imports** with an unknown category quietly drop into the book's "Other" chapter instead of being rejected.
- **Cross-book copy / move** re-resolves the category against the target book (case-insensitive match, fallback to Other) so a moved recipe never carries a stale FK.
- Migration `014_book_categories.sql` adds the `book_categories` table (RLS mirroring book membership), seeds defaults for every existing cookbook, backfills `recipes.category_id` from the old free-text column, then drops `recipes.category`. A trigger on `recipe_books` insert auto-seeds new books.

## 2026-05-21

### Grocery page
- Replaced the on-page grocery store search field with a **Find Nearby Stores** button that opens the side drawer; moved the search field to the top of that drawer.
- Removed the right-column cart — now a single check-off list; moved Import / Clear / Find into a top toolbar, then the add field, then the list.
- Consolidated the two clear buttons into one that toggles between **Delete all** and **Delete selected (N)**.
- Adjusted toolbar layout so it wraps and fits on mobile.
- Left-aligned the body and gave it a 75/25 two-column split.
- Added quantity/unit fields to the add form, then reverted them.
- Stopped checked items from sinking to the bottom of their category (stable order by date added).
- Added **offline support**: local cache + offline edit queue, offline-aware list (offline banner, sync-on-reconnect, Import/Nearby Stores disabled offline), and service-worker caching so the route loads offline.

### Meal Plan page
- Added an **in-context recipe detail drawer** (photo, prep/cook time, servings, ingredients, "View full recipe", and "Remove from plan"), plus slot icons and a "meals planned" pill.
- Built a **segmented week navigator** (‹ week-range › with a Today button) in the upper right.
- Made the header **non-sticky on mobile** (still sticky on larger screens).

### Bookshelf / Cookbooks
- Added a **book preview**: a Preview button under the cover opens a drawer with stats, categories, and a table of contents (`getBookPreview` action + new `BookshelfGrid`).
- Added the ability to **delete a book** (owner-only "⋯" menu + confirmation dialog + `deleteBook` action).
- Gave the actions menu a properly elevated background, added a **Share book** item linking to the share page, and kept long titles from running under the menu.

### Create New Book
- Dropped the separate "Step 2" — creating a book now goes straight to the open book with a dismissible welcome banner (solid, compact, not full-width).
- Rebuilt the page into the in-app layout (AppShell + form card + "How it works" panel) to match Add Members.

### Add Members page
- Rebuilt into a two-column **form + "How roles work" info panel** that fills the width (no centering, no right-side gap).

### Recipe copy / move
- Added the ability to **copy or move recipes between cookbooks** (`copyRecipeToBook`, `moveRecipeToBook`, `getRecipeTransferTargets`) from the recipe "⋯" menu, with a searchable, styled book-picker dialog. Copy includes memories/reactions/ratings; move is keeper/creator-only.

### Ideas / Home
- Gave the Ideas page **empty state** a clear placeholder treatment (dashed panel, icon, de-emphasized text).
- Added a 5th **Get Inspired** quick link on the book home, shrank the chips, and removed the redundant bottom Inspiration card. "Get Inspired" now auto-generates a random surprise idea.

### Copy
- Changed "Add someone to this book" → **"Share this book with someone"** (page heading, onboarding title, and aria-label).
