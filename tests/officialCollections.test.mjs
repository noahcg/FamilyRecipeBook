import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

// Real PostgreSQL policy/function execution in memory; never uses .env or a
// connected Supabase project.
test('official collections preserve family privacy, ownership and Free allowances', async t => {
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
  assert.equal((await db.query("select has_table_privilege('authenticated','official_collections','INSERT') as allowed")).rows[0].allowed, false);
  assert.equal((await db.query("select has_table_privilege('authenticated','official_collection_readers','INSERT') as allowed")).rows[0].allowed, false);
  assert.equal((await db.query("select has_table_privilege('anon','official_collection_readers','SELECT') as allowed")).rows[0].allowed, false);
  // Broad baseline grants also prove RLS remains protective if future Supabase
  // defaults grant table privileges. Mutation remains possible only via RPC.
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
  async function book(owner, title = 'Private source') {
    const id = randomUUID();
    await service(() => db.query('insert into recipe_books(id,title,description,owner_id,sharing_enabled) values ($1,$2,$3,$4,true)', [id, title, 'PRIVATE SOURCE DESCRIPTION', owner]));
    return id;
  }
  const owner = await user(), free = await user(), plus = await user(), family = await user(), contributor = await user(), unrelated = await user();
  await db.query("update billing_accounts set plan='plus',status='active' where user_id in ($1,$2)", [plus, unrelated]);
  const source = await book(owner), unrelatedBook = await book(unrelated, 'Unrelated private family');
  await service(() => db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'family'),($1,$3,'contributor')", [unrelatedBook, family, contributor]));
  const recipe = randomUUID(), hiddenRecipe = randomUUID(), privateRecipe = randomUUID();
  const photo = `https://collection-test.supabase.co/storage/v1/object/public/recipe-images/${owner}/holiday.webp`;
  await service(() => db.query(`insert into recipes(id,book_id,title,description,story,created_by,photo_url,import_metadata)
    values ($1,$2,'Holiday pie','A festive pie','PRIVATE EMBEDDED STORY',$3,$4,'{"privateImport":"private-source"}')`, [recipe, source, owner, photo]));
  await service(() => db.query("insert into recipes(id,book_id,title,created_by,moderation_hidden) values ($1,$2,'Hidden pie',$3,true),($4,$5,'Private pie',$6,false)", [hiddenRecipe, source, owner, privateRecipe, unrelatedBook, unrelated]));
  await service(() => db.query("insert into recipe_ingredients(recipe_id,position,item,quantity,unit,note,group_label) values ($1,2,'Sugar','1','cup','Fine','Filling'),($1,1,'Flour','2','cups',null,'Crust')", [recipe]));
  await service(() => db.query("insert into recipe_instructions(recipe_id,position,body,group_label) values ($1,2,'Bake.','Bake'),($1,1,'Mix.','Prepare')", [recipe]));
  await service(() => db.query("insert into recipe_stories(recipe_id,author_id,body) values ($1,$2,'PRIVATE FAMILY NOTE')", [recipe, owner]));
  await service(() => db.query("insert into recipe_reactions(recipe_id,user_id,type) values ($1,$2,'love')", [recipe, owner]));
  await service(() => db.query("insert into activity_events(book_id,actor_id,type,metadata) values ($1,$2,'private_event','{\"private\":true}')", [source, owner]));
  const configure = (published = true, overrides = {}) => service(() => db.query(
    'select * from configure_official_collection($1,$2,$3,$4,$5,$6,$7)',
    [overrides.actor ?? owner, overrides.book ?? source, overrides.slug ?? 'holiday-recipes', 'Holiday Recipes', 'A free seasonal collection.', '#2F4F3F', published]
  ));
  let collection;

  await t.test('publication is privileged, explicit and rejects existing family access', async () => {
    for (const actor of [owner, family, contributor, unrelated, null]) {
      await assert.rejects(as(actor, () => db.query('select * from configure_official_collection($1,$2,$3,$4,$5,$6,true)', [owner, source, 'holiday-recipes', 'Holiday', 'Description', '#2F4F3F'])), /permission denied/);
    }
    await assert.rejects(configure(true, { actor: unrelated }), /cookbook you own/);
    await service(() => db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'family')", [source, family]));
    await assert.rejects(configure(), /Remove other cookbook members/);
    await assert.rejects(configure(false), /Remove other cookbook members/);
    assert.equal((await db.query('select count(*)::int as n from book_members where book_id=$1', [source])).rows[0].n, 2);
    await service(() => db.query('delete from book_members where book_id=$1 and user_id=$2', [source, family]));
    const token = randomUUID();
    await service(() => db.query("insert into book_invitations(book_id,email,role,token,invited_by,expires_at) values ($1,$2,'family',$3,$4,now()+interval '1 day')", [source, `${family}@example.com`, token, owner]));
    await assert.rejects(configure(), /Cancel pending family invitations/);
    await service(() => db.query('delete from book_invitations where book_id=$1', [source]));
    const group = await as(owner, () => db.query("select * from create_book_invitation_link($1,'family')", [source]));
    await assert.rejects(configure(), /Cancel pending family invitations/);
    await as(owner, () => db.query('select cancel_book_invitation_link($1)', [group.rows[0].id]));
    // A Plus source may contain someone else's recipe, even after they leave.
    await db.query("update billing_accounts set plan='plus',status='active' where user_id=$1", [owner]);
    const otherAuthored = randomUUID();
    await service(() => db.query("insert into recipes(id,book_id,title,created_by) values ($1,$2,'Other author',$3)", [otherAuthored, source, contributor]));
    await assert.rejects(configure(), /Only owner-authored recipes/);
    await service(() => db.query('delete from recipes where id=$1', [otherAuthored]));
    await db.query("update billing_accounts set plan='free',status='free' where user_id=$1", [owner]);
    collection = (await configure()).rows[0];
    const audit = (await db.query("select * from admin_actions where action='configure_official_collection'")).rows;
    assert.equal(audit.length, 1);
    assert.equal(audit[0].actor_id, owner);
    assert.deepEqual(audit[0].metadata, { published: true, collectionId: collection.id });
    assert.equal(audit[0].summary.includes('Holiday'), false);
  });

  const join = actor => as(actor, () => db.query('select join_official_collection($1)', [collection.id]));
  const list = (actor, search = '', page = 0) => as(actor, () => db.query('select official_collection_recipes($1,$2,$3) as data', [collection.id, search, page]));
  const detail = (actor, id = recipe) => as(actor, () => db.query('select official_collection_recipe($1,$2) as data', [collection.id, id]));
  const image = (actor, id = recipe) => as(actor, () => db.query('select official_collection_photo($1,$2) as data', [collection.id, id]));

  await t.test('public preview contains only declared metadata; sign-in alone does not reveal recipes', async () => {
    const preview = (await as(null, () => db.query("select * from official_collection_preview('holiday-recipes')"))).rows[0];
    assert.deepEqual(preview, { id: collection.id, slug: 'holiday-recipes', title: 'Holiday Recipes', description: 'A free seasonal collection.', cover_style: '#2F4F3F' });
    for (const actor of [null, free, plus, family, contributor, unrelated, owner]) {
      await assert.rejects(list(actor), /permission denied|Add this available collection/);
      await assert.rejects(detail(actor), /permission denied|Add this available collection/);
      await assert.rejects(image(actor), /permission denied|Add this available collection/);
      assert.equal((await as(actor, () => db.query('select * from official_collections'))).rows.length, 0);
    }
    await assert.rejects(join(null), /permission denied/);
    await assert.rejects(as(free, () => db.query('select official_collection_readable_book($1)', [collection.id])), /permission denied/);
    assert.equal((await as(free, () => db.query('select * from official_collection_library()'))).rows.length, 0);
  });

  await t.test('Free and Plus readers join idempotently without consuming personal capacity or sharing seats', async () => {
    for (const actor of [free, plus, family, contributor]) { await join(actor); await join(actor); }
    assert.equal((await db.query('select count(*)::int as n from official_collection_readers')).rows[0].n, 4);
    assert.equal((await db.query('select book_sharing_seats($1) as seats', [source])).rows[0].seats, 0);
    assert.equal((await db.query('select count(*)::int as n from book_members where book_id=$1', [source])).rows[0].n, 1);
    const own = await book(free, 'My own free cookbook');
    await as(free, () => db.query("insert into recipes(book_id,title,created_by) values ($1,'My recipe',$2)", [own, free]));
    await assert.rejects(book(free, 'Second owned cookbook'), /COOKBOOK_LIMIT_REACHED/);
    assert.equal((await as(free, () => db.query('select * from official_collection_library()'))).rows[0].recipe_count, 1);
    assert.equal((await as(free, () => db.query('select * from official_collection_readers'))).rows.length, 1);
    await assert.rejects(as(free, () => db.query('insert into official_collection_readers(collection_id,user_id) values ($1,$2)', [collection.id, unrelated])), /row-level security/);
    await assert.rejects(as(free, () => db.query('insert into official_collections(book_id,slug,title,description,cover_style,publisher_id) values ($1,$2,$3,$4,$5,$6)', [own, 'fake-official', 'Fake', 'Fake official', '#2F4F3F', free])), /row-level security/);
    assert.equal((await as(free, () => db.query('update official_collections set published=false where id=$1 returning *', [collection.id]))).rows.length, 0);
    assert.equal((await as(free, () => db.query('delete from official_collections where id=$1 returning *', [collection.id]))).rows.length, 0);
    assert.equal((await as(free, () => db.query('update official_collection_readers set user_id=$1 where user_id=$2 returning *', [unrelated, free]))).rows.length, 0);
  });

  await t.test('reader projections are ordered, narrowly scoped and exclude all private family activity', async () => {
    for (const actor of [free, plus, family, contributor]) {
      const summary = (await list(actor)).rows[0].data;
      assert.equal(summary.total, 1);
      assert.deepEqual(summary.recipes.map(row => row.id), [recipe]);
      assert.equal(summary.recipes[0].has_photo, true);
      assert.equal('photo_url' in summary.recipes[0], false);
      const full = (await detail(actor)).rows[0].data;
      assert.equal(full.title, 'Holiday pie');
      assert.deepEqual(full.ingredients.map(row => [row.item, row.group_label]), [['Flour', 'Crust'], ['Sugar', 'Filling']]);
      assert.deepEqual(full.instructions.map(row => [row.body, row.group_label]), [['Mix.', 'Prepare'], ['Bake.', 'Bake']]);
      for (const key of ['story', 'created_by', 'book_id', 'photo_url', 'import_metadata', 'reactions', 'stories', 'members', 'creator']) assert.equal(key in full, false, key);
      assert.equal(JSON.stringify(full).includes('PRIVATE'), false);
      assert.equal((await image(actor)).rows[0].data, photo);
      for (const id of [hiddenRecipe, privateRecipe, randomUUID()]) {
        assert.equal((await detail(actor, id)).rows[0].data, null);
        assert.equal((await image(actor, id)).rows[0].data, null);
      }
      for (const table of ['book_members', 'book_invitations', 'activity_events', 'book_categories']) {
        assert.equal((await as(actor, () => db.query(`select * from ${table} where book_id=$1`, [source]))).rows.length, 0, table);
      }
      assert.equal((await as(actor, () => db.query('select * from profiles where id=$1', [owner]))).rows.length, 0);
      for (const table of ['recipes', 'recipe_stories', 'recipe_reactions', 'recipe_ingredients', 'recipe_instructions']) {
        const field = table === 'recipes' ? 'id' : 'recipe_id';
        assert.equal((await as(actor, () => db.query(`select * from ${table} where ${field}=$1`, [recipe]))).rows.length, 0, table);
      }
      assert.equal((await as(actor, () => db.query('select can_read_private_media($1,$2) as allowed', ['recipe-images', `${owner}/holiday.webp`]))).rows[0].allowed, false);
    }
    assert.equal((await list(free, 'HOLIDAY')).rows[0].data.total, 1);
    assert.equal((await list(free, '%')).rows[0].data.total, 0); // Literal search, not a wildcard escape.
    assert.equal((await list(free, 'no-match')).rows[0].data.total, 0);
    await assert.rejects(list(free, '', -1), /valid recipe search and page/);
    await assert.rejects(list(free, 'x'.repeat(201)), /valid recipe search and page/);
  });

  await t.test('readers cannot edit content or its children; only the source owner maintains recipes', async () => {
    await db.query("update billing_accounts set plan='plus',status='active' where user_id=$1", [owner]);
    for (const actor of [free, plus, family, contributor, unrelated, null]) {
      assert.equal((await as(actor, () => db.query("update recipes set title='Changed' where id=$1 returning id", [recipe]))).rows.length, 0);
      assert.equal((await as(actor, () => db.query('delete from recipes where id=$1 returning id', [recipe]))).rows.length, 0);
      await assert.rejects(as(actor, () => db.query("insert into recipes(book_id,title,created_by) values ($1,'New',$2)", [source, actor || free])), /row-level security|owner-authored|permission denied/);
      await assert.rejects(as(actor, () => db.query("insert into recipe_ingredients(recipe_id,position,item) values ($1,3,'Unexpected')", [recipe])), /row-level security|permission denied/);
      await assert.rejects(as(actor, () => db.query("insert into recipe_instructions(recipe_id,position,body) values ($1,3,'Unexpected')", [recipe])), /row-level security|permission denied/);
      await assert.rejects(as(actor, () => db.query("insert into recipe_stories(recipe_id,author_id,body) values ($1,$2,'Unexpected')", [recipe, actor || free])), /row-level security|permission denied/);
      await assert.rejects(as(actor, () => db.query("insert into recipe_reactions(recipe_id,user_id,type) values ($1,$2,'love')", [recipe, actor || free])), /row-level security|permission denied/);
    }
    await as(owner, () => db.query("update recipes set title='Holiday pie, updated' where id=$1", [recipe]));
    assert.equal((await detail(free)).rows[0].data.title, 'Holiday pie, updated');
    await assert.rejects(as(owner, () => db.query('update recipe_books set owner_id=$2 where id=$1', [source, free])), /transferring cookbook ownership/);
    await assert.rejects(service(() => db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'family')", [source, unrelated])), /Official collections are maintained/);
    await assert.rejects(as(owner, () => db.query("select * from create_book_invitation_link($1,'family')", [source])), /official collection link/);
    await assert.rejects(as(owner, () => db.query("insert into book_invitations(book_id,email,role,token,invited_by,expires_at) values ($1,$2,'family',$3,$4,now()+interval '1 day')", [source, `${unrelated}@example.com`, randomUUID(), owner])), /official collection link/);
    await assert.rejects(service(() => db.query("insert into recipes(book_id,title,created_by) values ($1,'Non-owner',$2)", [source, contributor])), /owner-authored/);
  });

  await t.test('pagination is stable and excludes moderated recipes', async () => {
    for (let i = 0; i < 25; i++) {
      await service(() => db.query('insert into recipes(book_id,title,created_by) values ($1,$2,$3)', [source, `Recipe ${String(i).padStart(2, '0')}`, owner]));
    }
    const first = (await list(free)).rows[0].data, second = (await list(free, '', 1)).rows[0].data;
    assert.equal(first.total, 26);
    assert.equal(first.recipes.length, 24);
    assert.equal(second.total, 26);
    assert.equal(second.recipes.length, 2);
    assert.equal(new Set([...first.recipes, ...second.recipes].map(row => row.id)).size, 26);
    assert.equal((await list(free, '', 2)).rows[0].data.recipes.length, 0);
  });

  await t.test('remove, unpublish and reactivation revoke access without changing personal cookbooks', async () => {
    assert.equal((await as(unrelated, () => db.query('delete from official_collection_readers where user_id=$1 returning *', [free]))).rows.length, 0);
    await as(free, () => db.query('delete from official_collection_readers where collection_id=$1 and user_id=$2', [collection.id, free]));
    await assert.rejects(detail(free), /Add this available collection/);
    await assert.rejects(image(free), /Add this available collection/);
    assert.equal((await as(free, () => db.query('select * from official_collection_library()'))).rows.length, 0);
    assert.equal((await as(free, () => db.query('select * from recipe_books where owner_id=$1', [free]))).rows.length, 1);
    await join(free);
    await configure(false);
    assert.equal((await as(null, () => db.query("select * from official_collection_preview('holiday-recipes')"))).rows.length, 0);
    for (const actor of [free, plus, family, contributor]) {
      await assert.rejects(list(actor), /Add this available collection/);
      await assert.rejects(detail(actor), /Add this available collection/);
      await assert.rejects(image(actor), /Add this available collection/);
      await assert.rejects(join(actor), /no longer available/);
      const library = (await as(actor, () => db.query('select * from official_collection_library()'))).rows[0];
      assert.equal(library.published, false);
      assert.equal(library.recipe_count, 0);
    }
    await assert.rejects(service(() => db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'contributor')", [source, contributor])), /Official collections are maintained/);
    await configure(true);
    assert.equal((await detail(free)).rows[0].data.id, recipe);
    await service(() => db.query('delete from recipe_books where id=$1', [source]));
    assert.equal((await db.query('select * from official_collections where id=$1', [collection.id])).rows.length, 0);
    assert.equal((await db.query('select * from official_collection_readers where collection_id=$1', [collection.id])).rows.length, 0);
    assert.equal((await as(free, () => db.query('select * from recipe_books where owner_id=$1', [free]))).rows.length, 1);
  });
});
