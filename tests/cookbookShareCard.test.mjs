import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";

const source = await readFile(new URL("../src/lib/shareCard.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function harness({ invitation = true, selected = true, hidden = false, changed = false, wrongBucket = false, customPath = null } = {}) {
  const calls = [];
  const exports = {};
  const client = { from(table) {
    calls.push(table);
    return { select() { return this; }, eq() { return this; }, async maybeSingle() {
      return { data: table === "recipe_books" ? { share_card_recipe_id: selected ? "recipe" : null, share_card_photo_url: "original", share_card_custom_path: customPath } : { photo_url: changed ? "replacement" : "original", moderation_hidden: hidden } };
    } };
  } };
  Function("require", "exports", compiled)((name) => {
    if (name === "server-only") return {};
    if (name === "@/lib/actions/shareableInvitations") return { lookupShareableInvitation: async () => invitation ? { bookId: "book", cookbookTitle: "Test book" } : null };
    if (name === "@/lib/shareCardPhoto") return { shareCardPhoto: () => wrongBucket ? null : ({ kind: "storage", path: "photo.jpg" }) };
    if (name === "@/lib/supabase/service") return { createServiceClient: () => client };
    throw new Error(name);
  }, exports);
  return { get: () => exports.getInvitationShareCard("token"), calls };
}

test("only an active invitation with the keeper-selected, unchanged visible recipe photo produces a card", async () => {
  assert.deepEqual(await harness().get(), { title: "Test book", photo: { kind: "storage", path: "photo.jpg" }, credit: null });
  for (const option of [{ invitation: false }, { selected: false }, { hidden: true }, { changed: true }, { wrongBucket: true }]) {
    assert.equal(await harness(option).get(), null);
  }
  const invalid = harness({ invitation: false });
  await invalid.get();
  assert.deepEqual(invalid.calls, []);
});

test("a custom upload is served only for an active invitation and does not read recipes", async () => {
  const custom = harness({ selected: false, customPath: "owner/family.webp" });
  assert.deepEqual(await custom.get(), { title: "Test book", photo: { kind: "storage", path: "owner/family.webp" }, credit: null });
  assert.deepEqual(custom.calls, ["recipe_books"]);
  assert.equal(await harness({ invitation: false, selected: false, customPath: "owner/family.webp" }).get(), null);
});

test("Pexels selection accepts only HTTPS Pexels CDN photo URLs and private recipe uploads", async () => {
  const photoSource = await readFile(new URL("../src/lib/shareCardPhoto.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(photoSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const photoExports = {};
  Function("require", "exports", js)((name) => {
    if (name === "@/lib/media") return { storageMediaReference: (value) => value === "private" ? { bucket: "recipe-images", path: "photo.jpg" } : null };
    throw new Error(name);
  }, photoExports);
  assert.deepEqual(photoExports.shareCardPhoto("private"), { kind: "storage", path: "photo.jpg" });
  assert.deepEqual(photoExports.shareCardPhoto("https://images.pexels.com/photos/42/photo.jpeg?w=900"), { kind: "pexels", url: "https://images.pexels.com/photos/42/photo.jpeg?w=900" });
  for (const url of ["http://images.pexels.com/photos/42/photo.jpeg", "https://images.pexels.com.evil.test/photos/42/a.jpg", "https://images.pexels.com:444/photos/42/a.jpg", "https://user@images.pexels.com/photos/42/a.jpg", "https://images.pexels.com/other", "https://127.0.0.1/photos/42/a.jpg"]) {
    assert.equal(photoExports.shareCardPhoto(url), null, url);
  }
});

test("only the keeper can save their own custom upload; switching to default clears it", async () => {
  const actionSource = await readFile(new URL("../src/lib/actions/shareCard.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(actionSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const bookId = "00000000-0000-4000-8000-000000000001";
  const userId = "00000000-0000-4000-8000-000000000002";
  const otherId = "00000000-0000-4000-8000-000000000003";
  function actionHarness(role) {
    const writes = [];
    const client = { from(table) { return {
      select() { return this; }, eq() { return this; },
      maybeSingle: async () => ({ data: table === "book_members" ? { role } : { share_card_custom_path: null } }),
      update(data) { writes.push(data); return this; },
      then(resolve) { resolve({ error: null }); },
    }; } };
    const actions = {};
    Function("require", "exports", js)((name) => {
      if (name === "zod") return { z };
      if (name === "next/cache") return { revalidatePath() {} };
      if (name === "@/lib/auth") return { getUser: async () => ({ id: userId }) };
      if (name === "@/lib/supabase/server") return { createClient: async () => client };
      if (name === "@/lib/shareCardPhoto") return { shareCardPhoto: () => null };
      if (name === "@/lib/media") return { validMediaPath: () => true };
      throw new Error(name);
    }, actions);
    return { actions, writes };
  }
  const keeper = actionHarness("keeper");
  assert.equal((await keeper.actions.saveShareCard(bookId, null, `${userId}/family.webp`)).success, true);
  assert.deepEqual(keeper.writes[0], { share_card_recipe_id: null, share_card_custom_path: `${userId}/family.webp` });
  assert.equal((await keeper.actions.saveShareCard(bookId, null, null)).success, true);
  assert.equal(keeper.writes[1].share_card_custom_path, null);
  for (const role of ["family", "contributor", null]) {
    const h = actionHarness(role);
    assert.equal((await h.actions.saveShareCard(bookId, null, `${userId}/family.webp`)).success, false);
    assert.equal(h.writes.length, 0);
  }
  assert.equal((await keeper.actions.saveShareCard(bookId, null, `${otherId}/family.webp`)).success, false);
});
