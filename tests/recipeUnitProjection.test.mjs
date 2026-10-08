import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(sourcePath, dependencies = {}) {
  const source = readFileSync(new URL(sourcePath, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const compiled = { exports: {} };
  new Function("module", "exports", "require", code)(compiled, compiled.exports, (name) => dependencies[name]);
  return compiled.exports;
}

const units = load("../src/lib/metricUnits.ts");
const scaling = load("../src/lib/ingredientScaling.ts");
const { projectRecipeUnits, restoreUneditedSource } = load("../src/lib/recipeUnitProjection.ts", {
  "@/lib/metricUnits": units,
});

test("mixed import projects each recognized measurement and preserves source on save", () => {
  const source = {
    ingredients: [
      { quantity: "1/4", unit: "tsp", item: "salt" },
      { quantity: "1", unit: "cup", item: "milk" },
      { quantity: "100", unit: "g", item: "chocolate" },
      { quantity: "2", unit: "can", item: "tomatoes" },
      { quantity: "1/2", unit: "tsp", item: "vanilla" },
    ],
    instructions: [{ body: "Preheat oven to 350°F; then lower to 180°C for the finish." }],
  };
  const metric = projectRecipeUnits(source, true);
  assert.deepEqual(metric.ingredients.map(({ quantity, unit }) => [quantity, unit]), [
    ["1.25", "mL"], ["235", "mL"], ["100", "g"], ["2", "can"], ["2.5", "mL"],
  ]);
  assert.equal(metric.instructions[0].body, "Preheat oven to 175°C; then lower to 180°C for the finish.");
  assert.deepEqual(restoreUneditedSource(metric, source, true), source);
  assert.deepEqual(projectRecipeUnits(restoreUneditedSource(metric, source, true), true), metric);
});

test("imperial preference converts metric imports and leaves familiar count quantities", () => {
  const source = {
    ingredients: [
      { quantity: "235", unit: "mL", item: "milk" },
      { quantity: "5", unit: "mL", item: "vanilla" },
      { quantity: "1.25", unit: "mL", item: "salt" },
      { quantity: "2", unit: "cloves", item: "garlic" },
      { quantity: "a pinch", unit: "", item: "salt" },
    ],
    instructions: [{ body: "Bake at 180°C for 30 minutes in a 20 cm pan." }],
  };
  const imperial = projectRecipeUnits(source, false);
  assert.deepEqual(imperial.ingredients.slice(0, 3).map(({ quantity, unit }) => [quantity, unit]), [
    ["1", "cup"], ["1", "tsp"], ["1/4", "tsp"],
  ]);
  assert.deepEqual(imperial.ingredients.slice(3), source.ingredients.slice(3));
  assert.equal(imperial.instructions[0].body, "Bake at 350°F for 30 minutes in a 20 cm pan.");
  assert.deepEqual(restoreUneditedSource(imperial, source, false), source);
});

test("edits replace only the edited source fields", () => {
  const source = {
    ingredients: [{ quantity: "1", unit: "cup", item: "milk" }],
    instructions: [{ body: "Bake at 350°F." }],
  };
  const edited = projectRecipeUnits(source, true);
  edited.ingredients[0] = { ...edited.ingredients[0], quantity: "250" };
  edited.instructions[0] = { body: "Bake at 190°C." };
  const saved = restoreUneditedSource(edited, source, true);
  assert.deepEqual(saved.ingredients[0], { quantity: "250", unit: "mL", item: "milk" });
  assert.equal(saved.instructions[0].body, "Bake at 190°C.");
  assert.deepEqual(projectRecipeUnits(saved, true), edited);
});

test("renaming an ingredient keeps its unchanged source measurement", () => {
  const source = { ingredients: [{ quantity: "1", unit: "cup", item: "milk" }], instructions: [] };
  const shown = projectRecipeUnits(source, true);
  shown.ingredients[0].item = "oat milk";
  assert.deepEqual(restoreUneditedSource(shown, source, true).ingredients[0], {
    quantity: "1", unit: "cup", item: "oat milk",
  });
});

test("ranges and unsupported package or fluid labels are preserved safely", () => {
  assert.deepEqual(units.displayIngredientAmount("1-2", "cups", true), { quantity: "235–475", unit: "mL" });
  assert.deepEqual(units.displayIngredientAmount("1 1/2", "cups", true), { quantity: "355", unit: "mL" });
  assert.deepEqual(units.displayIngredientAmount("2", "fl oz", true), { quantity: "59", unit: "mL" });
  assert.deepEqual(units.displayIngredientAmount("2", "oz", true), { quantity: "57", unit: "g" });
  assert.deepEqual(units.displayIngredientAmount("2", "14 oz cans", true), { quantity: "2", unit: "14 oz cans" });
  assert.equal(units.displayRecipeTemperatures("Bake at 375 degrees F. Model 350F2.", true), "Bake at 190°C. Model 350F2.");
});

test("two viewers and serving scale derive from one unchanged source", () => {
  const source = {
    ingredients: [{ quantity: "1/2", unit: "cup", item: "cream" }],
    instructions: [{ body: "Bake at 375°F." }],
  };
  const metric = projectRecipeUnits(source, true);
  const imperial = projectRecipeUnits(source, false);
  assert.deepEqual(metric.ingredients[0], { quantity: "120", unit: "mL", item: "cream" });
  assert.deepEqual(imperial.ingredients[0], source.ingredients[0]);
  const doubledSource = scaling.scaleIngredientQuantity(source.ingredients[0].quantity, 2);
  assert.deepEqual(units.displayIngredientAmount(doubledSource, source.ingredients[0].unit, true), { quantity: "235", unit: "mL" });
  assert.deepEqual(source.ingredients[0], { quantity: "1/2", unit: "cup", item: "cream" });
});
