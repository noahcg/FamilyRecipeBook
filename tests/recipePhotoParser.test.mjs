import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../src/lib/imageImport.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
Function("exports", "require", compiled)(exports, require);
const { parseRecipeText } = exports;

test("wrapped ingredients stay attached without crossing component headings or seasoning items", () => {
  const recipe = parseRecipeText(`Family bars
Ingredients
Dough:
1 cup packed light
brown sugar
2 cups flour (spooned
and leveled)
Salt to taste
Filling:
½ to ¾ cup chopped
dried fruit
1 tsp cinnamon
Instructions
1. Mix the dough ingredients together.
2. Add the filling and bake until golden.`);
  assert.equal(recipe.ingredients.length, 5);
  assert.equal(recipe.ingredients[0].item, "packed light brown sugar");
  assert.equal(recipe.ingredients[1].item, "flour (spooned and leveled)");
  assert.equal(recipe.ingredients[2].item, "Salt to taste");
  assert.equal(recipe.ingredients[3].quantity, "1/2 to 3/4");
  assert.equal(recipe.ingredients[3].unit, "cup");
  assert.equal(recipe.ingredients[3].item, "chopped dried fruit");
  assert.deepEqual(recipe.ingredients.map((item) => item.group_label), ["Dough", "Dough", "Dough", "Filling", "Filling"]);
});

test("sequential bare numbered instructions establish the method boundary and retain wrapped paragraphs", () => {
  const recipe = parseRecipeText(`Family rolls
2 cups flour
1 cup milk
1 In a large mixing bowl, combine the flour
with the milk. Stir until the mixture forms a dough.
2 Divide the dough into four pieces.
Roll each piece into a ball.
3 Bake for twenty minutes until golden.`);
  assert.equal(recipe.ingredients.length, 2);
  assert.equal(recipe.instructions.length, 3);
  assert.match(recipe.instructions[0].body, /^In a large mixing bowl/);
  assert.match(recipe.instructions[0].body, /with the milk/);
  assert.match(recipe.instructions[1].body, /Roll each piece/);
  assert.match(recipe.instructions[2].body, /^Bake for/);
});

test("quantities and isolated numbers do not become bare instruction markers", () => {
  const recipe = parseRecipeText(`Family loaf
Ingredients
1 large egg
2 cups flour
3 tbsp milk
Instructions
1. Mix the ingredients together in a bowl.
2. Bake until golden and allow to cool.`);
  assert.deepEqual(recipe.ingredients.map((item) => item.quantity), ["1", "2", "3"]);
  assert.equal(recipe.instructions.length, 2);
  const isolated = parseRecipeText(`Family loaf
Ingredients
1 cup flour
2 eggs
Instructions
Mix the ingredients together in a bowl.
2 Add the eggs and continue mixing.`);
  assert.match(isolated.instructions.map((step) => step.body).join(" "), /2 Add the eggs/);
});

test("bare step sequences tolerate OCR gaps without splitting a duration range", () => {
  const recipe = parseRecipeText(`Family rolls
Ingredients
2 cups flour
1 cup milk
Instructions
1 In a bowl, mix the ingredients until smooth.
2 Let the dough rest for
3 to 5 minutes before shaping.
4 Divide the dough into equal pieces.
5 Roll each piece into a ball.
7 Bake until golden and allow to cool.`);
  assert.equal(recipe.instructions.length, 5);
  assert.match(recipe.instructions[1].body, /3 to 5 minutes before shaping/);
  assert.match(recipe.instructions[2].body, /^Divide/);
  assert.match(recipe.instructions[4].body, /^Bake/);
});

test("range endpoints preserve mixed numbers, fractions, decimals and original separator", () => {
  for (const [input, quantity] of [["½ to ¾", "1/2 to 3/4"], ["1½ to 2¼", "1 1/2 to 2 1/4"], ["1 1/2–2 3/4", "1 1/2–2 3/4"], ["0.5-0.75", "0.5-0.75"]]) {
    const recipe = parseRecipeText(`Family batter\nIngredients\n${input} cups flour\n2 eggs\nInstructions\n1. Mix all ingredients until smooth.\n2. Bake until the top is golden.`);
    assert.equal(recipe.ingredients[0].quantity, quantity);
    assert.equal(recipe.ingredients[0].unit, "cups");
    assert.equal(recipe.ingredients[0].item, "flour");
  }
});
