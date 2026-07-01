-- ─── Onboarding mini-guides (coachmarks) ─────────────────────
-- Tracks which contextual guides a user has already seen so their
-- opt-in beacons disappear once dismissed. Per-user, opt-out via the
-- "Show tips again" control in Settings (clears the array).
-- Column lives on an existing table, so no new GRANTs are needed.

alter table public.user_settings
  add column if not exists seen_guides text[] not null default '{}';
