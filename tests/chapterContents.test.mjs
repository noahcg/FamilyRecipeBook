import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/chapterContents.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const compiled = { exports: {} };
new Function("module", "exports", code)(compiled, compiled.exports);
const { groupRecipesByChapter } = compiled.exports;

test("contents follow saved chapter positions and alphabetize recipes within each chapter", () => {
  const recipes = [
    { title: "Ziti", category: "Dinner", categoryPosition: 0 },
    { title: "Bread", category: "Baking", categoryPosition: 2 },
    { title: "Apple", category: "Dinner", categoryPosition: 0 },
    { title: "Note", category: null, categoryPosition: null },
    { title: "Eggs", category: "Breakfast", categoryPosition: 1 },
  ];
  const chapters = groupRecipesByChapter(recipes, "Family Notes");
  assert.deepEqual(chapters.map(({ category, number }) => [category, number]), [
    ["Dinner", "01"], ["Breakfast", "02"], ["Baking", "03"], ["Family Notes", "04"],
  ]);
  assert.deepEqual(chapters[0].recipes.map(({ title }) => title), ["Apple", "Ziti"]);
  assert.deepEqual(groupRecipesByChapter(recipes.filter(({ title }) => title !== "Eggs"), "Family Notes")
    .map(({ category }) => category), ["Dinner", "Baking", "Family Notes"]);
});
