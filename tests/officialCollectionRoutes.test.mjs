import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

const compile = async (path) => ts.transpileModule(await readFile(new URL(path, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const load = (source, imports) => {
  const exports = {};
  Function("require", "exports", source)((name) => {
    if (Object.hasOwn(imports, name)) return imports[name];
    throw new Error(`Unexpected import ${name}`);
  }, exports);
  return exports;
};
const covers = load(await compile("../src/lib/bookCovers.ts"), {});
const validators = load(await compile("../src/lib/validators/officialCollection.ts"), { zod: { z }, "@/lib/bookCovers": covers });
const actionsSource = await compile("../src/lib/actions/officialCollections.ts");
const media = load(await compile("../src/lib/media.ts"), {});
const photoSource = await compile("../src/app/api/collections/[collectionId]/images/[recipeId]/route.ts");
const collectionId = "10000000-0000-4000-8000-000000000001";
const bookId = "10000000-0000-4000-8000-000000000002";
const recipeId = "10000000-0000-4000-8000-000000000003";
const readerId = "10000000-0000-4000-8000-000000000004";
const adminId = "10000000-0000-4000-8000-000000000005";
const validConfig = { bookId, slug: "holiday-recipes", title: "Holiday recipes", description: "A free collection for holiday gatherings.", coverStyle: covers.BOOK_COVER_COLORS[0].hex, published: true };

function actionHarness({ user = { id: readerId }, admin = { id: adminId }, rpcError = null, deleteError = null } = {}) {
  const calls = [];
  const service = { rpc: async (name, args) => { calls.push({ type: "serviceRpc", name, args }); return { data: rpcError ? null : { id: collectionId, slug: args.collection_slug, published: args.make_published }, error: rpcError }; } };
  const client = {
    rpc: async (name, args) => { calls.push({ type: "clientRpc", name, args }); return { data: null, error: rpcError }; },
    from(table) {
      calls.push({ table });
      const query = {
        delete() { calls.push({ type: "delete" }); return query; },
        eq(column, value) { calls.push({ column, value }); return query; },
        then(resolve) { resolve({ error: deleteError }); },
      };
      return query;
    },
  };
  const actions = load(actionsSource, {
    zod: { z },
    "next/cache": { revalidatePath: (path, type) => calls.push({ revalidated: path, type }) },
    "@/lib/admin": { requireAdmin: async () => { calls.push({ type: "requireAdmin" }); if (!admin) throw new Error("Admin required"); return admin; } },
    "@/lib/auth": { requireUser: async () => { calls.push({ type: "requireUser" }); if (!user) throw new Error("Sign in required"); return user; } },
    "@/lib/supabase/server": { createClient: async () => { calls.push({ type: "createClient" }); return client; } },
    "@/lib/supabase/service": { createServiceClient: () => { calls.push({ type: "createServiceClient" }); return service; } },
    "@/lib/validators/officialCollection": validators,
  });
  return { actions, calls };
}

test("collection publication authenticates admin and validates inputs before creating service access", async () => {
  let h = actionHarness({ admin: null });
  await assert.rejects(h.actions.configureOfficialCollection(validConfig), /Admin required/);
  assert.deepEqual(h.calls, [{ type: "requireAdmin" }]);
  for (const invalid of [{ ...validConfig, bookId: "not-a-book" }, { ...validConfig, slug: "../private" }, { ...validConfig, title: " " }, { ...validConfig, coverStyle: "url(secret)" }, { ...validConfig, published: "true" }]) {
    h = actionHarness();
    assert.equal((await h.actions.configureOfficialCollection(invalid)).success, false);
    assert.deepEqual(h.calls, [{ type: "requireAdmin" }]);
  }
});

test("publication delegates locked source ownership and audit to the service-only RPC with the actual admin identity", async () => {
  const h = actionHarness();
  const result = await h.actions.configureOfficialCollection({ ...validConfig, actor_id: "attacker" });
  assert.deepEqual(result, { success: true, data: { id: collectionId, slug: validConfig.slug, published: true } });
  assert.deepEqual(h.calls.find((call) => call.type === "serviceRpc"), { type: "serviceRpc", name: "configure_official_collection", args: {
    actor_id: adminId, target_book_id: bookId, collection_slug: validConfig.slug, collection_title: validConfig.title,
    collection_description: validConfig.description, collection_cover_style: validConfig.coverStyle, make_published: true,
  } });
  const denied = actionHarness({ rpcError: { code: "42501", message: "You can only publish a cookbook you own." } });
  assert.equal((await denied.actions.configureOfficialCollection(validConfig)).success, false);
  assert.equal(denied.calls.some((call) => call.revalidated), false);
  const duplicate = actionHarness({ rpcError: { code: "23505", message: "private internal database error" } });
  assert.match((await duplicate.actions.configureOfficialCollection(validConfig)).error, /link is already in use/);
});

test("adding and removing collections require sign-in and never obtain service-role access", async () => {
  for (const operation of ["addOfficialCollection", "removeOfficialCollection"]) {
    const denied = actionHarness({ user: null });
    await assert.rejects(denied.actions[operation](collectionId), /Sign in required/);
    assert.deepEqual(denied.calls, [{ type: "requireUser" }]);
    const invalid = actionHarness();
    assert.equal((await invalid.actions[operation]("bad-id")).success, false);
    assert.deepEqual(invalid.calls, [{ type: "requireUser" }]);
  }
  const add = actionHarness();
  assert.equal((await add.actions.addOfficialCollection(collectionId)).success, true);
  assert.deepEqual(add.calls.find((call) => call.type === "clientRpc"), { type: "clientRpc", name: "join_official_collection", args: { target_collection_id: collectionId } });
  assert.equal(add.calls.some((call) => call.type === "createServiceClient"), false);
  const remove = actionHarness();
  assert.equal((await remove.actions.removeOfficialCollection(collectionId)).success, true);
  assert.deepEqual(remove.calls.filter((call) => call.column), [{ column: "collection_id", value: collectionId }, { column: "user_id", value: readerId }]);
  assert.equal(remove.calls.some((call) => call.type === "createServiceClient"), false);
  const failed = actionHarness({ deleteError: { message: "failed" } });
  assert.equal((await failed.actions.removeOfficialCollection(collectionId)).success, false);
});

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://collection-tests.supabase.co";
const photoUrl = "https://collection-tests.supabase.co/storage/v1/object/public/recipe-images/publisher/photo.webp";
function imageHarness({ user = { id: readerId }, authError = null, photo = photoUrl, rpcError = null, type = "image/webp", downloadError = null } = {}) {
  const calls = [];
  const client = {
    auth: { getUser: async () => { calls.push({ type: "auth" }); return { data: { user }, error: authError }; } },
    rpc: async (name, args) => { calls.push({ type: "rpc", name, args }); return { data: photo, error: rpcError }; },
  };
  const route = load(photoSource, {
    zod: { z }, "@/lib/media": media,
    "@/lib/supabase/server": { createClient: async () => { calls.push({ type: "client" }); return client; } },
    "@/lib/supabase/service": { createServiceClient: () => { calls.push({ type: "service" }); return { storage: { from(bucket) { calls.push({ bucket }); return { download: async (path) => { calls.push({ path }); return { data: downloadError ? null : new Blob(["image bytes"], { type }), error: downloadError }; } }; } } }; } },
  });
  const get = (ids = { collectionId, recipeId }) => route.GET(new Request(`https://example.com/api/collections/${ids.collectionId}/images/${ids.recipeId}?path=arbitrary-secret`), { params: Promise.resolve(ids) });
  return { get, calls };
}
const safeHeaders = (response) => {
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.equal(response.headers.get("vary"), "Cookie");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
};

test("collection image route denies malformed, anonymous, unsubscribed, unavailable and moderated content before service downloads", async () => {
  const invalid = imageHarness();
  assert.equal((await invalid.get({ collectionId: "invalid", recipeId })).status, 404);
  assert.deepEqual(invalid.calls, []);
  for (const options of [{ user: null }, { authError: { message: "expired" } }, { rpcError: { code: "42501", message: "subscription removed or unpublished" } }, { photo: null }, { photo: "" }]) {
    const h = imageHarness(options);
    const response = await h.get();
    assert.equal(response.status, 404);
    safeHeaders(response);
    assert.equal(h.calls.some((call) => call.type === "service"), false);
  }
});

test("collection images use only the exact authorized project recipe-image identifier and safe MIME types", async () => {
  const allowed = imageHarness();
  const response = await allowed.get();
  assert.equal(response.status, 200);
  safeHeaders(response);
  assert.equal(response.headers.get("content-disposition"), "inline");
  assert.equal(await response.text(), "image bytes");
  assert.deepEqual(allowed.calls.find((call) => call.type === "rpc"), { type: "rpc", name: "official_collection_photo", args: { target_collection_id: collectionId, target_recipe_id: recipeId } });
  assert.deepEqual(allowed.calls.filter((call) => call.bucket || call.path), [{ bucket: "recipe-images" }, { path: "publisher/photo.webp" }]);
  for (const photo of [photoUrl.replace("collection-tests", "foreign-project"), photoUrl.replace("recipe-images", "avatars"), photoUrl.replace("recipe-images", "book-covers"), photoUrl.replace("recipe-images", "recipe-originals"), `${photoUrl}?download=1`, "https://example.com/untrusted.jpg", "file:///private/secret"]) {
    const h = imageHarness({ photo });
    assert.equal((await h.get()).status, 404);
    assert.equal(h.calls.some((call) => call.type === "service"), false);
  }
  for (const options of [{ type: "text/html" }, { type: "image/svg+xml" }, { downloadError: { message: "deleted image" } }]) {
    const h = imageHarness(options);
    const denied = await h.get();
    assert.equal(denied.status, 404);
    safeHeaders(denied);
  }
});

test("installed service worker leaves collection image requests on the network instead of serving or saving cached bytes", async () => {
  const worker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  const listeners = new Map();
  const calls = [];
  vm.runInNewContext(worker, {
    URL, Response,
    self: { location: { origin: "https://home.example" }, addEventListener: (name, listener) => listeners.set(name, listener) },
    caches: {
      match: async () => { calls.push("cache read"); return undefined; },
      open: async () => ({ put: async () => { calls.push("cache write"); } }),
    },
    fetch: async () => { calls.push("worker fetch"); return new Response("static image"); },
  });
  for (const path of [`/api/collections/${collectionId}/images/${recipeId}`, `/api/collections/${collectionId}/images/${recipeId}?v=2`]) {
    let intercepted = false;
    listeners.get("fetch")({ request: { method: "GET", mode: "cors", destination: "image", url: `https://home.example${path}`, headers: new Headers() }, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false);
    assert.deepEqual(calls, []);
  }
  // The listener still handles an ordinary static image, so the assertions
  // above prove the protected path bypass rather than an inactive worker.
  let staticResponse;
  listeners.get("fetch")({ request: { method: "GET", mode: "cors", destination: "image", url: "https://home.example/logo.png", headers: new Headers() }, respondWith: (promise) => { staticResponse = promise; } });
  assert.ok(staticResponse);
  assert.equal((await staticResponse).status, 200);
  assert.ok(calls.includes("cache read"));
  assert.ok(calls.includes("worker fetch"));
});
