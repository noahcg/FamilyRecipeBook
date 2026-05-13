# Production Readiness Plan

Home Cooked should be treated as a real production product, not a proof of concept. The next work should reduce risk, make behavior predictable, and give the app enough operational discipline to support real families using real data.

## 1. Stabilize Core Product Flows

These are the flows that must feel boringly reliable before anything else gets expanded.

- Sign up, sign in, sign out, and invite acceptance.
- Create a cookbook and switch between cookbooks on mobile and desktop.
- Add, edit, view, and delete recipes.
- Upload, display, replace, and remove recipe photos.
- Invite members and enforce role-based permissions.
- Browse recipes, collections, favorites, groceries, meal plan, and settings without dead ends.

Acceptance bar:

- Every primary route has a clear loading, empty, error, and success state.
- Mobile and desktop navigation expose the same essential capabilities.
- No primary action depends on hidden or desktop-only UI.
- A non-technical user can recover from validation errors without guessing.

## 2. Fix Quality Gates

The app should not ship while routine checks fail. The current lint command has unrelated failures that should be cleaned up so future regressions are obvious.

Priority items:

- Resolve all `npm run lint` errors.
- Decide whether warnings are allowed in CI or must be fixed.
- Add `npm run typecheck` if not already covered outside `next build`.
- Add a repeatable pre-merge command that runs lint, typecheck, and build.

Target:

```bash
npm run lint
npm run build
```

Both should pass cleanly before production releases.

## 3. Lock Down Auth, Roles, And RLS

Supabase Row Level Security is production-critical. Treat this as a security milestone, not an implementation detail.

Audit:

- Every table has RLS enabled where user data exists.
- Every policy is tested against Keeper, Contributor, Family, unauthenticated, and unrelated-household users.
- Service-role usage exists only on the server and is narrowly scoped.
- Invite tokens cannot be reused unexpectedly.
- Deleted or removed members immediately lose access.
- Storage policies match database permissions for recipe images.

Recommended tests:

- Unit-level permission tests for helper functions.
- Integration tests against a local Supabase instance or dedicated test project.
- Negative tests proving users cannot read or mutate another household's data.

## 4. Data Model And Migration Discipline

Production data needs a stable migration path and a recovery story.

Solidify:

- Make migrations idempotent where reasonable.
- Add seed data that reflects realistic multi-book, multi-role use.
- Document which tables are user-owned, household-owned, or system-owned.
- Add indexes for common filters and joins.
- Define cascade/delete behavior explicitly for books, recipes, members, collections, reactions, grocery items, and meal plans.
- Decide what "delete cookbook" means: hard delete, soft delete, or archived state.

Backup expectations:

- Supabase backups enabled for production.
- Restore process documented and tested at least once before launch.

## 5. UX Completion Pass

The app should feel complete in repeated daily use, not just attractive on the happy path.

Focus areas:

- Mobile navigation and cookbook switching.
- Recipe detail readability on small screens.
- Recipe creation form speed and validation clarity.
- Photo upload progress, failure, and retry states.
- Empty states that lead users to the next useful action.
- Settings screens for account, cookbook, members, and preferences.
- Consistent button hierarchy for destructive, primary, and secondary actions.

Principle:

Do not add new feature areas until the existing ones feel finished.

## 6. Testing Strategy

Add tests around business-critical behavior before adding broad UI tests.

Recommended layers:

- Validator tests for recipe, member, book, collection, and auth schemas.
- Server action tests for permissions and mutation behavior.
- Playwright smoke tests for sign-in, cookbook creation, recipe creation, recipe viewing, and mobile navigation.
- Regression tests for invite acceptance and role restrictions.

Minimum launch smoke suite:

- User can sign up and create first cookbook.
- Keeper can invite a member.
- Invited member can accept and view the cookbook.
- Contributor can add a recipe but cannot manage members.
- Family member can view recipes but cannot edit them.
- User can switch cookbooks on mobile.
- User can upload a recipe image.

## 7. Observability And Error Handling

Production apps need visibility when things fail.

Add:

- Error tracking such as Sentry or equivalent.
- Server action logging for failed mutations.
- Upload failure logging.
- Auth/invite failure logging without exposing secrets.
- Friendly global error pages.
- Clear handling for expired sessions and revoked access.

Avoid:

- Logging service-role keys, tokens, invite URLs, or raw private recipe content.

## 8. Performance And Media

Recipes are media-heavy, so image handling matters.

Review:

- Image upload size limits.
- Client-side compression or resizing before upload.
- Supabase Storage caching and transformation strategy.
- Next image usage for remote Supabase images.
- Dashboard query count and payload size.
- Recipe list pagination or infinite loading.

Targets:

- Dashboard remains fast with hundreds of recipes.
- Recipe pages do not load full-resolution images unnecessarily.
- Mobile interaction stays smooth on Safari.

## 9. AI Feature Boundaries

AI recipe generation should be useful, explainable, and safe to fail.

Solidify:

- Clear fallback when Cloudflare Workers AI is unavailable.
- Rate limiting per user or household.
- Cost controls if OpenAI fallback is enabled.
- User-facing copy that does not overpromise.
- Generated recipe review/edit step before saving.
- Guardrails around allergy, nutrition, and food safety claims.

Production rule:

AI should assist recipe creation, not become a hidden dependency for core app usability.

## 10. Release And Environment Setup

Before launch, separate local, staging, and production concerns.

Needed:

- Staging Supabase project.
- Production Supabase project.
- Environment variable checklist.
- Deployment checklist.
- Domain and email sender setup.
- Database migration procedure.
- Rollback procedure.
- Admin access policy.

Release checklist:

- Clean lint/build.
- Migrations applied to staging.
- Smoke tests pass on staging.
- Production environment variables verified.
- Backup/restore policy confirmed.
- Error monitoring verified.

## Suggested Order Of Work

1. Make lint/build clean and enforceable.
2. Finish mobile cookbook switching and navigation polish.
3. Audit RLS and storage policies.
4. Add tests for auth, roles, and recipe mutations.
5. Complete empty/loading/error states.
6. Harden image uploads and media performance.
7. Add observability.
8. Create staging and production deployment checklists.
9. Run a full manual QA pass on iOS Safari, Android Chrome, desktop Safari, Chrome, and Firefox.
10. Freeze new features until the launch checklist is green.

## Definition Of Production Ready

The app is production ready when:

- A real family can use it for a month without developer intervention.
- A permission bug cannot expose another household's recipes.
- A failed upload, expired invite, or invalid form does not trap the user.
- The team can deploy, rollback, and investigate errors confidently.
- Routine checks pass before every release.
- Mobile Safari feels like a first-class target, not an afterthought.
