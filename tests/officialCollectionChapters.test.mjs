import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

// Exercise real PostgreSQL functions and RLS in memory. No environment variables
// or connected Supabase projects are read by this suite.
test('public collection chapters expose only ordered counts from published source recipes', async t => {
  const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls; create role supabase_auth_admin;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,created_at timestamptz not null default now(),raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user::text) $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner uuid);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
    grant usage on schema auth,storage to anon,authenticated,service_role;
  `);
  const dir = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(dir)).filter(name => name.endsWith('.sql')).sort()) {
    const sql = (await readFile(new URL(file, dir), 'utf8')).replace('create extension if not exists "pgcrypto";', '');
    try { await db.exec(sql); } catch (error) { throw new Error(`Migration ${file}: ${error.message}`, { cause: error }); }
  }
  // Prove that even broad default table grants do not make private family data
  // accessible to anonymous visitors or unrelated signed-in users.
  await db.exec('grant usage on schema public to anon,authenticated,service_role; grant select,insert,update,delete on all tables in schema public,storage to anon,authenticated,service_role;');

  async function as(id, fn, role = id ? 'authenticated' : 'anon') {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || '']);
    await db.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
    await db.exec(`set role ${role}`);
    try { return await fn(); } finally {
      await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); select set_config('request.jwt.claim.role','',false)");
    }
  }
  const service = fn => as(null, fn, 'service_role');
  async function user() {
    const id = randomUUID();
    await db.query('insert into auth.users(id,email) values ($1,$2)', [id, `${id}@example.com`]);
    return id;
  }
  async function book(owner) {
    const id = randomUUID();
    await service(() => db.query("insert into recipe_books(id,title,description,owner_id,sharing_enabled) values ($1,'PRIVATE SOURCE TITLE','PRIVATE DESCRIPTION',$2,true)", [id, owner]));
    return id;
  }
  async function category(bookId, name, position) {
    const id = randomUUID();
    await service(() => db.query('insert into book_categories(id,book_id,name,position) values ($1,$2,$3,$4)', [id, bookId, name, position]));
    return id;
  }
  async function recipe(bookId, owner, categoryId = null, hidden = false) {
    const id = randomUUID();
    await service(() => db.query("insert into recipes(id,book_id,title,description,story,photo_url,created_by,category_id,moderation_hidden) values ($1,$2,'PRIVATE RECIPE TITLE','PRIVATE RECIPE DESCRIPTION','PRIVATE STORY','https://private.example/photo',$3,$4,$5)", [id, bookId, owner, categoryId, hidden]));
    return id;
  }
  async function publish(bookId, owner, slug) {
    return service(() => db.query("select * from configure_official_collection($1,$2,$3,'Seasonal collection','Public description','#2F4F3F',true)", [owner, bookId, slug]));
  }
  const owner = await user(), otherOwner = await user(), visitor = await user();
  const source = await book(owner), privateBook = await book(otherOwner);
  const later = await category(source, 'Sweet finishes', 40);
  const first = await category(source, 'At the table', -10);
  const hiddenOnly = await category(source, 'Hidden chapter', -20);
  await category(source, 'Empty chapter', -30);
  const otherCategory = await category(privateBook, 'PRIVATE OTHER CHAPTER', -100);
  await recipe(source, owner, later);
  await recipe(source, owner, first);
  await recipe(source, owner, first);
  await recipe(source, owner, hiddenOnly, true);
  await recipe(source, owner, later, true);
  await recipe(source, owner);
  // A category FK alone does not prove that category belongs to this source.
  await recipe(source, owner, otherCategory);
  await recipe(privateBook, otherOwner, otherCategory);
  const configured = (await publish(source, owner, 'holiday-chapters')).rows[0];
  const chapters = (actor = null, slug = 'holiday-chapters') => as(actor, () => db.query('select * from official_collection_chapters($1)', [slug]));
  const expected = [
    { name: 'At the table', recipe_count: 2 },
    { name: 'Sweet finishes', recipe_count: 1 },
    { name: 'More recipes', recipe_count: 2 },
  ];

  await t.test('anonymous and unrelated authenticated visitors receive ordered chapter names and counts only', async () => {
    for (const actor of [null, visitor, owner]) {
      const result = await chapters(actor);
      assert.deepEqual(result.rows, expected);
      assert.deepEqual(result.fields.map(field => field.name), ['name', 'recipe_count']);
      const serialized = JSON.stringify(result.rows);
      for (const privateValue of ['PRIVATE', 'Hidden chapter', 'Empty chapter', source, configured.id, owner, otherCategory]) assert.equal(serialized.includes(privateValue), false);
    }
    const definition = (await db.query("select prosecdef,provolatile,proconfig from pg_proc where oid='official_collection_chapters(text)'::regprocedure")).rows[0];
    assert.equal(definition.prosecdef, true);
    assert.equal(definition.provolatile, 's');
    assert.deepEqual(definition.proconfig, ['search_path=""']);
    for (const role of ['anon', 'authenticated']) {
      assert.equal((await db.query('select has_function_privilege($1,$2,$3) as allowed', [role, 'public.official_collection_chapters(text)', 'EXECUTE'])).rows[0].allowed, true);
    }
  });

  await t.test('chapter preview never grants source table or signed-in recipe access', async () => {
    for (const actor of [null, visitor]) {
      for (const table of ['recipe_books', 'book_categories', 'recipes', 'recipe_ingredients', 'recipe_instructions', 'recipe_stories', 'recipe_reactions', 'book_members', 'activity_events']) {
        assert.deepEqual((await as(actor, () => db.query(`select * from ${table}`))).rows, []);
      }
      await assert.rejects(as(actor, () => db.query('select official_collection_recipes($1)', [configured.id])), /permission denied|Add this available collection/);
      await assert.rejects(as(actor, () => db.query('select official_collection_recipe($1,$2)', [configured.id, randomUUID()])), /permission denied|Add this available collection/);
    }
    await as(visitor, () => db.query('select join_official_collection($1)', [configured.id]));
    assert.deepEqual((await chapters(visitor)).rows, expected);
    assert.deepEqual((await as(visitor, () => db.query('select * from book_categories where book_id=$1', [source]))).rows, []);
  });

  await t.test('unknown, empty, unpublished, and owner-mismatched collections return no chapters', async () => {
    assert.deepEqual((await chapters(null, 'unknown-collection')).rows, []);
    assert.deepEqual((await chapters(null, null)).rows, []);
    assert.deepEqual((await chapters(null, 'PRIVATE SOURCE TITLE')).rows, []);
    await service(() => db.query('update official_collections set published=false where id=$1', [configured.id]));
    for (const actor of [null, visitor, owner]) assert.deepEqual((await chapters(actor)).rows, []);
    await service(() => db.query('update official_collections set published=true,publisher_id=$2 where id=$1', [configured.id, otherOwner]));
    assert.deepEqual((await chapters()).rows, []);
    await service(() => db.query('update official_collections set publisher_id=$2 where id=$1', [configured.id, owner]));
    assert.deepEqual((await chapters()).rows, expected);

    const emptyOwner = await user();
    const emptyBook = await book(emptyOwner);
    await publish(emptyBook, emptyOwner, 'empty-collection');
    assert.deepEqual((await chapters(null, 'empty-collection')).rows, []);
  });

  await t.test('fallback merges into an existing More recipes chapter without duplicate labels', async () => {
    const more = await category(source, 'More recipes', 80);
    await recipe(source, owner, more);
    assert.deepEqual((await chapters()).rows, [
      expected[0], expected[1], { name: 'More recipes', recipe_count: 3 },
    ]);
    await service(() => db.query("update book_categories set name='First bites',position=-50 where id=$1", [first]));
    assert.deepEqual((await chapters()).rows[0], { name: 'First bites', recipe_count: 2 });
  });
});
