import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/profileCompletion.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function loadProfileCheck(result) {
  const calls = [];
  const supabase = { from: (table) => ({ select: () => ({ eq: (key, id) => ({ maybeSingle: async () => {
    calls.push({ table, key, id });
    return result;
  } }) }) }) };
  const exports = {};
  Function("require", "exports", compiled)((name) => {
    if (name === "server-only") return {};
    if (name === "next/navigation") return { redirect: (path) => { throw new Error(`redirect:${path}`); } };
    if (name === "@/lib/supabase/server") return { createClient: async () => supabase };
    throw new Error(`Unexpected import: ${name}`);
  }, exports);
  return { ...exports, calls };
}

test("named users continue without a redirect", async () => {
  const check = loadProfileCheck({ data: { full_name: "  Alex  ", requires_profile_name: true }, error: null });
  assert.equal(await check.needsProfileName("user-1"), false);
  await check.requireProfileName("user-1", "/app");
  assert.deepEqual(check.calls[0], { table: "profiles", key: "id", id: "user-1" });
});

test("unnamed users are directed to complete their profile with their destination intact", async () => {
  for (const full_name of [null, "", "   "]) {
    const check = loadProfileCheck({ data: { full_name, requires_profile_name: true }, error: null });
    await assert.rejects(check.requireProfileName("user-1", "/invite/example?from=email"), (error) => {
      assert.equal(error.message, "redirect:/complete-profile?next=%2Finvite%2Fexample%3Ffrom%3Demail");
      return true;
    });
  }
});

test("existing unnamed users can continue without a new requirement", async () => {
  for (const full_name of [null, "", "  "]) {
    const check = loadProfileCheck({ data: { full_name, requires_profile_name: false }, error: null });
    assert.equal(await check.needsProfileName("existing-user"), false);
    await check.requireProfileName("existing-user", "/app");
  }
});

test("migration preserves old profile names and marks only subsequently created profiles", async (t) => {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec("create table profiles (id text primary key, full_name text); insert into profiles values ('old-blank', null), ('old-named', 'Existing Name');");
  const migration = await readFile(new URL("../supabase/migrations/048_new_user_profile_name.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec("insert into profiles (id, full_name) values ('new-blank', null), ('new-named', 'New Name');");
  const { rows } = await db.query("select * from profiles order by id");
  assert.deepEqual(rows, [
    { id: "new-blank", full_name: null, requires_profile_name: true },
    { id: "new-named", full_name: "New Name", requires_profile_name: true },
    { id: "old-blank", full_name: null, requires_profile_name: false },
    { id: "old-named", full_name: "Existing Name", requires_profile_name: false },
  ]);
});

test("missing profiles and database errors fail rather than treating a user as named", async () => {
  for (const result of [{ data: null, error: null }, { data: null, error: { message: "unavailable" } }]) {
    const check = loadProfileCheck(result);
    await assert.rejects(check.requireProfileName("user-1", "/app"), /Unable to load your profile/);
  }
});
