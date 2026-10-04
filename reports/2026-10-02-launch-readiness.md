# Launch readiness audit — October 2, 2026

Current status after remediation: the repository fixes are implemented in **0.22.0**. Launch approval still requires the deployed verification below; no staging environment exists and no remote migrations or deployments were performed.

## Remediation completed

- Dependency updates: Next.js 16.3.8, patched PDF.js 5.5.207 compatible with the existing Node 20 runtime, compatible transitive updates, and disabled PDF evaluation. Final production audit reports zero vulnerabilities.
- Private recipe photos, covers, avatars, and original attachments use authorization on fresh requests with no shared cache. Storage ownership, size/type limits, guessed-reference protection, reference/delete serialization, and safe intentional public photo sharing are covered. Public links can be revoked by authorized members. Existing stored image identifiers are preserved.
- Original downloads no longer mint signed links; uploads use current-session Storage RLS rather than reusable upload tokens. Legacy previously issued capabilities still need the documented rollout cutover.
- Stripe entitlement effects and processed acknowledgements are atomic, retries recover, failed writes surface, stale subscription observations cannot overwrite newer observations, and payment history remains monotonic.
- Household self-enrollment and client-controlled AI quotas are blocked. Normal recipe/profile edits no longer fail due to moderation trigger field errors.
- Recipe create/edit/shared save and database copy operations are transactional. Failed child replacements preserve the original data. Moves atomically remove source collection links, and delete/move/rollback actions verify affected rows.
- Server-only service-client guard, full migration-chain tests, CI gates, environment preflight, migration history tooling, staging setup, backup restoration, and rollback procedures are added as reviewable repository files.

## Final local verification

- Lint: pass, no warnings.
- Automated tests: **90 pass**, zero failures/skips, including the complete 37-file migration chain in embedded PostgreSQL.
- Production build and TypeScript: pass.
- Desktop Chromium and mobile WebKit smoke suite against the final production build: **20 pass**.
- UI catalog visually inspected on desktop Chromium and iPhone-sized WebKit: correct RecipeCard photo/fallback rendering, no browser errors or horizontal overflow.
- Version tracking: pass for 0.22.0.
- Production dependency audit: zero reported vulnerabilities.
- Migration preparation: unique versioned copies and checksums generated locally; no database contacted.
- Local staging preflight correctly fails on missing/placeholder email hook configuration, a local site origin, differing billing/email origins, and a non-staging Stripe key. This is local configuration evidence, not an inspection of deployed variables.

Embedded database fixtures exercise SQL policies, not Supabase Storage HTTP enforcement; parallel submissions use one embedded connection, not independent-connection contention. Browser smoke tests are anonymous and do not prove real email delivery, paid checkout, signed-in workflows, or real-device Safari behavior. A physical iPhone, staging service checks, cache/legacy-token cutover, monitoring delivery, and a backup restoration rehearsal remain required. See [LAUNCH_RUNBOOK.md](../LAUNCH_RUNBOOK.md) and [migration reconciliation](../docs/migration-history.md).

The following sections retain the original audit evidence and launch acceptance criteria.

## Checks performed

- `npm run lint`: pass, no reported warnings.
- `npm test`: 51 tests pass, no skips. Includes embedded PostgreSQL sharing/role tests and mocked attachment permission tests.
- `npm run build`: pass, including TypeScript and 51 generated pages. Initial restricted-network run failed in Google font loading; network-enabled rerun passed.
- `npm run version:check`: pass for 0.21.1.
- `npm audit --omit=dev --json`: eight affected packages: one critical, five high, one moderate, one low. These are package advisory classifications, not proof that every advisory is exploitable in this app.
- Reviewed committed storage policies, uploads, selected billing paths, AI allowance implementation, development route guards, and test coverage.
- No production database, deployment, private recipes, or environment secret values accessed. No application behavior changed; no version bump needed for this audit report.

## Findings requiring attention before launch

1. **Dependency vulnerabilities.** Installed Next.js 16.2.4 is flagged critical; npm reports 16.3.8 as a fix candidate. PDF.js is flagged high, as are nanoid, postcss, sharp, and ws. Moderate: baseline-browser-mapping; low: dompurify. Upgrade deliberately, review current upstream migration/security guidance, and rerun regression checks. Avoid blindly using `npm audit fix --force`.
2. **Private recipe photos have public URLs.** `supabase/migrations/004_storage.sql` creates public recipe-images and book-covers buckets; `src/lib/upload.ts` returns public URLs. Later committed migrations do not make these buckets private. Anyone possessing a URL can access the photo independently of cookbook membership if deployed as committed. Validate actual staging configuration, migrate to membership-aware private storage, and update upload/display/public-share paths together.
3. **Stripe retry recovery is broken.** In `src/app/api/billing/webhook/route.ts:42`, an existing unprocessed/failed event passes the duplicate handling branch but still reaches the unconditional `inserted.error` return at line 55. Retries therefore return 500 without recovering. Add executable retry and duplicate tests.
4. **Stripe writes can fail silently.** The subscription upsert at `src/app/api/billing/webhook/route.ts:22` ignores returned Supabase errors. Other status/payment writes also ignore errors. An event can be marked processed despite failed entitlement updates. Check errors and make event ordering/concurrent retries safe before paid launch.
5. **Permission assurance is incomplete.** `tests/freeSharing.test.mjs` executes selected migrations, not the entire migration chain. Attachment tests mock Storage; they do not execute real Storage policies. No full browser smoke suite/config was found. Extend negative tests to photos, removed members, groceries, meal plans, all relevant tables, and the complete schema.

## Additional hardening

- Upload checks are client-side MIME/8 MB checks; no resizing or compression in the upload helper. Recipe upload policies do not bind the object prefix to the authenticated uploader. Enforce bucket size/type limits and ownership, and test phone photos and renamed invalid files.
- `src/lib/supabase/service.ts` lacks an explicit `server-only` import. Add the build-time guard to protect future imports of the privileged client.
- Migration filenames have duplicate numeric prefixes 026 and 027. Verify migration-tool compatibility and the exact applied history before release; do not rename already applied migrations casually.
- No `.github` CI configuration was found. Confirm deployment quality gates exist elsewhere or add repeatable lint/test/build/version gates.
- AI recipe generation has a database allowance implementation; burst throttling alone is instance-local. Test allowance concurrency and provider failure recovery on staging.

## Remaining launch evidence

Use a dedicated staging project with synthetic accounts and data:

- Full signup/sign-in/sign-out, email code delivery, invite expiration/reuse/wrong recipient, and session refresh.
- Keeper, Contributor, Family, anonymous, unrelated user, and removed member access matrix for database and Storage.
- Recipe create/edit/delete, image replace/delete, original attachments, cookbook switching, groceries, meal planning, offline account switching, and intentional public sharing/revocation.
- Stripe test-mode purchase, cancellation, failed payment, duplicate event, failed-event replay, out-of-order events, and simultaneous delivery.
- Mobile Safari on a real iPhone plus desktop/browser smoke tests; slow connections, failed requests, loading/error/empty states.
- Large cookbook performance and concurrent mutation/load tests.
- Verify deployed migrations, environment separation, auth redirect allowlists, email sender/domain, and webhook configuration without printing secrets.
- Prove error alert delivery, perform a backup restore rehearsal, and document deployment rollback. Database backups and photo recovery must both be covered.

Production inspection or changes require the explicit approval required by AGENTS.md. Passing local checks does not establish production configuration, restore readiness, or real-device behavior.

Upstream references: [Next.js advisory](https://github.com/vercel/next.js/security/advisories/GHSA-26hh-7cqf-hhc6), [PDF.js advisory](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j).
