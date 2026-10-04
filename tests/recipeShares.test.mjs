import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";
const bookId = "00000000-0000-4000-8000-000000000001";
const recipeId = "00000000-0000-4000-8000-000000000002";
const compiled = ts.transpileModule(await readFile(new URL("../src/lib/actions/recipeShares.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function harness({ role = "family", author = "author", creator = "creator", user = "member", shareExists = true, membershipError = null, deleteError = null, book = bookId } = {}) {
  let share = shareExists ? { share_id: "share-existing", created_by: creator } : null;
  const calls = [];
  const publicClient = { from(table) {
    const query = { select() { return this; }, eq() { return this; }, single: async () => table === "book_members" ? { data: role ? { role } : null, error: membershipError } : { data: { id: recipeId, book_id: book, created_by: author, moderation_hidden: false }, error: null } };
    return query;
  } };
  const service = { from(table) {
    calls.push({ table });
    let operation = "read";
    const query = {
      select() { return this; },
      eq(column, value) { calls.push({ column, value }); return this; },
      single: async () => ({ data: share, error: null }),
      maybeSingle: async () => ({ data: share, error: null }),
      upsert: async (row, options) => { calls.push({ row, options }); if (!share || !options.ignoreDuplicates) share = { share_id: "share-new", created_by: row.created_by }; return { error: null }; },
      delete() { operation = "delete"; return this; },
      then(resolve) { if (operation === "delete") { calls.push({ deleted: true }); if (!deleteError) share = null; } resolve({ error: deleteError }); },
    };
    return query;
  } };
  const exports = {};
  Function("require", "exports", compiled)((name) => {
    if (name === "zod") return { z };
    if (name === "next/cache") return { revalidatePath: (path) => calls.push({ revalidated: path }) };
    if (name === "@/lib/auth") return { requireUser: async () => ({ id: user }) };
    if (name === "@/lib/supabase/server") return { createClient: async () => publicClient };
    if (name === "@/lib/supabase/service") return { createServiceClient: () => service };
    if (name === "@/lib/permissions") return { canView: (role) => role !== null, canContribute: () => false };
    if (name === "@/lib/actions/recipes") return { createRecipe: async () => ({success: true, data: {id: "saved"}}) };
    if (name === "@/lib/entitlements") return { getBookRecipeAccess: async () => ({ allowed: false }) };
    throw new Error(`Unexpected ${name}`);
  }, exports);
  return { actions: exports, calls, getShare: () => share };
}
test("Keeper, recipe author and original share creator can revoke as current members", async () => {
  for (const options of [{ role: "keeper" }, { user: "author", role: "contributor" }, { user: "creator", role: "family" }]) {
    const h = harness(options);
    const status = await h.actions.getRecipeShareStatus(bookId, recipeId);
    assert.equal(status.data.canRevoke, true);
    assert.equal((await h.actions.revokeRecipeShare(bookId, recipeId)).success, true);
    assert.equal(h.getShare(), null);
    assert.ok(h.calls.some((call) => call.revalidated === "/r/share-existing"));
  }
});
test("unrelated members cannot revoke, and former members cannot inspect, create or revoke", async () => {
  const unrelated = harness();
  assert.equal((await unrelated.actions.getRecipeShareStatus(bookId, recipeId)).data.canRevoke, false);
  assert.equal((await unrelated.actions.revokeRecipeShare(bookId, recipeId)).success, false);
  assert.ok(unrelated.getShare());
  for (const options of [{ role: null, user: "creator" }, { membershipError: { message: "offline" } }, { book: "other-book" }]) {
    const h = harness(options);
    for (const action of ["getRecipeShareStatus", "getOrCreateRecipeShare", "revokeRecipeShare"]) assert.equal((await h.actions[action](bookId, recipeId)).success, false);
    assert.equal(h.calls.length, 0);
  }
});
test("requesting an existing link preserves its original creator and concurrent insert uses ignoreDuplicates", async () => {
  const h = harness();
  assert.equal((await h.actions.getOrCreateRecipeShare(bookId, recipeId)).data.shareId, "share-existing");
  assert.equal(h.getShare().created_by, "creator");
  assert.deepEqual(h.calls.find((call) => call.options).options, { onConflict: "recipe_id", ignoreDuplicates: true });
  const newLink = harness({ shareExists: false });
  assert.equal((await newLink.actions.getOrCreateRecipeShare(bookId, recipeId)).success, true);
  assert.equal(newLink.getShare().created_by, "member");
});
test("revoking absent links is idempotent, database deletion errors surface, malformed IDs never reach service client", async () => {
  assert.equal((await harness({ shareExists: false }).actions.revokeRecipeShare(bookId, recipeId)).success, true);
  const failed = harness({ role: "keeper", deleteError: { message: "offline" } });
  assert.equal((await failed.actions.revokeRecipeShare(bookId, recipeId)).success, false);
  assert.ok(failed.getShare());
  const invalid = harness();
  assert.equal((await invalid.actions.getOrCreateRecipeShare("bad", recipeId)).success, false);
  assert.equal(invalid.calls.length, 0);
});

test("shared saves propagate atomic writer failure and never report a partial save as success", async () => {
  for (const success of [false, true]) {
    const writes = [];
    const source = { title: "Synthetic shared recipe", photo_url: null, category: null };
    const sourceClient = { from(table) {
      const builder = { select() { return this; }, eq() { return this; },
        single: async () => ({ data: table === "recipe_public_shares" ? {recipe_id: recipeId} : source, error: null }),
        order: async () => ({data: table === "recipe_ingredients" ? [{item:"Flour"}] : [{body:"Mix"}],error:null}),
      }; return builder;
    } };
    const memberClient = { from() { return {select(){return this;},eq(){return this;},order:async()=>({data:[{book_id:bookId,role:"keeper"}],error:null})}; } };
    const exports = {};
    Function("require", "exports", compiled)((name) => {
      if(name === "zod")return {z};
      if(name === "next/cache")return {revalidatePath(){}};
      if(name === "@/lib/auth")return {requireUser:async()=>({id:"member"})};
      if(name === "@/lib/supabase/server")return {createClient:async()=>memberClient};
      if(name === "@/lib/supabase/service")return {createServiceClient:()=>sourceClient};
      if(name === "@/lib/permissions")return {canContribute:()=>true};
      if(name === "@/lib/entitlements")return {getBookRecipeAccess:async()=>({allowed:true})};
      if(name === "@/lib/actions/recipes")return {createRecipe:async(book,input)=>{writes.push({book,input});return success?{success:true,data:{id:recipeId}}:{success:false,error:"Database write failed"};}};
      throw new Error(`Unexpected ${name}`);
    },exports);
    const result=await exports.saveSharedRecipe(recipeId);
    assert.equal(result.success,success);
    if(!success)assert.equal(result.error,"Database write failed");
    assert.equal(writes.length,1);
    assert.deepEqual(writes[0].input.instructions,[{body:"Mix"}]);
    assert.equal(writes[0].input.ingredients[0].item,"Flour");
  }
});
