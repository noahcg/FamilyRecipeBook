# Admin-Only Web Push Notifications — Implementation Plan

## Context

The Home Cooked app currently has no way to alert the admin (`ADMIN_EMAILS`) in real time when something noteworthy happens. The user base is small enough that every new signup is meaningful, and unattended server errors silently rot. Email via Resend works but is laggy and easy to ignore.

This plan adds **true Web Push notifications (PWA)** delivered to the admin's installed PWA / browser. Two event sources to start:

1. **New user signup** — fire when the Supabase auth `signup` webhook hits.
2. **Server errors / failed actions** — fire when a server action or API route catches an unexpected error.

Single admin (env-var-defined), so no multi-tenant subscription routing — just a small table holding the admin's per-device subscriptions.

## What already exists (reuse)

- `src/lib/admin.ts` — `isAdminEmail()`, `requireAdmin()`, `isAdminConfigured()`. Identity is settled.
- `src/components/pwa/ServiceWorkerRegistration.tsx` — already registers `/sw.js` on every page load. New push handlers go into the existing SW file, no new registration plumbing.
- `public/sw.js` — extend with `push` and `notificationclick` event listeners.
- `src/app/api/auth/send-email/route.ts` — Supabase auth webhook handler, already verifies signatures, already branches on `actionType === "signup"` (line 120). Hook the admin push notification in right next to the welcome-email send at line 133.
- `src/app/app/admin/page.tsx` — server component admin console; mount a small client-component toggle here.
- `src/lib/supabase/service.ts` — service-role client used by admin paths; reuse for reading the subscriptions table from the push-send helper.
- `.env.local.example` — extend with VAPID env vars.

## Architecture

```
Event source                Server                            Browser / PWA
─────────────              ──────────────────              ────────────────
Supabase signup ─webhook─▶ /api/auth/send-email ─┐
Server action error  ────▶ notifyAdminOfError() ─┤
                                                  │
                                                  ▼
                                         sendAdminPush(payload)
                                         (reads admin_push_subscriptions,
                                          calls web-push lib)
                                                  │
                                              push event
                                                  ▼
                                         sw.js push handler ─▶ notification
                                                                    │
                                                              click ▼
                                                         opens /app/admin
```

## Files to add / modify

### New files

- **`supabase/migrations/NNN_admin_push_subscriptions.sql`** — table:
  ```sql
  create table admin_push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users on delete cascade,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    user_agent text,
    created_at timestamptz not null default now()
  );
  alter table admin_push_subscriptions enable row level security;
  -- No anon/auth policies; access only via service-role from server actions.
  ```
  Service-role-only access — match the pattern in `src/app/app/admin/page.tsx` which uses `createServiceClient()`. No need to write user-facing RLS policies because subscribe/unsubscribe go through server actions that already gate on `requireAdmin()`.

- **`src/lib/push/sendAdminPush.ts`** — server-only helper:
  ```ts
  // sendAdminPush({ title, body, url? }): Promise<void>
  // - Reads all rows from admin_push_subscriptions via service client.
  // - Calls web-push.sendNotification() for each.
  // - On 410/404 response, deletes the dead subscription row.
  // - Silently no-ops if VAPID keys not configured (so dev doesn't crash).
  ```

- **`src/lib/push/vapid.ts`** — tiny helper exposing `getVapidPublicKey()` (returned to the client) and `configureWebPush()` (called once before sending). Reads `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` env vars.

- **`src/lib/actions/admin-push.ts`** — server actions:
  - `subscribeAdminToPush(subscription)` — `requireAdmin()`, then upsert subscription row by `endpoint`.
  - `unsubscribeAdminFromPush(endpoint)` — `requireAdmin()`, then delete row.
  - `getAdminPushPublicKey()` — returns `VAPID_PUBLIC_KEY` for the client subscribe flow.

- **`src/lib/admin-error.ts`** — `notifyAdminOfError(stage: string, error: unknown, context?: Record<string, unknown>)`. Wraps `sendAdminPush` with:
  - In-memory throttle: dedupe by `stage` hash, suppress identical signatures for N minutes (prevents flood from a hot loop).
  - Always logs to `console.error` even when push is suppressed.
  - Never throws — error notification must never break the calling path.

- **`src/components/admin/PushSubscriptionToggle.tsx`** — client component on the admin page:
  - Shows current permission/subscription state.
  - Button: "Enable push notifications" → requests permission, calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, posts to `subscribeAdminToPush` action.
  - Button: "Disable" → unsubscribe + call action.
  - Handle browser-unsupported, permission-denied, and "subscribed on this device already" states.

### Modified files

- **`public/sw.js`** — append `push` and `notificationclick` handlers. Push handler parses the JSON payload, calls `self.registration.showNotification(title, { body, data: { url } })`. Click handler opens `data.url` (default `/app/admin`) via `clients.openWindow()`, reusing an existing tab if present.
  - Bump `CACHE_NAME` from `home-cooked-static-v3` → `v4` so existing installs pick up the new SW.

- **`src/app/api/auth/send-email/route.ts`** — after the welcome email is sent (line 133), call:
  ```ts
  await notifyAdminOfNewSignup({ email: user.email, fullName }).catch(() => {});
  ```
  Implemented in `src/lib/push/sendAdminPush.ts` or inline; wrap in `.catch()` so a push failure never blocks the signup confirmation email response.

- **`src/app/app/admin/page.tsx`** — render `<PushSubscriptionToggle />` near the top of the page (e.g., in the header block around lines 108–138). The component is client-only; no server props needed beyond the public VAPID key, which can come from a small async server-component wrapper or be fetched on mount via `getAdminPushPublicKey()`.

- **`package.json`** — add deps:
  - `web-push` (runtime)
  - `@types/web-push` (dev)

- **`.env.local.example`** — add:
  ```
  VAPID_PUBLIC_KEY=
  VAPID_PRIVATE_KEY=
  VAPID_SUBJECT=mailto:noahcg@gmail.com
  ```

### Error hookup — seed spots only

Don't wrap every server action in this plan. Instead, add `notifyAdminOfError("stage-name", err)` to these high-signal spots so the plumbing is proven:

- `src/app/api/auth/send-email/route.ts` — inside the existing `fail()` helper (line 45). Single line change.
- `src/lib/actions/books.ts` — `createBook` catch path.
- `src/lib/actions/members.ts` — `inviteMember` catch path.

A follow-up task can extend coverage to other actions once you see how noisy this is in practice.

## Setup steps the user must do

1. Generate VAPID keys: `npx web-push generate-vapid-keys` (after installing the package). Add to `.env.local` and Vercel project env (production + preview).
2. Run the new migration in Supabase.
3. After deploy: visit `/app/admin` on the device(s) you want notifications on, click "Enable push notifications", grant browser permission. For best results on iOS, install the PWA to home screen first — Web Push on iOS Safari only works from an installed PWA.

## Verification

End-to-end test (run after implementation):

1. `npm run lint && npm run build` — clean.
2. Local dev (`npm run dev`):
   - Visit `/app/admin` as the admin user → "Enable push notifications" appears, click it, grant permission.
   - Verify a row appears in `admin_push_subscriptions` (Supabase Studio).
   - Trigger a fake signup: use the test path or create a throwaway account → confirm a notification fires.
   - Trigger an error: temporarily throw in `createBook`, attempt creation → confirm error notification fires once, and that repeated triggers within the throttle window do not flood.
3. Disable + re-enable cycle: clicking "Disable" removes the row; re-subscribe creates a fresh row.
4. SW update: with a previously-cached install, confirm bumped `CACHE_NAME` causes the new SW to activate (DevTools → Application → Service Workers shows the new version).
5. iOS check (if accessible): install PWA to home screen, repeat subscribe + test signup. Confirms `userVisibleOnly: true` and VAPID flow work on the most fragile target.

## Out of scope (named so we don't drift)

- Per-event preferences UI (e.g., "only notify on signups, not errors") — push to a future task if it gets noisy.
- Backfilling error notifications across every server action — seed three spots only.
- Notifications for non-admin users / family members — explicitly admin-only.
- Migration of any data from Resend-based admin alerts (none exist).
- Sentry / external error tracking — Web Push is not a replacement; it's a heads-up channel.
