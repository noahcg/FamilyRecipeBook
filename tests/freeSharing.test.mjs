import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Run against embedded PostgreSQL without touching any Supabase environment:
// PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node --test tests/freeSharing.test.mjs
const modulePath = process.env.PGLITE_MODULE || "@electric-sql/pglite";
test("Free cookbook sharing database permissions and limits", async (t) => {
  const { PGlite } = await import(modulePath);
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
  `);
  for (const name of ["001_initial_schema", "002_helper_functions", "003_rls_policies", "012_cookbook_sharing", "013_tighten_book_members_insert_policy", "026_billing_entitlements", "027_fix_billing_creation_trigger", "028_admin_granted_entitlements", "029_free_cookbook_sharing", "030_cookbook_recipe_entitlements"]) {
    const sql = (await readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8")).replace('create extension if not exists "pgcrypto";', '');
    await db.exec(sql);
  }
  await db.exec('grant usage on schema public to authenticated, anon; grant select, insert, update, delete on all tables in schema public to authenticated, anon;');
  async function user() {
    const id = randomUUID();
    await db.query("insert into auth.users(id,email) values ($1,$2)", [id, `${id}@example.com`]);
    return id;
  }
  async function book() {
    const owner = await user();
    const id = randomUUID();
    await db.query("insert into public.recipe_books(id,title,owner_id,sharing_enabled) values ($1,'Test',$2,true)", [id, owner]);
    return { id, owner };
  }
  async function invite(b, recipient, role = 'family', expiry = "now() + interval '7 days'") {
    const token = randomUUID();
    await db.query(`insert into public.book_invitations(book_id,email,role,token,invited_by,expires_at) values ($1,$2,$3,$4,$5,${expiry})`, [b.id, `${recipient}@example.com`, role, token, b.owner]);
    return token;
  }
  async function asUser(id, fn) {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
    await db.exec(`set role ${id ? 'authenticated' : 'anon'}`);
    try { return await fn(); } finally { await db.exec("reset role"); }
  }
  async function accepts(id, token) { return asUser(id, () => db.query("select public.accept_book_invitation($1) as id", [token])); }
  async function seats(b) { return (await db.query("select public.book_sharing_seats($1) as count", [b.id])).rows[0].count; }

  await t.test("three distinct reservations, duplicate emails, expiration, cancellation and replacement", async () => {
    const b = await book(); const people = await Promise.all([user(), user(), user(), user()]);
    const tokens = [];
    for (const p of people.slice(0,3)) tokens.push(await invite(b,p));
    await invite(b, people[0]);
    assert.equal(await seats(b), 3);
    await assert.rejects(invite(b,people[3]), /3 free sharing spots/);
    await db.query("delete from book_invitations where token = $1", [tokens[1]]);
    await invite(b, people[3]);
    assert.equal(await seats(b), 3);
    await db.query("update book_invitations set expires_at = now() - interval '1 second' where token = $1", [tokens[2]]);
    await invite(b, people[2]);
    assert.equal(await seats(b), 3);
  });
  await t.test("acceptance at capacity consumes its reservation once and rejects wrong/anonymous recipients", async () => {
    const b = await book(); const people = await Promise.all([user(), user(), user(), user()]);
    const token = await invite(b,people[0]); await invite(b,people[1]); await invite(b,people[2]);
    await assert.rejects(accepts(people[3],token), /email address/);
    await assert.rejects(accepts(null,token), /permission denied/);
    await accepts(people[0],token);
    assert.equal(await seats(b),3);
    await assert.rejects(accepts(people[0],token), /invalid or has expired/);
    await assert.rejects(db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'family')", [b.id, people[3]]), /3 free sharing spots/);
  });
  await t.test("Free role enforcement covers direct inserts and promotion; Plus and grants allow Contributors", async () => {
    const b = await book(); const p = await user();
    await assert.rejects(invite(b,p,'contributor'), /Family members only/);
    await assert.rejects(db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'keeper')", [b.id,p]), /Family members only/);
    await accepts(p,await invite(b,p));
    await assert.rejects(db.query("update book_members set role = 'contributor' where book_id = $1 and user_id = $2", [b.id,p]), /Family members only/);
    await db.query("update billing_accounts set status = 'active', plan = 'plus' where user_id = $1", [b.owner]);
    await invite(b, await user(), 'contributor');
    await db.query("update billing_accounts set status = 'free', plan = 'free', grandfathered_plus = true where user_id = $1", [b.owner]);
    const contributor = await user(); await accepts(contributor, await invite(b,contributor,'contributor'));
    // Reinviting an existing Contributor as Family must not downgrade them.
    await accepts(contributor,await invite(b,contributor));
    assert.equal((await db.query("select role from book_members where book_id=$1 and user_id=$2",[b.id,contributor])).rows[0].role,'contributor');
  });
  await t.test("downgrade preserves existing members but rejects new members and stale Contributor invites", async () => {
    const b = await book();
    await db.query("update billing_accounts set status = 'trialing' where user_id = $1", [b.owner]);
    for(let i=0;i<4;i++) { const p=await user(); await accepts(p,await invite(b,p)); }
    const pending = await user(); const token = await invite(b,pending,'contributor');
    const family = await user(); const familyToken = await invite(b,family);
    await db.query("update billing_accounts set status = 'canceled' where user_id = $1", [b.owner]);
    assert.equal((await db.query("select count(*)::int as n from book_members where book_id=$1",[b.id])).rows[0].n,5);
    await assert.rejects(accepts(pending,token), /Contributor invitation needs Plus/);
    await assert.rejects(accepts(family,familyToken), /3 free sharing spots/);
  });
  await t.test("downgraded owners can add people only to their oldest cookbook", async () => {
    const first = await book();
    await db.query("update billing_accounts set status='active', plan='plus' where user_id=$1",[first.owner]);
    const second = { id: randomUUID(), owner: first.owner };
    await db.query("insert into recipe_books(id,title,owner_id,sharing_enabled,created_at) values ($1,'Second',$2,true,now() + interval '1 minute')",[second.id,second.owner]);
    const existing=await user(); await accepts(existing,await invite(second,existing));
    const pending=await user(); const token=await invite(second,pending);
    await db.query("update billing_accounts set status='canceled', plan='free' where user_id=$1",[first.owner]);
    await assert.rejects(invite(second,await user()), /oldest cookbook/);
    await assert.rejects(accepts(pending,token), /oldest cookbook/);
    const p=await user(); await accepts(p,await invite(first,p));
    await asUser(first.owner,async()=> {
      assert.equal((await db.query("select * from get_book_sharing_allowance($1)",[first.id])).rows[0].can_share,true);
      assert.equal((await db.query("select * from get_book_sharing_allowance($1)",[second.id])).rows[0].can_share,false);
    });
    assert.equal((await db.query("select count(*)::int as n from book_members where book_id=$1",[second.id])).rows[0].n,2);
  });
  await t.test("disabled sharing blocks invitation and acceptance without partial writes", async () => {
    const b = await book(); const p=await user(); const token=await invite(b,p);
    await db.query("update recipe_books set sharing_enabled=false where id=$1",[b.id]);
    await assert.rejects(accepts(p,token), /Sharing is turned off/);
    await assert.rejects(invite(b,await user()), /Turn on sharing/);
    assert.equal((await db.query("select accepted_at from book_invitations where token=$1",[token])).rows[0].accepted_at,null);
    assert.equal((await db.query("select count(*)::int as n from book_members where book_id=$1",[b.id])).rows[0].n,1);
  });
  await t.test("Family, Contributor, unrelated members and anonymous users cannot manage/read private sharing allowance", async () => {
    const b=await book(); const family=await user(); await accepts(family,await invite(b,family));
    await db.query("update billing_accounts set grandfathered_plus=true where user_id=$1",[b.owner]);
    const contributor=await user(); await accepts(contributor,await invite(b,contributor,'contributor'));
    const outsider=(await book()).owner;
    for(const id of [family,contributor,outsider,null]) {
      await assert.rejects(asUser(id,()=>db.query("select * from get_book_sharing_allowance($1)",[b.id])), /Only the keeper|permission denied/);
      await assert.rejects(asUser(id,()=>invite(b,randomUUID())), /row-level security/);
    }
    await asUser(b.owner,async()=> {
      const result=(await db.query("select * from get_book_sharing_allowance($1)",[b.id])).rows[0];
      assert.equal(result.is_free,false); assert.equal(result.used,2); assert.equal(result.seat_limit,null);
    });
    await asUser(outsider,async()=>assert.equal((await db.query("select * from book_members where book_id=$1",[b.id])).rows.length,0));
  });
  await t.test("Family recipients can read and add memories/reactions but cannot edit recipes", async () => {
    const b=await book(); const family=await user(); await accepts(family,await invite(b,family));
    const recipe=randomUUID();
    await db.query("insert into recipes(id,book_id,title,created_by) values ($1,$2,'Original',$3)",[recipe,b.id,b.owner]);
    await asUser(family,async()=> {
      assert.equal((await db.query("select title from recipes where id=$1",[recipe])).rows[0].title,'Original');
      await db.query("insert into recipe_stories(recipe_id,author_id,body) values ($1,$2,'Family memory')",[recipe,family]);
      await db.query("insert into recipe_reactions(recipe_id,user_id,type) values ($1,$2,'love')",[recipe,family]);
      await assert.rejects(db.query("insert into recipes(book_id,title,created_by) values ($1,'Blocked',$2)",[b.id,family]), /row-level security|CONTRIBUTOR_REQUIRES_PLUS/);
      assert.equal((await db.query("update recipes set title='Blocked' where id=$1 returning id",[recipe])).rows.length,0);
      assert.equal((await db.query("delete from recipes where id=$1 returning id",[recipe])).rows.length,0);
    });
    const unrelated=await user();
    await asUser(unrelated,async()=> {
      assert.equal((await db.query("select * from recipes where id=$1",[recipe])).rows.length,0);
      await assert.rejects(db.query("insert into recipe_stories(recipe_id,author_id,body) values ($1,$2,'Blocked')",[recipe,unrelated]), /row-level security/);
      await assert.rejects(db.query("insert into recipe_reactions(recipe_id,user_id,type) values ($1,$2,'love')",[recipe,unrelated]), /row-level security/);
    });
  });
  await t.test("Plus owners sponsor Free Contributors without consuming the Contributor's personal recipe allowance", async () => {
    const personal = await book();
    for (let i = 0; i < 49; i++) {
      await db.query("insert into recipes(book_id,title,created_by) values ($1,$2,$3)",[personal.id,`Personal ${i}`,personal.owner]);
    }
    const paid = await book();
    await db.query("update billing_accounts set status='active', plan='plus' where user_id=$1",[paid.owner]);
    await accepts(personal.owner,await invite(paid,personal.owner,'contributor'));
    await asUser(personal.owner,async()=> {
      await db.query("insert into recipes(book_id,title,created_by) values ($1,'Shared contribution',$2)",[paid.id,personal.owner]);
      await db.query("insert into recipes(book_id,title,created_by) values ($1,'Personal 50',$2)",[personal.id,personal.owner]);
      await assert.rejects(db.query("insert into recipes(book_id,title,created_by) values ($1,'Personal 51',$2)",[personal.id,personal.owner]), /RECIPE_LIMIT_REACHED/);
    });
    assert.equal((await db.query("select count(*)::int as n from recipes where book_id=$1",[personal.id])).rows[0].n,50);
    assert.equal((await db.query("select count(*)::int as n from recipes where book_id=$1",[paid.id])).rows[0].n,1);
  });
  await t.test("downgraded Plus cookbooks make existing Contributors read-only", async () => {
    const b=await book(); const contributor=await user();
    await db.query("update billing_accounts set status='active', plan='plus' where user_id=$1",[b.owner]);
    await accepts(contributor,await invite(b,contributor,'contributor'));
    const recipe=randomUUID();
    await asUser(contributor,()=>db.query("insert into recipes(id,book_id,title,created_by) values ($1,$2,'Contributor recipe',$3)",[recipe,b.id,contributor]));
    await db.query("update billing_accounts set status='canceled', plan='free' where user_id=$1",[b.owner]);
    await asUser(contributor,async()=> {
      await assert.rejects(db.query("insert into recipes(book_id,title,created_by) values ($1,'Blocked',$2)",[b.id,contributor]), /row-level security|CONTRIBUTOR_REQUIRES_PLUS/);
      assert.equal((await db.query("update recipes set title='Blocked' where id=$1 returning id",[recipe])).rows.length,0);
      assert.equal((await db.query("delete from recipes where id=$1 returning id",[recipe])).rows.length,0);
      assert.equal((await db.query("select public.can_contribute_to_book($1,$2) as allowed",[b.id,contributor])).rows[0].allowed,false);
    });
  });
  await t.test("Keepers cannot change ownership to bypass the owner plan or alter Free cookbook ordering", async () => {
    const b=await book(); const plus=await user();
    await db.query("update billing_accounts set status='active', plan='plus' where user_id=$1",[plus]);
    await asUser(b.owner,async()=> {
      await assert.rejects(db.query("update recipe_books set owner_id=$1 where id=$2",[plus,b.id]), /ownership and creation date cannot be changed/);
      await assert.rejects(db.query("update recipe_books set created_at=now() - interval '1 year' where id=$1",[b.id]), /ownership and creation date cannot be changed/);
      assert.equal((await db.query("update recipe_books set title='Allowed title' where id=$1 returning title",[b.id])).rows[0].title,'Allowed title');
    });
    assert.equal((await db.query("select owner_id from recipe_books where id=$1",[b.id])).rows[0].owner_id,b.owner);
  });
  await db.close();
});
