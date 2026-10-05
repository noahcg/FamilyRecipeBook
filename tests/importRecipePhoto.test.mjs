import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/components/recipe/RecipeForm.tsx", import.meta.url), "utf8");
const handler = source.slice(source.indexOf("  async function handleSaveImportedRecipes()"), source.indexOf("  async function onSubmit("));
const compiled = ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const candidate = {
  image_url: "https://images.pexels.com/photos/1/photo.jpeg",
  photographer: "Recipe photographer",
  photographer_url: "https://www.pexels.com/@photographer",
  source_url: "https://www.pexels.com/photo/1/",
};

async function save({ image = false, candidates = [candidate], fails = false } = {}) {
  const searches = [];
  let saved;
  const recipe = { id: "import-1", title: "Soup", ingredients: [{ item: "Tomatoes" }], image: image ? { file: "included" } : undefined };
  const deps = {
    fileImportRecipes: [recipe], selectedImportIds: new Set([recipe.id]),
    setFileImportError: () => {}, setIsSavingImport: () => {}, userId: "user",
    uploadRecipeImage: async () => ({ url: "https://example.com/included.jpg" }),
    importedRecipeToInput: (value, photo) => ({ title: value.title, ingredients: value.ingredients, photo_url: photo ?? null }),
    searchRecipeImages: async (...args) => { searches.push(args); if (fails) throw new Error("Unavailable"); return candidates; },
    resolvedSelectedBookId: "book", bookId: "book",
    createRecipesBatch: async (_, payload) => { saved = payload; return { success: true, data: { ids: ["saved"] } }; },
    router: { push() {} },
  };
  const run = Function(...Object.keys(deps), `${compiled}\nreturn handleSaveImportedRecipes;`)(...Object.values(deps));
  await run();
  return { searches, input: saved[0] };
}

test("file import searches by recipe and ingredients and saves image attribution", async () => {
  const { searches, input } = await save();
  assert.deepEqual(searches, [["Soup", ["Tomatoes"]]]);
  assert.equal(input.photo_url, candidate.image_url);
  assert.equal(input.photo_source, "Pexels");
  assert.equal(input.photo_author, candidate.photographer);
  assert.equal(input.photo_author_url, candidate.photographer_url);
  assert.equal(input.photo_source_url, candidate.source_url);
});
test("included import images are preserved without photo search", async () => {
  const { searches, input } = await save({ image: true });
  assert.deepEqual(searches, []);
  assert.equal(input.photo_url, "https://example.com/included.jpg");
});
test("no match or failed photo search still saves the imported recipe", async () => {
  for (const options of [{ candidates: [] }, { fails: true }]) {
    assert.equal((await save(options)).input.photo_url, null);
  }
});
