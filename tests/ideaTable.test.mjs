import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/ideaTable.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } });
const { buildIdeaTablePrompt, defaultIdeaTable, describeIdeaTable, ideaMealTypes } = await import(`data:text/javascript,${encodeURIComponent(outputText)}`);

test("table alone supplies a complete generation request", () => {
  const prompt = buildIdeaTablePrompt("  ", defaultIdeaTable);
  assert.match(prompt, /practical recipe idea/);
  assert.match(prompt, /Do not default to dinner/);
  assert.match(prompt, /Make 4 servings/);
  assert.doesNotMatch(prompt, /Required allergy exclusions/);
});

test("combined budget, time, and diet needs retain strict exclusions even with conflicting pantry ingredients", () => {
  const prompt = buildIdeaTablePrompt("Comfort food", { ...defaultIdeaTable, servings: "2", minutes: "30", budget: "budget", diets: ["Gluten free", "Vegan"], allergies: "peanuts, sesame", pantry: "peanut butter, rice" });
  for (const text of ["Comfort food", "Make 2 servings", "preparation AND cooking time", "30 minutes", "Do not invent prices", "Gluten free, Vegan", "Required allergy exclusions: peanuts, sesame", "Never relax exclusions", "where compatible", "peanut butter, rice", "Never claim the recipe is allergy safe"]) assert.ok(prompt.includes(text), text);
});

test("draft summary captures the requested settings without asserting verified suitability", () => {
  const summary = describeIdeaTable({ ...defaultIdeaTable, budget: "budget", diets: ["Gluten free"], allergies: " sesame " });
  assert.equal(summary, "Any meal · For 4 · Budget friendly · Any time · Gluten free · Avoid: sesame");
});

 test("each selected meal type overrides conflicting inspiration and appears in the draft summary", () => {
  for (const mealType of ideaMealTypes.filter(type => type !== "Any meal")) {
    const table = { ...defaultIdeaTable, mealType };
    const prompt = buildIdeaTablePrompt("A cozy dinner", table);
    assert.ok(prompt.includes(`Required meal type: ${mealType}.`));
    assert.match(prompt, /inspiration only where compatible/);
    assert.ok(describeIdeaTable(table).startsWith(`${mealType} · `));
  }
});
