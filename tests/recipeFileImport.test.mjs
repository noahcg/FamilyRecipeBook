import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
async function load(path, dependencies = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source.replaceAll("import.meta.url", '"file:///test/import.js"'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  Function("exports", "require", compiled)(exports, (name) => dependencies[name] ?? require(name));
  return exports;
}
const imageImport = await load("../src/lib/imageImport.ts");
const textImport = await load("../src/lib/recipeTextImport.ts");
const { createRecipeSchema } = await load("../src/lib/validators/recipe.ts");
const recipeText = "Simple soup\nIngredients\n1 cup water\n1 tsp salt\nInstructions\n1. Combine water and salt.\n2. Simmer for 10 minutes.";

for (const servings of [undefined, 4]) {
  test(`PDF without/with yield (${servings}) produces a saveable recipe`, async () => {
    let destroyed = false;
    const text = recipeText + (servings ? `\nServes ${servings}` : "");
    const { importRecipeFiles } = await load("../src/lib/recipeFileImport.ts", {
      "@/lib/imageImport": imageImport,
      "@/lib/recipeTextImport": textImport,
      "pdfjs-dist": {
        GlobalWorkerOptions: {},
        getDocument: () => ({ promise: Promise.resolve({
          numPages: 1,
          getPage: async () => ({ getTextContent: async () => ({ items: text.split("\n").map((str) => ({ str, hasEOL: true })) }) }),
          destroy: async () => { destroyed = true; },
        }) }),
      },
    });
    const result = await importRecipeFiles([new File(["PDF fixture"], "soup.pdf", { type: "application/pdf" })]);
    assert.deepEqual(result.skippedFiles, []);
    assert.equal(result.recipes.length, 1);
    const recipe = result.recipes[0];
    assert.equal(recipe.servings, servings);
    assert.equal(recipe.import_source, "PDF text");
    assert.equal(createRecipeSchema.safeParse(recipe).success, true);
    assert.equal(destroyed, true);
  });
}
