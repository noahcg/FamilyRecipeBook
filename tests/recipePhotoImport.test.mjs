import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
async function load(path, dependencies = {}, globals = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  Function("exports", "require", ...Object.keys(globals), compiled)(exports, (name) => dependencies[name] ?? require(name), ...Object.values(globals));
  return exports;
}
const imageImport = await load("../src/lib/imageImport.ts");
const schema = await load("../src/lib/recipeImportSchema.ts");
const permissions = await load("../src/lib/permissions.ts");
const text = `Family pancakes
Prep time: 1 hour 30 minutes
Cook time: 15 minutes
Serves 4
Ingredients
1½ cups flour, sifted.
½ tsp salt.
1 cup milk
Instructions
Mix the flour, salt and milk together.
Cook over low heat for ten minutes.
Cook 10 minutes until golden brown.
Bake 20 minutes at 350 degrees.
Serve warm with your favorite fruit.`;

test("photo parser preserves mixed fractions, punctuated ingredients, cooking steps and compound times", () => {
  const recipe = imageImport.parseRecipeText(text);
  assert.equal(recipe.ingredients.length, 3);
  assert.equal(recipe.ingredients[0].quantity, "1 1/2");
  assert.equal(recipe.ingredients[1].quantity, "1/2");
  assert.match(recipe.ingredients[0].item, /flour/);
  assert.match(recipe.instructions.map((step) => step.body).join(" "), /Cook over low heat for ten minutes/);
  assert.match(recipe.instructions.map((step) => step.body).join(" "), /Cook 10 minutes until golden brown/);
  assert.match(recipe.instructions.map((step) => step.body).join(" "), /Bake 20 minutes at 350 degrees/);
  assert.equal(recipe.prep_minutes, 90);
  assert.equal(recipe.cook_minutes, 15);
  assert.equal(recipe.servings, 4);
  assert.equal(recipe.confidence, "medium");
  assert.equal(imageImport.parseRecipeText("Unreadable").confidence, "low");
});

test("local OCR retains 3000px lossless text; AI images stay within the exact upload budget", async () => {
  const encodings = [];
  const context = { fillRect() {}, drawImage() {} };
  const canvas = { width: 0, height: 0, getContext: () => context, toDataURL(type, quality) {
    encodings.push({ type, quality, width: this.width, height: this.height });
    return `data:${type};base64,${Buffer.alloc(type === "image/png" ? 900_000 : 700 * 1024).toString("base64")}`;
  } };
  class Image { width = 4000; height = 3000; set src(value) { this.onload(); } }
  class FileReader { readAsDataURL() { this.result = "data:image/png;base64,AAAA"; this.onload(); } }
  const { prepareRecipeImportImage } = await load("../src/lib/imageImport.ts", {}, { Image, FileReader, document: { createElement: () => canvas } });
  const file = new File(["image"], "page.png", { type: "image/png" });
  await prepareRecipeImportImage(file, "local");
  assert.deepEqual(encodings[0], { type: "image/png", quality: undefined, width: 3000, height: 2250 });
  const result = await prepareRecipeImportImage(file, "openai");
  assert.equal(encodings[1].width, 3000);
  assert.equal(Buffer.from(result.split(",")[1], "base64").length, 700 * 1024);
  canvas.toDataURL = () => `data:image/jpeg;base64,${Buffer.alloc(700 * 1024 + 1).toString("base64")}`;
  await assert.rejects(prepareRecipeImportImage(file, "openai"), /too large/);
});

const bookId = "00000000-0000-4000-8000-000000000001";
const image = "data:image/jpeg;base64,AQID";
async function actionHarness({ role = "contributor", settings = { ai_provider: "openai", ai_api_key: "synthetic-key" }, authenticated = true, response, throttled = false, model = "gpt-5.4-mini" } = {}) {
  const requests = [];
  const filters = [];
  const recipe = imageImport.parseRecipeText(text);
  const action = await load("../src/lib/actions/recipeImageImport.ts", {
    "@/lib/auth": { requireUser: async () => { if (!authenticated) throw new Error("Unauthenticated"); return { id: "user" }; } },
    "@/lib/supabase/server": { createClient: async () => ({ from(table) {
      const chain = { select() { return chain; }, eq(...args) { filters.push([table, ...args]); return chain; },
        single: async () => ({ data: role ? { role } : null }), maybeSingle: async () => ({ data: settings }) };
      return chain;
    } }) },
    "@/lib/permissions": permissions,
    "@/lib/ai/external": { runExternalAiRequest: async (request) => { requests.push(request); return response ?? { success: true, json: { output: [{ content: [{ text: JSON.stringify(recipe) }] }] } }; } },
    "@/lib/ai/modelRegistry": { resolveExternalModel: () => model },
    "@/lib/ai/throttle": { consumeAiTaskThrottle: () => !throttled },
    "@/lib/recipeImportSchema": schema,
  });
  return { run: (images = [image]) => action.improveRecipeImportWithOpenAI({ bookId, pages: Array.isArray(images) ? images.map((dataUrl) => ({ dataUrl })) : images }), requests, filters };
}

test("authorized personal-key import sends all four pages in order without storing the response", async () => {
  for (const role of ["keeper", "contributor"]) {
    const h = await actionHarness({ role });
    const images = Array.from({ length: 4 }, (_, index) => `data:image/jpeg;base64,${Buffer.alloc(700 * 1024, index).toString("base64")}`);
    assert.equal((await h.run(images)).success, true);
    const request = h.requests[0];
    assert.equal(request.apiKey, "synthetic-key");
    assert.equal(request.body.store, false);
    assert.deepEqual(request.body.input[1].content.filter((part) => part.type === "input_image").map((part) => part.image_url), images);
    assert.ok(request.body.input[1].content.filter((part) => part.type === "input_image").every((part) => part.detail === "original"));
    assert.ok(h.filters.some((filter) => filter.join() === "user_settings,user_id,user"));
    const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
    assert.match(config, /bodySizeLimit: "4mb"/);
    assert.ok(Buffer.byteLength(JSON.stringify([bookId, images])) + 20_000 < 4 * 1024 * 1024);
  }
});

test("invalid payloads and oversized images never reach the provider", async () => {
  const tooLarge = `data:image/jpeg;base64,${Buffer.alloc(2800 * 1024 + 1).toString("base64")}`;
  for (const input of [null, {}, [], [12], [null], ["https://example.test/photo.jpg"], ["data:image/jpeg;base64,invalid!"], ["data:image/jpeg;base64,A"], ["data:image/jpeg;base64,AB=="], [tooLarge], Array(5).fill(image)]) {
    const h = await actionHarness();
    assert.equal((await h.run(input)).success, false);
    assert.equal(h.requests.length, 0);
  }
});

test("Family members, unrelated users, missing keys and throttled requests cannot spend a personal key", async () => {
  for (const options of [{ role: "family" }, { role: null }, { settings: null }, { settings: { ai_provider: "anthropic", ai_api_key: "synthetic" } }, { throttled: true }]) {
    const h = await actionHarness(options);
    assert.equal((await h.run()).success, false);
    assert.equal(h.requests.length, 0);
  }
  const h = await actionHarness({ authenticated: false });
  await assert.rejects(h.run(), /Unauthenticated/);
  assert.equal(h.requests.length, 0);
});

test("provider errors have useful recovery messages and malformed recipes are rejected", async () => {
  for (const [category, message] of [["authentication", /key/], ["budget_or_rate_limit", /quota/], ["timeout", /too long/]]) {
    const h = await actionHarness({ response: { success: false, category } });
    assert.match((await h.run()).error, message);
  }
  for (const json of [{}, { output_text: "not JSON" }, { output_text: JSON.stringify({ title: "Incomplete" }) }]) {
    const h = await actionHarness({ response: { success: true, json } });
    assert.equal((await h.run()).success, false);
  }
});

const formSource = await readFile(new URL("../src/components/recipe/RecipeForm.tsx", import.meta.url), "utf8");
const handlerSource = formSource.slice(formSource.indexOf("  async function importRecipePhotos("), formSource.indexOf("  async function handleImportImageChange("));
const handlerCode = ts.transpileModule(handlerSource, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function formHarness({ mode = "local", aiThrows = false, localFails = false } = {}) {
  const previous = [{ title: "Existing draft" }];
  const state = { importedRecipes: previous };
  const calls = [];
  const deps = { photoImportMode: mode, photoImportBusy: { current: false }, bookId,
    importFileRef: { current: { value: "selected" } },
    prepareRecipeImportImage: async (_, selectedMode) => { calls.push(selectedMode); return image; },
    improveRecipeImportWithOpenAI: async (request) => { assert.deepEqual(request, { bookId, pages: [{ dataUrl: image }] }); calls.push("AI"); if (aiThrows) throw new Error("Connection failed"); return { success: true, data: imageImport.parseRecipeText(text) }; },
    importRecipesWithLocalOcr: async () => { calls.push("OCR"); if (localFails) throw new Error("No readable text"); return [imageImport.parseRecipeText(text)]; },
  };
  for (const key of ["ImportFileName", "ImportedRecipes", "ActiveImportedRecipeIndex", "ConfirmImportReplace", "PhotoImportReviewNotice", "ImportError", "ImportFiles", "ImportSource", "ImportProgress", "ImportStatus", "IsImporting"]) {
    deps[`set${key}`] = (value) => { state[key[0].toLowerCase() + key.slice(1)] = value; };
  }
  const run = Function(...Object.keys(deps), `${handlerCode}\nreturn importRecipePhotos;`)(...Object.values(deps));
  return { run, state, calls, previous, deps };
}

test("direct AI bypasses OCR; free reading never calls the provider", async () => {
  for (const mode of ["openai", "local"]) {
    const h = formHarness({ mode });
    await h.run(["file"]);
    assert.deepEqual(h.calls, [mode, mode === "openai" ? "AI" : "OCR"]);
    assert.equal(h.state.importSource, mode);
    assert.equal(h.state.isImporting, false);
  }
});

test("failed free reading retains files for AI rescue; transport failure releases controls and preserves a draft", async () => {
  const local = formHarness({ localFails: true });
  await local.run(["file"]);
  assert.deepEqual(local.state.importFiles, ["file"]);
  assert.match(local.state.importError, /No readable text/);
  const ai = formHarness({ mode: "openai", aiThrows: true });
  await ai.run(["file"], "openai", true);
  assert.equal(ai.state.importedRecipes, ai.previous);
  assert.equal(ai.state.isImporting, false);
  assert.equal(ai.deps.photoImportBusy.current, false);
  assert.match(ai.state.importError, /Connection failed/);
  await ai.run(["file"], "local", true);
  assert.equal(ai.state.importSource, "local");
  assert.equal(ai.state.importError, null);
});

test("photo model override keeps legacy high-detail requests compatible", async () => {
  const h = await actionHarness({ model: "gpt-4.1-mini" });
  assert.equal((await h.run()).success, true);
  assert.equal(h.requests[0].body.reasoning, undefined);
  assert.equal(h.requests[0].body.input[1].content[1].detail, "high");
});

test("single photos keep original bytes while four pages share the request budget", async () => {
  const source = `data:image/jpeg;base64,${Buffer.alloc(825 * 1024).toString("base64")}`;
  let encodings = 0;
  class Image { width = 1774; height = 2191; set src(value) { this.onload(); } }
  class FileReader { readAsDataURL() { this.result = source; this.onload(); } }
  const canvas = { getContext: () => ({ fillRect() {}, drawImage() {} }), toDataURL: () => { encodings++; return image; } };
  const { prepareRecipeImportImage } = await load("../src/lib/imageImport.ts", {}, { Image, FileReader, document: { createElement: () => canvas } });
  const file = new File(["image"], "page.jpg", { type: "image/jpeg" });
  assert.equal(await prepareRecipeImportImage(file, "openai", 1), source);
  assert.equal(encodings, 0);
  assert.equal(await prepareRecipeImportImage(file, "openai", 4), image);
  assert.equal(encodings, 1);
  const h = await actionHarness();
  assert.equal((await h.run([source])).success, true);
  const excess = await actionHarness();
  assert.equal((await excess.run(Array(4).fill(source))).success, false);
  assert.equal(excess.requests.length, 0);
});

test("AI recipe field constraints agree with the local validator", () => {
  const properties = schema.importedRecipeJsonSchema.properties;
  assert.equal(properties.description.maxLength, 500);
  assert.equal(properties.story.maxLength, 2000);
  assert.equal(properties.ingredients.items.properties.quantity.maxLength, 20);
  assert.equal(properties.ingredients.items.properties.note.maxLength, 200);
  assert.equal(properties.instructions.items.properties.body.maxLength, 2000);
  assert.equal(properties.warnings.items.maxLength, 160);
});
