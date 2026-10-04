import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

test('complete committed schema and database/Storage access boundaries', async t => {
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
  const owner=await user(),member=await user(),outsider=await user();
  const household=(await db.query('select id from households where owner_id=$1',[owner])).rows[0].id;
  await as(owner,()=>db.query("insert into household_members(household_id,user_id) values ($1,$2)",[household,member]));
  await t.test('outsider cannot self-enroll into another household',async()=> {
    await assert.rejects(as(outsider,()=>db.query('insert into household_members(household_id,user_id) values ($1,$2)',[household,outsider])),/row-level security/);
  });
  await t.test('groceries and meal plans follow membership and revoke immediately',async()=> {
    for(const table of ['grocery_items','meal_plans']) {
      const insert=table==='grocery_items'?"insert into grocery_items(household_id,name,created_by) values ($1,'Synthetic',$2) returning id":"insert into meal_plans(household_id,planned_date,meal_slot,created_by) values ($1,current_date,'dinner',$2) returning id";
      await as(member,()=>db.query(insert,[household,member]));
      assert.equal((await as(member,()=>db.query(`select * from ${table} where household_id=$1`,[household]))).rows.length,1);
      for(const actor of [outsider,null]) {
        assert.equal((await as(actor,()=>db.query(`select * from ${table} where household_id=$1`,[household]))).rows.length,0);
        await assert.rejects(as(actor,()=>db.query(insert,[household,actor||outsider])),/row-level security/);
        assert.equal((await as(actor,()=>db.query(`update ${table} set created_by=$2 where household_id=$1 returning id`,[household,outsider]))).rows.length,0);
        assert.equal((await as(actor,()=>db.query(`delete from ${table} where household_id=$1 returning id`,[household]))).rows.length,0);
      }
    }
    await as(owner,()=>db.query('delete from household_members where household_id=$1 and user_id=$2',[household,member]));
    for(const table of ['grocery_items','meal_plans']) assert.equal((await as(member,()=>db.query(`select * from ${table} where household_id=$1`,[household]))).rows.length,0);
  });
  await t.test('recipe originals enforce real Storage RLS and revoke removed members',async()=> {
    const book=randomUUID(),recipe=randomUUID(),contributor=await user();
    await db.query("update billing_accounts set status='active',plan='plus' where user_id=$1",[owner]);
    await db.query("insert into recipe_books(id,title,owner_id,sharing_enabled) values ($1,'Synthetic',$2,true)",[book,owner]);
    await db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'family')",[book,member]);
    await db.query("insert into recipes(id,book_id,title,created_by) values ($1,$2,'Synthetic',$3)",[recipe,book,owner]);
    await db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'contributor')",[book,contributor]);
    assert.equal((await as(contributor,()=>db.query('select * from recipes where id=$1',[recipe]))).rows.length,1);
    const name=`${recipe}/${randomUUID()}_original.pdf`;
    await as(owner,()=>db.query("insert into storage.objects(bucket_id,name) values ('recipe-originals',$1)",[name]));
    assert.equal((await as(member,()=>db.query("select * from storage.objects where name=$1",[name]))).rows.length,1);
    for(const actor of [member,contributor,outsider,null]) {
      await assert.rejects(as(actor,()=>db.query("insert into storage.objects(bucket_id,name) values ('recipe-originals',$1)",[`${recipe}/${randomUUID()}_blocked.pdf`])),/row-level security|permission denied/);
      assert.equal((await as(actor,()=>db.query("delete from storage.objects where name=$1 returning id",[name]))).rows.length,0);
    }
    for(const actor of [outsider,null]) assert.equal((await as(actor,()=>db.query('select * from storage.objects where name=$1',[name]))).rows.length,0);
    await db.query('delete from book_members where book_id=$1 and user_id=$2',[book,member]);
    assert.equal((await as(member,()=>db.query('select * from storage.objects where name=$1',[name]))).rows.length,0);
    await db.query('delete from recipes where id=$1',[recipe]);
    assert.equal((await as(owner,()=>db.query('select * from storage.objects where name=$1',[name]))).rows.length,0);
    await assert.rejects(db.query("insert into recipes(id,book_id,title,created_by) values ($1,$2,'Reused',$3)",[recipe,book,owner]),/already been used/);
  });
  await t.test('private photos, covers and avatars enforce membership, assignment and deletion',async()=> {
    const book=randomUUID(),recipe=randomUUID(),uploader=await user();
    await db.query("insert into recipe_books(id,title,owner_id,sharing_enabled) values ($1,'Media',$2,true)",[book,owner]);
    await db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'contributor')",[book,uploader]);
    await db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'family')",[book,member]);
    const paths={ 'recipe-images':`${uploader}/photo_test.jpg`, 'book-covers':`${owner}/cover_test.jpg`, avatars:`${owner}/avatar_test.jpg` };
    const url=(bucket)=>`https://synthetic.example/storage/v1/object/public/${bucket}/${paths[bucket]}`;
    for(const bucket of Object.keys(paths)) {
      const actor=bucket==='recipe-images'?uploader:owner;
      await as(actor,()=>db.query('insert into storage.objects(bucket_id,name) values ($1,$2)',[bucket,paths[bucket]]));
      await assert.rejects(as(outsider,()=>db.query('insert into storage.objects(bucket_id,name) values ($1,$2)',[bucket,`${owner}/spoof.jpg`])),/row-level security/);
      assert.equal((await db.query('select public from storage.buckets where id=$1',[bucket])).rows[0].public,false);
    }
    await as(uploader,()=>db.query("insert into recipes(id,book_id,title,created_by,photo_url) values ($1,$2,'Photo',$3,$4)",[recipe,book,uploader,url('recipe-images')]));
    await as(owner,()=>db.query('update recipe_books set cover_image_url=$1 where id=$2',[url('book-covers'),book]));
    await as(owner,()=>db.query('update profiles set avatar_url=$1 where id=$2',[url('avatars'),owner]));
    await as(uploader,()=>db.query("update recipes set title='Edited' where id=$1",[recipe]));
    await assert.rejects(as(uploader,()=>db.query('update recipes set moderation_hidden=true where id=$1',[recipe])),/moderation controls/);
    await assert.rejects(as(owner,()=>db.query('update profiles set moderation_upload_restricted=true where id=$1',[owner])),/moderation controls/);
    for(const bucket of Object.keys(paths)) {
      assert.equal((await as(member,()=>db.query('select * from storage.objects where bucket_id=$1 and name=$2',[bucket,paths[bucket]]))).rows.length,1);
      for(const actor of [outsider,null]) assert.equal((await as(actor,()=>db.query('select * from storage.objects where bucket_id=$1 and name=$2',[bucket,paths[bucket]]))).rows.length,0);
    }
    const otherBook=randomUUID();
    await db.query("insert into recipe_books(id,title,owner_id) values ($1,'Other',$2)",[otherBook,outsider]);
    await assert.rejects(as(outsider,()=>db.query("insert into recipes(book_id,title,created_by,photo_url) values ($1,'Guessed',$2,$3)",[otherBook,outsider,url('recipe-images')])),/private image/);
    assert.equal((await as(uploader,()=>db.query("delete from storage.objects where bucket_id='recipe-images' and name=$1 returning id",[paths['recipe-images']]))).rows.length,0);
    await db.query('delete from book_members where book_id=$1 and user_id=$2',[book,uploader]);
    assert.equal((await as(uploader,()=>db.query("select * from storage.objects where bucket_id='recipe-images' and name=$1",[paths['recipe-images']]))).rows.length,0);
    assert.equal((await as(uploader,()=>db.query("delete from storage.objects where bucket_id='recipe-images' and name=$1 returning id",[paths['recipe-images']]))).rows.length,0);
    await db.query('insert into recipe_public_shares(recipe_id,created_by) values ($1,$2)',[recipe,owner]);
    await as(outsider,()=>db.query("insert into recipes(book_id,title,created_by,photo_url) values ($1,'Shared copy',$2,$3)",[otherBook,outsider,url('recipe-images')]));
    assert.equal((await as(outsider,()=>db.query("select * from storage.objects where bucket_id='recipe-images' and name=$1",[paths['recipe-images']]))).rows.length,1);
    await db.query('delete from recipe_public_shares where recipe_id=$1',[recipe]);
    // An intentionally saved copy retains its access after the original share
    // is revoked, while someone with no copy cannot manufacture a new one.
    assert.equal((await as(outsider,()=>db.query("select * from storage.objects where bucket_id='recipe-images' and name=$1",[paths['recipe-images']]))).rows.length,1);
    const late=await user(),lateBook=randomUUID();
    await db.query("insert into recipe_books(id,title,owner_id) values ($1,'Late',$2)",[lateBook,late]);
    await assert.rejects(as(late,()=>db.query("insert into recipes(book_id,title,created_by,photo_url) values ($1,'Revoked',$2,$3)",[lateBook,late,url('recipe-images')])),/private image/);
    // Unlinked drafts remain removable by their uploader.
    await as(owner,()=>db.query("insert into storage.objects(bucket_id,name) values ('recipe-images',$1)",[`${owner}/draft.jpg`]));
    assert.equal((await as(owner,()=>db.query("delete from storage.objects where name=$1 returning id",[`${owner}/draft.jpg`]))).rows.length,1);
  });
  await t.test('AI allowance is server-only and parallel calls never overspend',async()=> {
    for(const actor of [owner,outsider,null]) await assert.rejects(as(actor,()=>db.query('select * from consume_ai_allowance($1,current_date,100000,1)',[owner])),/permission denied/);
    const results=await as(null,()=>Promise.all(Array.from({length:20},()=>db.query('select * from consume_ai_allowance($1,current_date,5,1)',[owner]))),'service_role');
    assert.equal(results.filter(r=>r.rows[0].allowed).length,5);
    assert.equal((await db.query('select quantity_used from ai_allowance_usage where user_id=$1',[owner])).rows[0].quantity_used,5);
  });
});
