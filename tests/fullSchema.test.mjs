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
    create table auth.users(id uuid primary key,email text,created_at timestamptz not null default now(),raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user::text) $$;
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
    await db.query("select set_config('request.jwt.claim.role',$1,false)",[role]);
    await db.exec(`set role ${role}`);
    try{return await fn();}finally{await db.exec("reset role; select set_config('request.jwt.claim.sub','',false); select set_config('request.jwt.claim.role','',false)");}
  }
  const owner=await user(),member=await user(),outsider=await user();
  await t.test('completed signup is counted once after tracking begins',async()=> {
    const first=await as(owner,()=>db.query('select public.record_first_sign_in() as counted'));
    const repeat=await as(owner,()=>db.query('select public.record_first_sign_in() as counted'));
    assert.equal(first.rows[0].counted,true);
    assert.equal(repeat.rows[0].counted,false);
    assert.equal((await db.query('select count(*)::int as count from public.signup_conversion_tracking')).rows[0].count,1);
    await assert.rejects(as(null,()=>db.query('select public.record_first_sign_in()')),/permission denied/);
    assert.equal((await as(outsider,()=>db.query('select * from public.signup_conversion_tracking'))).rows.length,0);
  });
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
  await t.test('cookbook roster exposes names and roles to every member, but not outsiders or removed members',async()=> {
    const keeper=await user(),contributor=await user(),family=await user(),unrelated=await user();
    const book=randomUUID(),otherBook=randomUUID();
    await db.query("update billing_accounts set status='active',plan='plus' where user_id=$1",[keeper]);
    await db.query("insert into recipe_books(id,title,owner_id,sharing_enabled) values ($1,'Roster',$2,true)",[book,keeper]);
    await db.query("insert into recipe_books(id,title,owner_id) values ($1,'Other cookbook',$2)",[otherBook,unrelated]);
    await db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'contributor'),($1,$3,'family')",[book,contributor,family]);
    for (const [id,name] of [[keeper,'Test Keeper'],[contributor,'Test Contributor'],[family,'Test Family']]) {
      await db.query('update profiles set full_name=$2 where id=$1',[id,name]);
    }
    const roster=()=>db.query('select bm.user_id,bm.role,p.full_name from book_members bm left join profiles p on p.id=bm.user_id where bm.book_id=$1 order by bm.role',[book]);
    for(const actor of [keeper,contributor,family]) {
      const {rows}=await as(actor,roster);
      assert.deepEqual(rows.map(row=>[row.role,row.full_name]),[['contributor','Test Contributor'],['family','Test Family'],['keeper','Test Keeper']]);
    }
    for(const actor of [unrelated,null]) assert.equal((await as(actor,roster)).rows.length,0);
    await db.query('delete from book_members where book_id=$1 and user_id=$2',[book,family]);
    assert.equal((await as(family,roster)).rows.length,0);
  });
  await t.test('group links enforce the owner’s allowance and preserve legacy links',async()=> {
    const keeper=await user(), people=await Promise.all(Array.from({length:5},()=>user())), book=randomUUID();
    await db.query("insert into recipe_books(id,title,owner_id,sharing_enabled) values ($1,'Group invitations',$2,true)",[book,keeper]);
    const create=(actor=keeper,role='family')=>as(actor,()=>db.query('select * from create_book_invitation_link($1,$2)',[book,role]));
    const accept=(actor,token)=>as(actor,()=>db.query('select accept_book_invitation_link($1) as book_id',[token]));
    const seats=async()=> (await db.query('select book_sharing_seats($1) as n',[book])).rows[0].n;
    const link=(await create()).rows[0];
    assert.equal(link.link_type,'group');
    assert.equal(await seats(),0);
    await assert.rejects(create(keeper,'contributor'),/Family members only/);
    await assert.rejects(accept(null,link.token),/permission denied/);
    assert.equal((await accept(keeper,link.token)).rows[0].book_id,book);
    // Pending email invitations still reserve a spot; a matching recipient
    // joining through the group link must not be counted twice.
    await db.query("insert into book_invitations(book_id,email,role,token,invited_by,expires_at) values ($1,$2,'family',$3,$4,now()+interval '7 days')",[book,`${people[0]}@example.com`,randomUUID(),keeper]);
    assert.equal(await seats(),1);
    // Guest plans do not alter the Free owner's three-person limit.
    await db.query("update billing_accounts set status='active',plan='plus' where user_id=$1",[people[0]]);
    for(const person of people.slice(0,3)) await accept(person,link.token);
    assert.equal(await seats(),3);
    await accept(people[0],link.token); // Existing members can open the book without using a spot.
    await assert.rejects(accept(people[3],link.token),/3 free sharing spots/);
    assert.equal((await create()).rows[0].link_type,'group'); // Sharing a link does not reserve a seat.
    await db.query('delete from book_members where book_id=$1 and user_id=$2',[book,people[2]]);
    await accept(people[3],link.token);
    await db.query("update billing_accounts set status='active',plan='plus' where user_id=$1",[keeper]);
    await accept(people[4],link.token);
    assert.equal(await seats(),4);
    await as(keeper,()=>db.query('select cancel_book_invitation_link($1)',[link.id]));
    await assert.rejects(accept(people[0],link.token),/invalid or has expired/);
    const legacy=(await db.query("insert into book_invitation_links(book_id,role,invited_by) values ($1,'family',$2) returning *",[book,keeper])).rows[0];
    assert.equal(legacy.link_type,'single');
    assert.equal(await seats(),5);
    const newcomer=await user();
    await accept(newcomer,legacy.token);
    await assert.rejects(accept(await user(),legacy.token),/invalid or has expired/);
    const expired=(await create()).rows[0];
    await db.query("update book_invitation_links set expires_at=now()-interval '1 second' where id=$1",[expired.id]);
    await assert.rejects(accept(await user(),expired.token),/invalid or has expired/);
    for(const actor of [people[0],await user(),null]) {
      assert.equal((await as(actor,()=>db.query('select * from book_invitation_links where book_id=$1',[book]))).rows.length,0);
      await assert.rejects(create(actor),/permission to invite|permission denied/);
      await assert.rejects(as(actor,()=>db.query('select cancel_book_invitation_link($1)',[expired.id])),/Only the keeper|permission denied/);
    }
    await as(keeper,async()=> {
      await assert.rejects(db.query("insert into book_invitation_links(book_id,role,invited_by) values ($1,'family',$2)",[book,keeper]),/row-level security/);
      assert.equal((await db.query('update book_invitation_links set cancelled_at=null where id=$1 returning id',[link.id])).rows.length,0);
    });
  });
  await t.test('Keeper controls Contributor invitation access across both methods', async () => {
    const keeper=await user(), contributor=await user(), family=await user(), outsider=await user(), book=randomUUID();
    await db.query("update billing_accounts set status='active',plan='plus' where user_id=$1",[keeper]);
    await db.query("insert into recipe_books(id,title,owner_id,sharing_enabled) values ($1,'Delegation',$2,true)",[book,keeper]);
    await db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'contributor'),($1,$3,'family')",[book,contributor,family]);
    const createLink=actor=>as(actor,()=>db.query("select * from create_book_invitation_link($1,'contributor')",[book]));
    const createEmail=(actor,inviter=actor)=>as(actor,()=>db.query("insert into book_invitations(book_id,email,role,token,invited_by,expires_at) values ($1,$2,'family',$3,$4,now()+interval '7 days') returning id",[book,`${randomUUID()}@example.com`,randomUUID(),inviter]));
    await assert.rejects(createLink(contributor),/permission to invite/);
    await assert.rejects(createEmail(contributor),/row-level security/);
    await as(keeper,()=>db.query('update recipe_books set contributors_can_invite=true where id=$1',[book]));
    await createEmail(contributor);
    const link=(await createLink(contributor)).rows[0];
    assert.equal(link.invited_by,contributor);
    assert.equal((await as(keeper,()=>db.query('select invited_by from book_invitation_links where id=$1',[link.id]))).rows[0].invited_by,contributor);
    await assert.rejects(createEmail(contributor,keeper),/row-level security/);
    for(const actor of [family,outsider,null]) {
      await assert.rejects(createLink(actor),/permission to invite|permission denied/);
      await assert.rejects(createEmail(actor, actor || outsider),/row-level security|permission denied/);
    }
    await assert.rejects(as(contributor,()=>db.query('select cancel_book_invitation_link($1)',[link.id])),/Only the keeper/);
    assert.equal((await as(contributor,()=>db.query('update recipe_books set contributors_can_invite=false where id=$1 returning id',[book]))).rows.length,0);
    await as(keeper,()=>db.query('update recipe_books set contributors_can_invite=false where id=$1',[book]));
    await assert.rejects(createLink(contributor),/permission to invite/);
    await assert.rejects(createEmail(contributor),/row-level security/);
    await as(keeper,()=>db.query('select cancel_book_invitation_link($1)',[link.id]));
  });
  await t.test('link acceptance rolls back consumption when sharing or current entitlement disallows joining',async()=> {
    const keeper=await user(),recipient=await user(),book=randomUUID();
    await db.query("update billing_accounts set status='active',plan='plus' where user_id=$1",[keeper]);
    await db.query("insert into recipe_books(id,title,owner_id,sharing_enabled) values ($1,'Link entitlement',$2,true)",[book,keeper]);
    const create=async(role='family')=>(await as(keeper,()=>db.query('select * from create_book_invitation_link($1,$2)',[book,role]))).rows[0];
    const accept=link=>as(recipient,()=>db.query('select accept_book_invitation_link($1)',[link.token]));
    const contributorLink=await create('contributor'),familyLink=await create();
    await db.query("update recipe_books set sharing_enabled=false where id=$1",[book]);
    await assert.rejects(create(),/Turn on sharing/);
    await assert.rejects(accept(familyLink),/Sharing is turned off/);
    await db.query("update recipe_books set sharing_enabled=true where id=$1",[book]);
    for (let i=0; i<3; i++) { const member=await user(); await db.query("insert into book_members(book_id,user_id,role) values ($1,$2,'family')",[book,member]); }
    await db.query("update billing_accounts set status='canceled',plan='free' where user_id=$1",[keeper]);
    await assert.rejects(accept(contributorLink),/Contributor invitation needs Plus/);
    await assert.rejects(accept(familyLink),/3 free sharing spots/);
    assert.equal((await db.query('select accepted_at from book_invitation_links where id=$1',[familyLink.id])).rows[0].accepted_at,null);
    assert.equal((await db.query('select * from book_members where book_id=$1 and user_id=$2',[book,recipient])).rows.length,0);
    // The creator restriction mirrors the existing email-invitation policy.
    await as(null,()=>db.query('update profiles set moderation_upload_restricted=true where id=$1',[keeper]),'service_role');
    await assert.rejects(create(),/unavailable for this account/);
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
