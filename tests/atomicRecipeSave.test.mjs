import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

test('recipe saves are atomic and retain authenticated permissions', async t => {
  const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select current_user::text $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner uuid);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
    grant usage on schema auth,storage to anon,authenticated,service_role;
  `);
  const dir = new URL('../supabase/migrations/',import.meta.url);
  const files = (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql=(await readFile(new URL(file,dir),'utf8')).replace('create extension if not exists "pgcrypto";','');
    try { await db.exec(sql); } catch(error) { throw new Error(`Migration ${file}: ${error.message}`,{cause:error}); }
  }
  await db.exec('grant usage on schema public to anon,authenticated,service_role; grant select,insert,update,delete on all tables in schema public,storage to anon,authenticated,service_role;');
  async function user() { const id=randomUUID(); await db.query('insert into auth.users(id,email) values ($1,$2)',[id,`${id}@example.com`]); return id; }
  async function as(id,fn,role=id?'authenticated':'anon') {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
    await db.exec(`set role ${role}`);
    try{return await fn();}finally{await db.exec('reset role');}
  }
  const owner=await user(),family=await user(),outsider=await user();
  const book=randomUUID(),otherBook=randomUUID();
  await db.query("insert into recipe_books(id,title,owner_id,sharing_enabled) values ($1,'Atomic',$2,true)",[book,owner]);
  await db.query("insert into recipe_books(id,title,owner_id) values ($1,'Other',$2)",[otherBook,outsider]);
  await db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'family')",[book,family]);
  const rpc=(actor,id,fields,ingredients=[{item:'Flour'}],instructions=[{body:'Mix'}],targetBook=book)=>as(actor,()=>db.query('select save_recipe_atomic($1,$2,$3::jsonb,$4::jsonb,$5::jsonb) as recipe',[targetBook,id,JSON.stringify(fields),ingredients===null?null:JSON.stringify(ingredients),instructions===null?null:JSON.stringify(instructions)]));
  await t.test('create rolls back header and first child list if second list fails',async()=>{
    await assert.rejects(rpc(owner,null,{title:'Broken'},[{item:'Flour'}],[{}]),/not-null/);
    assert.equal((await db.query('select * from recipes where book_id=$1',[book])).rows.length,0);
    assert.equal((await db.query('select * from recipe_ingredients')).rows.length,0);
    assert.equal((await db.query('select * from recipe_id_reservations')).rows.length,0);
  });
  const recipe=(await rpc(owner,null,{title:'Original'})).rows[0].recipe;
  await t.test('failed replacement preserves header, ingredient and instruction IDs',async()=>{
    const beforeIngredients=(await db.query('select * from recipe_ingredients where recipe_id=$1',[recipe.id])).rows;
    const beforeInstructions=(await db.query('select * from recipe_instructions where recipe_id=$1',[recipe.id])).rows;
    await assert.rejects(rpc(owner,recipe.id,{title:'Changed'},[{item:'Changed'}],[{}]),/not-null/);
    assert.equal((await db.query('select title from recipes where id=$1',[recipe.id])).rows[0].title,'Original');
    assert.deepEqual((await db.query('select * from recipe_ingredients where recipe_id=$1',[recipe.id])).rows,beforeIngredients);
    assert.deepEqual((await db.query('select * from recipe_instructions where recipe_id=$1',[recipe.id])).rows,beforeInstructions);
  });
  await t.test('successful patch preserves omitted lists and replaces supplied lists',async()=>{
    await rpc(owner,recipe.id,{title:'Saved'},null,[{body:'Bake'}]);
    assert.equal((await db.query('select title from recipes where id=$1',[recipe.id])).rows[0].title,'Saved');
    assert.equal((await db.query('select item from recipe_ingredients where recipe_id=$1',[recipe.id])).rows[0].item,'Flour');
    assert.equal((await db.query('select body from recipe_instructions where recipe_id=$1',[recipe.id])).rows[0].body,'Bake');
  });
  await t.test('Contributor writes own recipes; Keeper edits others; removal revokes writes',async()=>{
    const contributor=await user();
    await db.query("update billing_accounts set plan='plus',status='active' where user_id=$1",[owner]);
    await db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'contributor')",[book,contributor]);
    const own=(await rpc(contributor,null,{title:'Contributor'})).rows[0].recipe;
    await rpc(contributor,own.id,{title:'Own edit'},null,null);
    await assert.rejects(rpc(contributor,recipe.id,{title:'Other edit'},null,null),/cannot be edited|unavailable/);
    await rpc(owner,own.id,{title:'Keeper edit'},null,null);
    await db.query('delete from book_members where book_id=$1 and user_id=$2',[book,contributor]);
    await assert.rejects(rpc(contributor,own.id,{title:'Removed edit'},null,null),/unavailable/);
  });
  await t.test('wrong cookbook, Family, outsider and anonymous cannot write',async()=>{
    await assert.rejects(rpc(owner,recipe.id,{title:'Wrong'},null,null,otherBook),/unavailable/);
    for(const actor of [family,outsider,null]) {
      await assert.rejects(rpc(actor,null,{title:'Forbidden'}),/row-level security|permission denied|CONTRIBUTOR_REQUIRES_PLUS/);
      await assert.rejects(rpc(actor,recipe.id,{title:'Forbidden'}),/cannot be edited|unavailable|permission denied/);
    }
    await assert.rejects(rpc(owner,recipe.id,{created_by:outsider}),/Unsupported recipe field/);
    const foreignCategory=(await db.query('select id from book_categories where book_id=$1 limit 1',[otherBook])).rows[0].id;
    await assert.rejects(rpc(owner,recipe.id,{category_id:foreignCategory}),/Category unavailable/);
    assert.equal((await db.query('select title from recipes where id=$1',[recipe.id])).rows[0].title,'Saved');
  });
  await t.test('copy database snapshot preserves authorship and rolls back on late failure',async()=>{
    const target=randomUUID();
    await db.query("insert into recipe_books(id,title,owner_id) values ($1,'Copy target',$2)",[target,owner]);
    await db.query("insert into recipe_stories(recipe_id,author_id,body) values ($1,$2,'Family memory')",[recipe.id,family]);
    await db.query("insert into recipe_stories(recipe_id,author_id,body,moderation_hidden) values ($1,$2,'Hidden',true)",[recipe.id,family]);
    await db.query("insert into recipe_reactions(recipe_id,user_id,type) values ($1,$2,'love')",[recipe.id,family]);
    await db.query('insert into recipe_ratings(recipe_id,user_id,rating) values ($1,$2,4.5)',[recipe.id,family]);
    const copy=(actor,sourceBook=book,destination=target)=>as(actor,()=>db.query('select copy_recipe_atomic($1,$2,$3,null) as recipe',[sourceBook,recipe.id,destination]));
    for(const actor of [family,outsider,null]) await assert.rejects(copy(actor),/not permitted|permission denied/);
    await assert.rejects(copy(owner,otherBook),/not permitted|unavailable/);
    const before=(await db.query('select * from recipes where id=$1',[recipe.id])).rows;
    await db.exec(`create function public.fail_copy_rating() returns trigger language plpgsql as $$ begin raise exception 'Simulated rating write failure'; end $$;
      create trigger fail_copy_rating before insert on recipe_ratings for each row execute function public.fail_copy_rating();`);
    await assert.rejects(copy(owner),/Simulated rating write failure/);
    assert.equal((await db.query('select * from recipes where book_id=$1',[target])).rows.length,0);
    assert.equal((await db.query('select * from recipe_stories where recipe_id<>$1',[recipe.id])).rows.length,0);
    assert.deepEqual((await db.query('select * from recipes where id=$1',[recipe.id])).rows,before);
    await db.exec('drop trigger fail_copy_rating on recipe_ratings; drop function fail_copy_rating();');
    const copied=(await copy(owner)).rows[0].recipe;
    assert.equal(copied.created_by,owner);
    assert.equal(copied.book_id,target);
    assert.equal((await db.query('select item from recipe_ingredients where recipe_id=$1',[copied.id])).rows[0].item,'Flour');
    assert.equal((await db.query('select body from recipe_instructions where recipe_id=$1',[copied.id])).rows[0].body,'Bake');
    assert.deepEqual((await db.query('select author_id,body from recipe_stories where recipe_id=$1',[copied.id])).rows,[{author_id:family,body:'Family memory'}]);
    assert.equal((await db.query('select user_id from recipe_reactions where recipe_id=$1',[copied.id])).rows[0].user_id,family);
    assert.equal((await db.query('select user_id from recipe_ratings where recipe_id=$1',[copied.id])).rows[0].user_id,family);
    assert.equal((await db.query('select * from activity_events where recipe_id=$1',[copied.id])).rows.length,1);
  });

  await t.test('move enforces both cookbook ACLs and atomically removes source collection links',async()=>{
    const target=randomUUID(),collection=randomUUID();
    await db.query("insert into recipe_books(id,title,owner_id) values ($1,'Move target',$2)",[target,owner]);
    await db.query("insert into collections(id,book_id,title,created_by) values ($1,$2,'Source collection',$3)",[collection,book,owner]);
    await db.query('insert into collection_recipes(collection_id,recipe_id) values ($1,$2)',[collection,recipe.id]);
    const move=(actor,destination)=>as(actor,()=>db.query('update recipes set book_id=$1,category_id=null where id=$2 and book_id=$3 returning id',[destination,recipe.id,book]));
    for(const actor of [family,outsider,null]) assert.equal((await move(actor,target)).rows.length,0);
    await assert.rejects(move(owner,otherBook),/row-level security|CONTRIBUTOR_REQUIRES_PLUS/);
    await db.exec(`create function public.fail_collection_cleanup() returns trigger language plpgsql as $$ begin raise exception 'Simulated collection cleanup failure'; end $$;
      create trigger fail_collection_cleanup before delete on collection_recipes for each row execute function public.fail_collection_cleanup();`);
    await assert.rejects(move(owner,target),/Simulated collection cleanup failure/);
    assert.equal((await db.query('select book_id from recipes where id=$1',[recipe.id])).rows[0].book_id,book);
    assert.equal((await db.query('select * from collection_recipes where recipe_id=$1',[recipe.id])).rows.length,1);
    await db.exec('drop trigger fail_collection_cleanup on collection_recipes; drop function fail_collection_cleanup();');
    assert.equal((await move(owner,target)).rows.length,1);
    assert.equal((await db.query('select * from collection_recipes where recipe_id=$1',[recipe.id])).rows.length,0);
    assert.equal((await db.query('select book_id from recipes where id=$1',[recipe.id])).rows[0].book_id,target);
    assert.equal((await as(family,()=>db.query('select * from recipes where id=$1',[recipe.id]))).rows.length,0);
    assert.equal((await db.query('select item from recipe_ingredients where recipe_id=$1',[recipe.id])).rows[0].item,'Flour');
  });

});
