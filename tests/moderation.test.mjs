import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/027_privacy_preserving_moderation.sql", import.meta.url), "utf8");
const actions = await readFile(new URL("../src/lib/actions/moderation.ts", import.meta.url), "utf8");
const detail = await readFile(new URL("../src/app/app/admin/moderation/[caseId]/page.tsx", import.meta.url), "utf8");

test("moderation tables deny direct end-user access and only queue case records", () => {
  assert.match(migration, /alter table public\.moderation_cases enable row level security/i);
  assert.match(migration, /Intentionally no policies/i);
  assert.match(actions, /from\("moderation_cases"\)/);
  assert.doesNotMatch(actions, /from\("recipes"\)\.select\("\*"\)/);
});

test("reports are duplicate-limited and rate-limited without exposing reporter data to targets", () => {
  assert.match(migration, /moderation_open_report_once_idx/);
  assert.match(actions, /count \?\? 0\) >= 5/);
  assert.match(actions, /23505/);
  assert.doesNotMatch(detail, /reported_by_user_id/);
});

test("moderation is reversible and never routes to account deletion", () => {
  assert.match(actions, /moderation_hidden: true/);
  assert.match(actions, /moderation_hidden: false/);
  assert.match(actions, /photo_url: null/);
  assert.doesNotMatch(actions, /deleteUser\(/);
  assert.doesNotMatch(actions, /account_deletions/);
  assert.doesNotMatch(actions, /\.from\("recipe_books"\)\.delete/);
});

test("critical-sensitive cases and previews fail closed", () => {
  assert.match(actions, /critical_sensitive/);
  assert.match(actions, /cannot be handled here/);
  assert.doesNotMatch(actions, /createSignedUrl/);
  assert.doesNotMatch(actions, /storage\.from/);
});

test("staff actions require a reason, note, confirmation, and audit entry", () => {
  assert.match(actions, /reasonCode: reasons/);
  assert.match(actions, /internalNote: z\.string\(\)\.trim\(\)\.min\(3\)/);
  assert.match(actions, /confirmed: z\.literal\(true\)/);
  assert.match(actions, /logAdminAction/);
});
