# Production Execution Plan

This plan converts the production-readiness recommendations into executable work. It assumes Home Cooked remains free to users, so the priorities are cost control, data safety, reliability, and supportability rather than billing.

## Working Rules

- Do the phases in order unless a production incident forces a change.
- Every phase ends with passing `npm run lint` and `npm run build`.
- Any database change must include a migration, a staging verification step, and a rollback/forward note.
- Any permission-sensitive feature must include a negative test proving another user cannot access or mutate the data.
- Do not add broad new product features until Phases 1-4 are complete.

## Phase 1: Image Upload And Storage Controls

Goal: Prevent storage/bandwidth from becoming the first free-app cost problem.

### Tasks

- Audit current image upload flow in `src/lib/upload.ts` and all callers.
- Add accepted file type validation before upload.
- Add max file size validation before upload.
- Add client-side image resizing/compression before upload.
- Standardize generated storage object names.
- Store image metadata where useful: original size, compressed size, mime type, dimensions.
- Add user-facing upload failure copy for unsupported type, too large, network failure, and storage failure.
- Confirm Supabase Storage policies match book membership permissions.
- Document recommended production Storage bucket settings.

### Suggested Defaults

- Accepted types: `image/jpeg`, `image/png`, `image/webp`.
- Max original upload: `10MB`.
- Target compressed max width: `1800px`.
- Target compressed quality: `0.82`.
- Prefer WebP output if browser support is available, fallback to JPEG.

### Acceptance Criteria

- A 12MB image is rejected with a clear message.
- A normal iPhone photo uploads successfully after compression.
- Uploading a non-image file fails before reaching Supabase.
- Recipe pages never load original full-size images when a smaller version exists.
- Storage policy prevents users outside the cookbook from accessing private images.

### Verification

```bash
npm run lint
npm run build
```

Manual QA:

- Upload a large phone photo on mobile Safari.
- Upload a PNG.
- Try uploading a PDF renamed as `.jpg`.
- Replace a recipe image.
- Confirm old image cleanup behavior is intentional.

## Phase 2: AI Usage Limits And Failure Boundaries

Goal: Keep free AI features useful without becoming a cost or abuse risk.

### Tasks

- Locate AI generation actions in `src/lib/actions/aiRecipes.ts`.
- Add per-user and/or per-cookbook rate limits.
- Store AI generation attempts in a table, including success/failure and provider.
- Add daily usage caps.
- Add friendly fallback copy when the AI provider is unavailable or the user hits a limit.
- Ensure generated recipes always require user review before saving.
- Log provider failures without storing sensitive prompt content unnecessarily.
- Add environment-level kill switch for AI generation.

### Proposed Limits

- Anonymous users: no AI generation.
- Signed-in users: `10` generations per day.
- Per cookbook: `50` generations per day.
- Server-side timeout: `20s`.

### Database Work

Create migration for something like:

- `ai_generation_events`
  - `id`
  - `user_id`
  - `book_id`
  - `provider`
  - `status`
  - `created_at`
  - `error_code`

Optional:

- `ai_daily_usage` materialized view or query helper.

### Acceptance Criteria

- User cannot exceed the daily limit.
- Limit cannot be bypassed by refreshing the page.
- Provider failure shows calm UI copy.
- AI can be disabled by environment config without breaking the rest of the app.

### Verification

```bash
npm run lint
npm run build
```

Manual QA:

- Generate until limit is reached.
- Simulate missing provider env vars.
- Confirm normal recipe CRUD still works when AI is disabled.

## Phase 3: Recipe Pagination, Filtering, And Search

Goal: Keep recipe browsing fast when books grow from dozens to thousands of recipes.

### Tasks

- Audit `src/app/app/books/[bookId]/recipes/page.tsx`.
- Stop loading all recipes into the client when not necessary.
- Add server-side pagination.
- Add indexed search fields.
- Add sort options if needed: recent, title, category.
- Add page size constants.
- Add empty states for filtered results.
- Add loading skeletons for paginated results.

### Suggested Defaults

- Initial page size: `24`.
- Search debounce: `250ms`.
- Minimum search length: `2` characters.
- Indexes:
  - `recipes(book_id, created_at desc)`
  - `recipes(book_id, title)`
  - `recipes(book_id, category)`

### Database Work

Add migration for indexes and optional full-text search support.

Potential full-text column/index:

- generated `search_vector`
- GIN index on `search_vector`

### Acceptance Criteria

- A book with 1,000 recipes does not render 1,000 cards on first load.
- Searching does not fetch unrelated books.
- Pagination keeps URL state or has a clear load-more behavior.
- Empty search state is clear and recoverable.

### Verification

```bash
npm run lint
npm run build
```

Manual QA:

- Seed or simulate a large cookbook.
- Search on desktop and mobile.
- Navigate into a recipe and back without losing context if feasible.

## Phase 4: RLS And Permission Test Suite

Goal: Prove that private cookbook data stays private.

### Tasks

- Inventory all Supabase tables and storage buckets.
- Map each table to ownership model:
  - user-owned
  - book-owned
  - household-owned
  - system-owned
- Write tests for role behavior:
  - keeper
  - contributor
  - family
  - unauthenticated
  - unrelated authenticated user
- Test removed member access.
- Test invite acceptance and token reuse.
- Test storage access for recipe images.
- Add negative tests for cross-book access.

### Candidate Tools

- Supabase local CLI if adopted.
- Dedicated staging/test Supabase project if local setup is too heavy.
- Lightweight Node scripts using Supabase clients for policy checks.

### Acceptance Criteria

- Keeper can manage cookbook and members.
- Contributor can add/edit own recipes but cannot manage members.
- Family can view but cannot edit recipes.
- Unrelated user cannot read recipes, collections, members, grocery items, meal plans, or images.
- Removed member loses access.
- Expired or reused invite tokens fail safely.

### Verification

```bash
npm run lint
npm run build
```

Plus:

```bash
npm run test:permissions
```

Add this script when the permission test harness is introduced.

## Phase 5: Basic Admin Tooling

Goal: Make the app supportable without manual database spelunking.

### Tasks

- Add admin role concept separate from cookbook roles.
- Add protected admin route group.
- Add admin user search by email.
- Add cookbook search by title/id/owner.
- Add read-only cookbook detail view:
  - owner
  - members
  - roles
  - recipe count
  - storage usage estimate
  - recent errors if observability is available
- Add invite lookup view.
- Add abuse/support actions only after read-only tools are stable.

### Minimum First Version

Read-only admin dashboard:

- Users list/search.
- Cookbooks list/search.
- Cookbook detail.
- Member list.
- Invite list.

No destructive admin actions in v1.

### Security Requirements

- Admin routes must be server-protected.
- Admin access must not depend only on hidden links.
- Admin events should be logged.
- Never expose service-role keys to the browser.

### Acceptance Criteria

- Non-admin users cannot access admin pages.
- Admin can find a user by email.
- Admin can find a cookbook and see members/roles.
- Admin can inspect invite status.

### Verification

```bash
npm run lint
npm run build
```

Manual QA:

- Try admin URLs as non-admin.
- Try admin URLs signed out.
- Confirm admin can locate a known cookbook.

## Phase 6: Observability

Goal: Know when production is failing and have enough context to fix it.

### Tasks

- Choose an error tracking provider.
- Add client error capture.
- Add server action error capture.
- Add route-level error context:
  - user id
  - book id
  - route/action name
  - provider name for AI/upload errors
- Add privacy filter for recipe content, invite tokens, and secrets.
- Add basic usage events:
  - signup
  - cookbook created
  - recipe created
  - image uploaded
  - invite accepted
  - AI generation attempted
- Add alerting for repeated failures.

### Acceptance Criteria

- A thrown server action error appears in the error dashboard.
- Upload failures include enough metadata to debug file type/size/provider.
- AI provider failures are visible.
- Logs do not contain service keys, full invite tokens, or private recipe bodies.

### Verification

```bash
npm run lint
npm run build
```

Manual QA:

- Trigger a test error.
- Trigger a failed upload.
- Trigger an AI provider failure.

## Phase 7: Migration Discipline And Release Process

Goal: Make schema changes predictable and recoverable.

### Tasks

- Document local, staging, and production database workflow.
- Add migration naming convention.
- Add migration review checklist.
- Add staging migration verification checklist.
- Add rollback/roll-forward notes for risky migrations.
- Add seed data for realistic multi-user scenarios.
- Add indexes identified in earlier phases.
- Document backup and restore process.

### Migration Checklist

Before production:

- Migration committed.
- RLS policies included.
- Indexes included where needed.
- Backfill plan included if existing rows are affected.
- Staging migration applied.
- Smoke tests pass on staging.
- Roll-forward note written.

### Acceptance Criteria

- No manual production schema changes without a committed migration.
- Staging mirrors production schema before deployment.
- Restore process has been tested at least once.

### Verification

```bash
npm run lint
npm run build
```

Plus staging smoke checklist.

## Recommended Execution Order

1. Phase 1: Image upload and storage controls.
2. Phase 2: AI usage limits.
3. Phase 4: RLS and permission tests.
4. Phase 3: Recipe pagination/search.
5. Phase 6: Observability.
6. Phase 7: Migration discipline.
7. Phase 5: Admin tooling.

Admin tooling is intentionally later because it benefits from observability and clearer permission tests. If support needs appear earlier, build the read-only admin views first and defer any destructive actions.

## First Sprint Checklist

Start here.

- [ ] Audit `src/lib/upload.ts`.
- [ ] Add image type and size validation.
- [ ] Add browser-side image compression.
- [ ] Add upload error messages.
- [ ] Confirm Storage policies.
- [ ] Audit `src/lib/actions/aiRecipes.ts`.
- [ ] Add AI event table migration.
- [ ] Add daily AI generation limit.
- [ ] Add AI disabled/provider unavailable UI state.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.

## Definition Of Done

This execution plan is complete when:

- Images are compressed, validated, and permission-protected.
- AI usage is capped and observable.
- Large recipe books remain fast.
- RLS behavior is tested across roles and negative cases.
- Admin can diagnose user/book/invite issues.
- Production errors are captured with useful, privacy-safe context.
- Schema changes are migration-driven and tested on staging.
