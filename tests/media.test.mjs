import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
async function moduleUrl(path, replacements={}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  let {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}});
  for(const [name,target] of Object.entries(replacements)) outputText=outputText.replaceAll(JSON.stringify(name), JSON.stringify(target));
  return `data:text/javascript,${encodeURIComponent(outputText)}`;
}
process.env.NEXT_PUBLIC_SUPABASE_URL='https://media-test.supabase.co';
const mediaModule=await moduleUrl('../src/lib/media.ts');
const {mediaUrl, storageMediaReference, validMediaPath}=await import(mediaModule);
const mock=`data:text/javascript,${encodeURIComponent('export async function createClient(){return globalThis.__mediaClient;} export function createServiceClient(){globalThis.__serviceUsed++;return globalThis.__mediaClient;}')}`;
const {GET}=await import(await moduleUrl('../src/app/api/media/[bucket]/[...path]/route.ts',{'@/lib/media':mediaModule,'@/lib/supabase/server':mock,'@/lib/supabase/service':mock,zod:import.meta.resolve('zod')}));
const photo='https://media-test.supabase.co/storage/v1/object/public/recipe-images/owner/photo.webp';
const share='11111111-1111-4111-8111-111111111111';
function setup({user=true,shared=true,hidden=false,allowed=true,other=false,type='image/webp'}={}) {
 let downloads=0; globalThis.__serviceUsed=0;
 globalThis.__mediaClient={auth:{getUser:async()=>({data:{user:user?{id:'viewer'}:null},error:null})},from(table){const b={select(){return b;},eq(){return b;},maybeSingle:async()=>({data:table==='recipe_public_shares'?(shared?{recipe_id:'recipe'}:null):{photo_url:other?photo.replace('photo','other'):photo,moderation_hidden:hidden},error:null})};return b;},storage:{from(){return {download:async()=>{downloads++;return {data:allowed?new Blob(['photo'],{type}):null,error:allowed?null:{message:'denied'}};}}}}};
 return ()=>downloads;
}
const get=(query='')=>GET(new Request(`http://localhost/api/media/recipe-images/owner/photo.webp${query}`),{params:Promise.resolve({bucket:'recipe-images',path:['owner','photo.webp']})});
test('media maps only this project Storage identifiers and rejects traversal',()=>{
 assert.equal(mediaUrl(photo),'/api/media/recipe-images/owner/photo.webp');
 assert.equal(mediaUrl(photo,share),`/api/media/recipe-images/owner/photo.webp?share=${share}`);
 for(const path of ['../x','x/../y','x//y','x\\y','x\u0000']) assert.equal(validMediaPath(path),false);
 assert.equal(storageMediaReference(photo.replace('media-test','unrelated')),null);
 assert.equal(storageMediaReference(photo+'?download=1'),null);
 assert.equal(mediaUrl('blob:preview'),'blob:preview');
});
test('anonymous and revoked membership do not receive private bytes',async()=>{
 let calls=setup({user:false});assert.equal((await get()).status,404);assert.equal(calls(),0);assert.equal(globalThis.__serviceUsed,0);
 calls=setup({allowed:false});assert.equal((await get()).status,404);assert.equal(calls(),1);assert.equal(globalThis.__serviceUsed,0);
});
test('member images bypass shared caches and retain safe content headers',async()=>{
 setup();const response=await get();assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('vary'),'Cookie');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(await response.text(),'photo');
});
test('public shares grant only the linked unmoderated photo and revoke immediately',async()=>{
 setup({user:false});assert.equal((await get(`?share=${share}`)).status,200);
 for(const options of [{shared:false},{hidden:true},{other:true}]){const calls=setup(options);assert.equal((await get(`?share=${share}`)).status,404);assert.equal(calls(),0);}
 const calls=setup();assert.equal((await get('?share=not-a-uuid')).status,404);assert.equal(calls(),0);
 setup({type:'text/html'});assert.equal((await get()).status,404);
});
test('original PDFs stream only to authenticated members and cannot be public-shared',async()=>{
 const context={params:Promise.resolve({bucket:'recipe-originals',path:['recipe','11111111-1111-4111-8111-111111111111_Original.pdf']})};
 setup({type:'application/pdf'});
 const response=await GET(new Request('http://localhost/api/media/recipe-originals/recipe/original.pdf'),context);
 assert.equal(response.status,200);
 assert.match(response.headers.get('content-disposition'),/attachment; filename\*=UTF-8''Original.pdf/);
 assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal(await response.text(),'photo');
 const calls=setup();
 assert.equal((await GET(new Request(`http://localhost/api/media/recipe-originals/recipe/original.pdf?share=${share}`),context)).status,404);
 assert.equal(calls(),0);
 setup({user:false,type:'application/pdf'});
 assert.equal((await GET(new Request('http://localhost/api/media/recipe-originals/recipe/original.pdf'),context)).status,404);
 setup({allowed:false,type:'application/pdf'});
 assert.equal((await GET(new Request('http://localhost/api/media/recipe-originals/recipe/original.pdf'),context)).status,404);
});
