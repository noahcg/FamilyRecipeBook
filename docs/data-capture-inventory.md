# Data-Capture Inventory — Home Cooked

**Purpose.** This document is a complete, verified map of every way Home Cooked
captures information from users. It is the source-of-truth reference for the
Privacy Policy (`src/app/privacy/page.tsx`) and Terms of Service
(`src/app/terms/page.tsx`), and a checklist to keep those pages accurate as the
product grows.

**How to keep it updated.** When you add a form, a table/column, a storage
bucket, or an outbound call to a third-party API, add it here and re-check the
policy copy. Grep anchors that help: server actions in `src/lib/actions/`,
validators in `src/lib/validators/`, migrations in `supabase/migrations/`, and
outbound `fetch(` calls to non-Supabase hosts.

_Last verified against the codebase: migrations `001`–`019`._

---

## 1. Data users actively provide

Grouped by feature. Each row names the capturing surface and where it lands.

### Account & identity
| Data | Captured in | Stored in |
|---|---|---|
| Full name | `src/app/sign-up/page.tsx` | `auth.users.user_metadata.full_name`, mirrored to `profiles.full_name` |
| Email address | sign-up / sign-in / forgot-password | `auth.users.email` |
| Password | sign-up / sign-in / reset-password | `auth.users` (hashed by Supabase) |

_Note: `profiles.avatar_url` and `profiles.known_for` columns exist and
`uploadAvatar()` is implemented in `src/lib/upload.ts`, but no in-app profile
editor is currently wired — these are display-only today._

### Recipes & recipe content — `src/components/recipe/RecipeForm.tsx`
| Data | Stored in |
|---|---|
| Title, "who is this from?" attribution, story/memory, description | `recipes` (`title`, `source_name`, `story`, `description`) |
| Prep/cook minutes, servings, category, tags | `recipes` |
| Uploaded photo (≤8 MB; JPEG/PNG/WebP/HEIC) or pasted photo URL | Supabase Storage `recipe-images` bucket; `recipes.photo_url` |
| Ingredients — quantity, unit, item, note, group heading | `recipe_ingredients` |
| Instructions — step body | `recipe_instructions` |
| Import metadata (pasted text, OCR'd photo, imported files) | `recipes.import_method`, `import_source`, `source_url`, `import_metadata`, `nutrition` |

### Cookbooks — `src/components/book/*`
| Data | Stored in |
|---|---|
| Title, description, cover style/icon, sharing toggle | `recipe_books` |
| Category/chapter names | `book_categories` |

### Collaboration & sharing
| Data | Captured in | Stored in |
|---|---|---|
| Invitee email + role | `src/components/book/AddMemberForm.tsx` | `book_invitations` (`email`, `role`, secret `token`) |
| Membership acceptance | invite flow | `book_members`, `book_invitations.accepted_by` |

### Interactions
| Data | Stored in |
|---|---|
| Favorites / "made it" / love reactions | `recipe_reactions` |
| 1–5 star ratings | `recipe_ratings` |
| Family notes & memories | `recipe_stories` |

### Planning & shopping
| Data | Captured in | Stored in |
|---|---|---|
| Meal plan entries (recipe ↔ day / slot / notes) | `src/components/meal-plan/MealPlanCalendar.tsx` | `meal_plans` |
| Grocery items (name, quantity, unit, notes) | `src/components/grocery/GroceryList.tsx` | `grocery_items` (also queued offline in localStorage/IndexedDB via `src/lib/offlineGroceries`) |

### AI & settings
| Data | Captured in | Stored in |
|---|---|---|
| Free-text AI idea prompts (pantry contents, mood, timing, dietary needs, who you're cooking for) | `src/components/recipe/AIRecipeIdeaPanel.tsx` | not persisted; sent to AI processor (see §3) |
| AI provider choice + **bring-your-own API key** | `src/components/settings/AISettingsForm.tsx` | `user_settings.ai_provider`, `user_settings.ai_api_key` — **stored in plaintext** (see §5) |
| Grocery day-label preference, onboarding-guide state | settings | `user_settings` |

---

## 2. Data captured automatically / passively

| Data | Mechanism | Notes |
|---|---|---|
| Session / authentication cookies | Supabase auth cookies set server-side (`src/lib/supabase/server.ts`) | Strictly necessary. **No analytics, tracking, or advertising cookies exist; no consent banner is required.** |
| Precise geolocation (latitude/longitude) or typed location | `src/components/grocery/NearbyGroceryStores.tsx` via `navigator.geolocation` | Sent to Google Places for "grocery stores near me"; only when the user invokes the feature |
| Device user-agent + browser push keys | `src/lib/actions/admin-push.ts` | **Admin-only** Web Push; stored in `admin_push_subscriptions` (`endpoint`, `p256dh`, `auth`, `user_agent`) |
| Request / edge server logs | Vercel hosting | Standard hosting logs |
| Sign-in IP & auth audit metadata | Supabase Auth internal | Lives in `auth.audit_log_entries`, not in application tables |

Fonts are self-hosted at build time via `next/font` — no runtime request to
Google Fonts and no font-based tracking.

---

## 3. Third-party processors (data sharing)

Every processor below receives some user data. All must be disclosed in the
Privacy Policy.

| Processor | Data it receives | Code path | Privacy policy |
|---|---|---|---|
| **Supabase** (auth, database, storage) | Account details, all recipe/cookbook/plan/grocery content, uploaded photos, session cookies | `src/lib/supabase/*` | https://supabase.com/privacy |
| **Resend** (transactional email) | Recipient email + name, invitation / confirmation / password-reset links | `src/lib/email/*`, `src/app/api/auth/send-email/route.ts` | https://resend.com/legal/privacy-policy |
| **Cloudflare Workers AI** (default recipe-idea LLM) | Free-text pantry prompts, recipe titles, cookbook category names | `src/lib/actions/aiRecipes.ts`, `src/lib/actions/pexels.ts` | https://www.cloudflare.com/privacypolicy/ |
| **OpenAI** (optional; BYO key or server fallback) | Pantry prompts; uploaded recipe **photos** for OCR/structured extraction | `src/lib/actions/aiRecipes.ts`, `src/lib/actions/recipeImageImport.ts` | https://openai.com/policies/privacy-policy |
| **Anthropic** (optional; BYO key) | Pantry prompts + category names | `src/lib/actions/aiRecipes.ts` | https://www.anthropic.com/legal/privacy |
| **Pexels** (stock recipe photos) | An AI-derived search phrase from the recipe title/ingredients (only when the user hasn't uploaded a photo) | `src/lib/actions/pexels.ts` | https://www.pexels.com/privacy-policy/ |
| **Google Places** (nearby grocery stores) | Precise geolocation or typed location query | `src/lib/actions/grocery.ts` | https://policies.google.com/privacy |
| **Web Push services** (FCM / Mozilla / Apple) | Push subscription endpoints (admin only) | `src/lib/push/*` | Per browser vendor |
| **Vercel** (hosting) | Request / edge logs | Infrastructure | https://vercel.com/legal/privacy-policy |

---

## 4. Where key identifiers live

- **Email:** `auth.users.email` (primary); `book_invitations.email`;
  `admin_actions.metadata`/`summary` (target emails for admin audit); transiently
  in the Resend pipeline and admin push notifications.
- **User IDs:** FK columns across nearly every table (`owner_id`, `created_by`,
  `user_id`, `author_id`, `actor_id`, `checked_by`, `invited_by`,
  `accepted_by`), and **embedded in Storage object paths** (`{userId}/...`).
- **Timestamps:** `created_at`/`updated_at` on essentially every table, plus
  `accepted_at`, `checked_at`, `expires_at`, `planned_date`.

---

## 5. Storage, retention & deletion (current behavior)

- **Storage buckets** (`supabase/migrations/004_storage.sql`): `recipe-images`,
  `book-covers`, `avatars`. All three are **public-read**, and object paths
  contain the uploader's user ID — so a shared image URL exposes that ID.
- **Offline caches:** grocery list + op queue and a recipe cache live in the
  browser (localStorage / IndexedDB); onboarding-guide state in localStorage.
- **Retention:** content persists while the account is active. Users can delete
  individual recipes and cookbooks in-app. **There is no self-serve account
  deletion in the current build** — full account deletion is handled by
  contacting support. (A deletion feature was scoped but is not present in this
  working copy; migrations stop at `019`.)

---

## 6. Known gaps / follow-ups (not user-facing)

Flagged for the team — out of scope for the policy copy, but worth addressing:

1. **Plaintext AI keys.** `user_settings.ai_api_key` stores a third-party API
   key in plaintext in Postgres. Consider encryption at rest or a secrets vault.
2. **Public-read storage buckets.** `recipe-images`, `book-covers`, and
   `avatars` are world-readable; anyone with the URL can fetch the object.
3. **User ID in public file URLs.** Because object paths embed `auth.uid()`, a
   shared image URL leaks the uploader's user ID.
4. **No profile editor.** `avatar_url`/`known_for` and `uploadAvatar()` exist but
   aren't wired to any UI.
