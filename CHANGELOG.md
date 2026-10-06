# Changelog

## Public launch updates (version held at 1.0.0) - 2026-10-05

### Quality gates

- Email members a branded lifetime Plus notification when an administrator grants access, and report delivery failures in the admin panel.
- Updated the locked `source-map-js` dependency to its patched release so the production dependency audit passes.
- Self-hosted the app fonts so CI and production builds no longer need to fetch Google Fonts during compilation.
- Recovered the billing portal customer link from an existing Stripe subscription when the saved customer ID is stale, and showed an actionable account-link error when Stripe cannot find the subscription.

### Public navigation

- Added a Guide on replacing a recipe photo by changing the photo ID in both places in its image URL, with those numbers highlighted in the example.
- Replaced the dollar sign icon for mobile Pricing navigation with a layers icon representing the Free and Plus plans.
- Kept the public version at 1.0.0 at the owner's request until they explicitly request a new version.

## [1.0.0] - 2026-10-05

### Public launch

- Set the public Home Cooked version to 1.0.0. Earlier 1.0.x numbers were used for internal production releases before the public launch; their history is retained below.
- Included public visitor analytics and completed-signup measurement in the launch baseline.

## Prelaunch production history

## [1.0.11] - 2026-10-05

### Public visitor and signup analytics

- Added privacy scoped Vercel page views for public pages and an internal count of completed signups.
- Counted completed first sign-ins once per new account, excluding unverified email-code requests and existing accounts.
- Updated the privacy policy to describe the aggregate analytics data.

## [1.0.10] - 2026-10-05

### Billing button layout

- Kept the Settings billing action on one line in Safari and allowed the plan description to use the remaining card width.

## [1.0.9] - 2026-10-05

### Refund and cancellation lifecycle

- Added separate administrator controls for period-end cancellation/reactivation and a reviewed full refund action that validates the Stripe invoice and payment, cancels the subscription immediately, and records an atomic downgrade and audit trail.
- Reconciled verified full Stripe refund events, protected refunded subscriptions from stale webhook updates and duplicate checkout, added a Stripe billing refresh control, and clarified paid-through and refunded states in Settings.
- Added billing lifecycle tests and an operator guide for refunds, cancellation, reconciliation, and release setup.

## [1.0.8] - 2026-10-05

### Plus refund policy

- Added a 30-day initial-purchase refund policy to Terms, with a support contact, discretionary refunds after 30 days, paid-period cancellation access, and preservation of statutory rights.
- Updated the Terms revision date and aligned the existing billing section with the refund policy.

## [1.0.7] - 2026-10-05

### Cookbook navigation label

- Renamed the recipe page’s list link to Cookbook recipes to distinguish it from the global All recipes navigation item.

## [1.0.6] - 2026-10-05

### Recipe list navigation

- Renamed the recipe page’s Back button to All recipes and made it always open the current cookbook’s recipe list, including after editing a recipe.

## [1.0.5] - 2026-10-05

### Imported recipe photos

- Automatically select a matching Pexels photo for imported recipes without an included image, with photographer attribution. Preserve included images and allow saving when photo search is unavailable.

## [1.0.4] - 2026-10-05

### PDF recipe import

- Fixed saving PDF recipes without a serving count by leaving unknown servings empty. Applied the same handling to other file imports that report zero servings.

## [1.0.3] - 2026-10-05

### Checkout customer recovery

- Recover Plus checkout when the account’s saved Stripe customer no longer exists, saving a replacement customer before creating checkout while preserving the existing subscription guard.

## [1.0.2] - 2026-10-05

### Recipe header corner

- Matched the recipe header controls gradient to the image’s rounded top-right corner so the overlay no longer paints a square corner over it, while keeping the action menu visible outside the header.

## [1.0.1] - 2026-10-05

### Recipe ideas for every meal

- Added a meal-type selector to Ideas for breakfast, brunch, lunch, dinner, dessert, snacks, appetizers, side dishes, and drinks, with an Any meal option.
- Removed the dinner-only default, broadened surprise inspiration, and made AI instructions honor the requested meal type.

## Internal 1.0.0 baseline - 2026-10-04

### Initial production release

- Launched Home Cooked 1.0.0 on `main` after live synthetic checks passed for privacy, permissions, recipes, invitations, and deployed core pages; billing reliability was covered by local and CI tests.
- Completed a Supabase Free-plan database and Storage export, isolated database restore rehearsal, and production media cutover. The release record documents verification results and remaining operational limits.
- Moved the fixed public mobile navigation outside page stacking contexts so scrolled copy cannot draw over it, with mobile WebKit coverage for the mounted nav and its hit targets.

## [0.22.3] - 2026-10-04

### Release verification

- Added a repeatable live synthetic smoke test for authentication, cookbook roles, household access, invitations, recipes, photos, deployed routes, and verified cleanup.
- Expanded browser coverage to every public guide, Our Story, and sign-in validation.
- Recorded the 1.0 release checks and the production migration and media cutover findings.

## [0.22.2] - 2026-10-04

### Public page image loading

- Fixed Our Story and Pricing page crashes by allowing their public background images in the image optimizer configuration.

## [0.22.1] - 2026-10-02

### Account email consistency

- Branded the account-deletion archive email to match authentication and invitation emails, with clear archive contents, format, and exclusions.
- Added a development-only preview of the account-deletion email.

## [0.22.0] - 2026-10-02

### Launch security and reliability

- Updated vulnerable dependencies and disabled PDF JavaScript evaluation.
- Made uploaded family media private with membership-aware, uncached image delivery, safe public-share handling, upload resizing, and Storage ownership/type/size protections.
- Added public-link revocation and replaced attachment download/upload capabilities with membership-checked requests.
- Made recipe and child-list saves transactional so failed creates, edits, or shared saves cannot leave partial recipes.
- Made Stripe webhook effects and acknowledgements atomic, recoverable on retry, and resistant to stale subscription and payment events.
- Closed unauthorized household enrollment and client-controlled AI quotas; fixed moderation guards on ordinary recipe/profile updates.
- Added full migration-chain permission tests, image/billing regression tests, desktop and mobile WebKit smoke checks, and CI release gates.
- Added environment preflight, migration history reconciliation tooling, and staging/backup/rollback procedures. Deployment and real-device verification remain required before launch.

## [0.21.1] - 2026-10-01

### Deployment build reliability

- Switched production builds to Next.js's supported webpack fallback, avoiding the Turbopack `next/font` resolution failure seen in Vercel deployments.

## [0.21.0] - 2026-10-01

### Contextual guide access

- Added task-specific guide links to cookbook setup, recipe entry, Meal Plan, and Groceries, preserving in-progress work by opening guides in a new tab.
- Added a persistent Guides & help card to Settings for browsing the complete guide library.

## [0.20.0] - 2026-10-01

### In-app workflow guides

- Added comprehensive, task-specific guides for setting up a first cookbook, adding a first recipe through manual entry or import, and planning meals with a grocery list.
- Kept the new guides aligned with the existing sharing and roles guide, including clear Home Cooked actions, practical limits, and review guidance.

## [0.19.1] - 2026-10-01

### Plan-aware cookbook creation

- Applied the signed-in account’s effective Free or Plus entitlement to the cookbook-creation screen, so Plus members retain the complete app navigation and see Plus-specific sharing guidance.
- Clarified the Shared cookbook option for Free members with its three-person Family limit and for Plus members with unlimited Family and Contributor invitations.

## [0.19.0] - 2026-09-29

### Dedicated bookshelf

- Replaced the Bookshelf navigator drawer with a dedicated, searchable shelf page that presents each cookbook as an accessible illustrated book linked to its existing contents.
- Added responsive CSS shelves, dynamic cookbook and recipe totals, and empty and no-search-result states while retaining the existing cookbook creation and plan-limit flows.

## [0.18.1] - 2026-09-29

### Empty cookbook controls

- Kept cookbook member management and settings visible before the first recipe is added.
- Loaded keeper permissions and member totals through the authenticated server path so an empty cookbook reliably shows its setup actions.

## [0.18.0] - 2026-09-29

### Cookbook-first recipe storage

- Made the owned cookbook the visible recipe home for Free accounts, with a 50-recipe cookbook allowance and Bookshelf access on both plans.
- Reserved the cross-cookbook All Recipes view for Plus and made cookbook destinations explicit in manual and generated-recipe save flows.
- Moved recipe capacity and Contributor access to the destination cookbook owner's entitlement, so Plus owners sponsor Free Contributors without expanding those Contributors' personal Free accounts.
- Made existing Contributors read-only when a cookbook owner downgrades and added database coverage for sponsored contributions, Free capacity, and downgrade behavior.

## [0.17.0] - 2026-09-29

### Free cookbook sharing

- Free cookbook owners can invite up to three other people with Family access; active invitations reserve spots.
- Plus retains unlimited sharing and Contributor invitations. Owner entitlements and limits are enforced in the database, including atomic invitation acceptance.
- Added sharing allowance and upgrade guidance to member screens, and refreshed pricing, guides, billing, onboarding, settings, and email copy.
- Preserved existing memberships on downgrade; new invitations follow Free limits.
- Recorded wording and local review locations in `reports/2026-09-29-free-sharing-copy-review.md`.

## [0.16.2] - 2026-09-29

### Sharing and member roles guide

- Added a guide to Keeper, Contributor, and Family roles, cookbook sharing, invitations, and managing access.
- Linked the guide from Members and the invitation form, including on mobile.
- Clarified that Contributors edit their own recipes and removed an unsupported promise of role changes from invitation help.

## [0.16.1] - 2026-09-28

### Conversational public copy

- Used natural contractions in Our Story and the public Guides while preserving their meaning and structure.

## [0.16.0] - 2026-09-28

### Home Cooked Guides

- Added a public, accessible Guides index and ten substantive editorial guide pages for collecting, organizing, preserving, digitizing, and sharing recipes.
- Added reusable Guide content data, detail-template modules, guide metadata, related links, table of contents, and real pricing/sign-up calls to action.
- Unified Guides, Pricing, and Our Story around a shared image-backed editorial masthead and replaced card-based public-page layouts with open spreads, dividers, and typographic hierarchy.
- Rewrote all ten Guides as long-form editorial articles and replaced the mandatory numbered-step presentation with narrative sections and optional supporting lists.
- Updated the advertised Plus annual price and Stripe setup documentation to $24.99.

## [0.15.2] - 2026-09-24

### Free cookbook creation fix

- Fixed the Free-limit database trigger to use `owner_id` for cookbooks and `created_by` for recipes.
- Added migration 027 to repair already-migrated databases.

## [0.15.1] - 2026-09-23

### Billing policy disclosures

- Updated the Terms of Service for the Plus subscription, annual renewal, cancellation, Stripe processing, and retained content after downgrade.
- Updated the Privacy Policy for Stripe billing identifiers, payment processing, and billing-record retention.

## [0.15.0] - 2026-09-23

### Free and Plus billing infrastructure

- Added centralized Free/Plus entitlements, safe limits, and atomic AI allowances.
- Added Stripe Checkout, Billing Portal, signed idempotent webhook sync, and billing settings.
- Added database migration 026 for billing state, webhook events, usage, and insert-boundary limits.

## [0.14.2] - 2026-09-28

### AI model registry and evaluation

- Centralized Cloudflare, OpenAI, and Anthropic model selection behind server-only adapters with task-specific limits, safe telemetry, allowlisted environment overrides, correlation IDs, and one bounded same-plan fallback.
- Promoted Gemma 4 for recipe generation after it cleared the comparison gates and the reviewer approved the safety-first recommendation. Generation now fails closed instead of automatically falling back: prompt-v2 testing found Llama outputs with malformed quantities, missing cooking steps, and duplicate instructions, while GLM remained disqualified after violating an explicit peanut exclusion. Llama remains selected for the faster description and optional image tasks. No paid-only model or provider was enabled.
- Revised the recipe-generation prompt to request inviting descriptions, warm non-invented stories, practical ingredient quantities and preparation notes, and strict adherence to dietary and allergy exclusions.
- Updated the Recipe AI settings card to read its recipe-generation model name from the central registry, keeping the user-facing provider information synchronized with model changes and allowed environment overrides.
- Aligned the provider JSON Schema's string and numeric limits with strict production validation after promotion testing exposed an overlong tag, then verified the corrected case. Evaluator v3 now rejects malformed quantities, missing core ingredients in steps, and duplicate instructions.
- Kept malformed-quantity and duplicate-step enforcement in production Zod after Cloudflare rejected the equivalent JSON Schema keywords, and verified the exact compatible final schema with a capped live request.
- Added 27 synthetic evaluation cases, full response-contract and constraint checks, offline adapter tests, an opt-in capped live runner, machine-readable and Markdown reports, semantic regrading, and a blinded human-review worksheet.
- Documented every model and deterministic import path, current Cloudflare eligibility/deprecation findings, observed latency/usage, Neuron projections, task overrides, and rollback procedures.
- Added server-side authentication checks, input caps, and best-effort per-user/task burst protection to model-backed actions while preserving current cookbook permissions, provider preferences, and deterministic import behavior.

## [0.14.1] - 2026-09-26

### Ultrawide layout

- Capped the public landing-page hero inside a centered 1,900px canvas and grouped the authenticated app rail and main panel together inside one centered 1,440px grid so they stay adjacent on large monitors.
- Capped the authenticated home hero artwork at 792px so it stops scaling once the app shell reaches its maximum width.
- Allow recipe action menus to extend beyond the photo hero instead of being clipped by the description region, with scrolling available on short mobile screens.
- Keep the softer full-width landing hero through tablet widths, with a moderate image fade at 1,024px and the stronger existing treatment retained on mobile.

## [0.14.0] - 2026-09-19

### Tonight’s table in Ideas

- Evolved the existing Ideas page with servings, budget, dietary preferences, allergy exclusions, and total cooking time in a compact inline form, ordered by people, budget, time, and dietary needs, with compact right-aligned selects and an always-visible ingredients field.
- Added optional pantry ingredients; generate dinner ideas from table settings alone.
- Keep the existing navigation, cook-now view, and cookbook saving flow. Show the original request alongside each generated draft and clarify that allergy suitability is not verified.
- Added generation loading feedback and recoverable generation/save errors.

## [0.13.2] - 2026-09-19

### PWA notification reliability

- Resync existing admin subscriptions with the server and detect changed notification keys instead of reporting a browser-only subscription as enabled.
- Added device-specific test notifications, reconnect controls, setup timeouts, and recoverable error messages.
- Keep server-error notification delivery alive after the request finishes, and report incomplete server notification configuration.
- Handle malformed push payloads without skipping the visible notification.

## [0.13.1] - 2026-09-19

### Original recipe attachments

- Added a drag-and-drop upload area with tap-to-browse support.
- Replaced large attachment cards with compact rows, photo thumbnails, and an inline remove icon.

## [0.13.0] - 2026-09-19

### Original recipe attachments

- Added Original recipe to the recipe action menu, with a drawer for preserving multiple photos, scanned pages, and PDFs (up to 20 MB each).
- Cookbook members can open originals; recipe editors can attach or remove files. Originals use private storage and are excluded from public recipe shares.
- Preserve originals when moving recipes and duplicate them when copying recipes between cookbooks.
- Requires the recipe originals storage migration before enabling uploads.

## [0.12.9] - 2026-09-09

### Photo recipe imports

- Made multi-recipe import choices compact and readable, stripping OCR image captions and description text from detected cookbook titles.

## [0.12.8] - 2026-09-09

### Photo recipe imports

- Restored two-recipe cookbook-spread imports when older recipes begin their directions with verbs such as “Dissolve” or “Bring.”

## [0.12.7] - 2026-09-09

### Photo recipe imports

- Restored the recipe chooser for one-page cookbook spreads that clearly contain two independently titled side-by-side recipes, without splitting a single centered-title recipe's ingredient and direction columns.

## [0.12.6] - 2026-09-09

### Photo recipe imports

- Preserved multi-line recipe titles and complete ingredient pages during local OCR, including labeled sections such as Dough, Filling, and Frosting.
- Recognize standalone numbered markers so recipe instruction text is not split at ordinary sentence periods.

## [0.12.5] - 2026-09-09

### Photo recipe imports

- Fixed the replacement confirmation appearing on a new recipe because its automatically selected default category was being treated as entered form content.

## [0.12.4] - 2026-09-09

### Photo recipe imports

- Made the photo-import handoff explicit: “Review & save recipe” now opens Manual entry with a confirmation that the extracted fields are ready to review and have not yet been saved.
- Updated replacement confirmation copy to explain that imported fields will open in Manual entry for review before saving.

## [0.12.3] - 2026-09-08

### Recipe paste actions

- Separated cancel and re-parse actions from review and save, with shorter review copy and responsive button sizing that prevents awkward label wrapping.

## [0.12.2] - 2026-09-07

### Local PDF recipe imports

- Added PDF to the recipe-file importer. Selectable text is extracted in the browser, with the existing local OCR used for scanned pages; nothing is sent to an AI provider by default.
- PDFs are limited to 8 MB and are added to the same review queue as other file imports before saving.

## [0.12.1] - 2026-08-25

### Contact channels
- Added product support and privacy contact addresses to the legal pages.
- Added contact links to the public footer and account Settings legal section.

## [0.12.0] - 2026-08-25

### Release tracking and legal pages
- Added package-based app version tracking so the public footer and app shell display update from `package.json`.
- Added `npm run version:check` to verify semver, lockfile version alignment, and changelog coverage.
- Updated the public Terms of Service and Privacy Policy pages with Home Cooked-specific plain-English copy, current metadata, and shared legal-page layout.

## 2026-08-05

### Passwordless sign-in
- **Sign-up and sign-in are now one screen.** Enter an email at `/sign-in`, get a 6-digit code, type it in. New and returning users take the identical path — the account is created on first use — so there is no longer a "do I have an account?" decision to get wrong.
- **Passwords are gone.** `/sign-up`, `/forgot-password`, and `/reset-password` are deleted and now 308-redirect to `/sign-in` (query strings carry over, so old `?next=` and `?email=` links still work). Existing accounts need no migration: the same email address just gets a code instead.
- **Added "Continue with Google"** on the entry screen, with a new `/auth/callback` route doing the PKCE exchange.
- The code step keeps its state in the URL and its resend cooldown in `sessionStorage`, so switching to the mail app and coming back to a reloaded tab doesn't lose the address or reset the timer.
- Auth emails now carry the 6-digit code above the button, in both the new-user and returning-user templates. The magic link still works as a fallback.
- **Name is now collected on `/onboarding`** instead of at sign-up, and in Settings for anyone who joined straight from an invite and never passed through onboarding.
- Removed the admin "send password reset" tool. Existing `admin_actions` history is untouched.
- Migration `021_profile_name_from_provider.sql` teaches `handle_new_user()` to accept a provider name under either `full_name` or `name`. No new tables, so no Data API grants are required.
- **Note:** removing passwords from the app does not disable password grants at the Supabase API layer — existing hashes remain redeemable via `POST /auth/v1/token?grant_type=password`. Scrambling them needs a one-off service-role script.

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
# 0.15.0

- Added centralized Free/Plus entitlements, safe limits, and atomic AI allowances.
- Added Stripe Checkout, Billing Portal, signed idempotent webhook sync, and billing settings.
- Added database migration 026 for billing state, webhook events, usage, and insert-boundary limits.
