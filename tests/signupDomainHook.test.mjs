import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("signup hook blocks known disposable domains and respects specific exceptions", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec("create role anon; create role authenticated; create role supabase_auth_admin;");
  await db.exec(await readFile(new URL("../supabase/migrations/049_disposable_signup_domains.sql", import.meta.url), "utf8"));
  const check = async (email) => (await db.query("select public.check_signup_email_domain($1::jsonb) as result", [JSON.stringify({ user: { email } })])).rows[0].result;
  assert.equal((await check("person@MAILINATOR.COM")).error.http_code, 400);
  assert.equal((await check("person@sub.mailinator.com")).error.http_code, 400);
  assert.deepEqual(await check("person@notmailinator.com"), {});
  assert.deepEqual(await check("person@privaterelay.appleid.com"), {});
  await db.exec("insert into public.signup_email_domain_rules values ('safe.mailinator.com', false)");
  assert.deepEqual(await check("person@safe.mailinator.com"), {});
  await db.exec("set role anon");
  await assert.rejects(db.query("select public.check_signup_email_domain('{}'::jsonb)"), /permission denied/);
  await assert.rejects(db.query("select * from public.signup_email_domain_rules"), /permission denied/);
  await db.exec("reset role; set role supabase_auth_admin");
  assert.equal((await check("person@mailinator.com")).error.http_code, 400);
});
