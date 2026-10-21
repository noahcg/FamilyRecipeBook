import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/recipeOcrLayout.ts', import.meta.url), 'utf8');
const exports = {};
Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports);
const { recipeTextFromOcrLayout } = exports;
function words(text, x, y) {
  return text.split(' ').map((text) => { const x0 = x; x += text.length * 7 + 8; return { text, confidence: 90, bbox: { x0, x1: x - 8, y0: y, y1: y + 18 } }; });
}
function blocks(rows) { return [{ paragraphs: [{ lines: rows.map((words) => ({ words })) }] }]; }

test('numbered method geometry separates ingredient and instruction columns on a sloping page', () => {
  const rows = [words('Family picnic bread', 100, 30), words('A loaf for sharing at the table with friends.', 100, 60)];
  for (let step = 1; step <= 5; step++) {
    const y = 150 + step * 100;
    rows.push([...words(`${step} cups flour for the dough`, 100, y), ...words(`${step} Mix the dough carefully until smooth.`, 450 - step * 10, y)]);
  }
  rows.push(words('20 minutes before the next step.', 425, 400));
  const result = recipeTextFromOcrLayout(blocks(rows));
  assert.ok(result);
  const [ingredients, instructions] = result.split('Ingredients\n')[1].split('Instructions\n');
  assert.match(ingredients, /cups flour/);
  assert.doesNotMatch(ingredients, /Mix the dough/);
  assert.doesNotMatch(instructions, /cups flour/);
  assert.match(instructions, /20 minutes before the next step/);
  assert.equal((instructions.match(/^\d+\. /gm) ?? []).length, 5);
});

test('ordinary single-column text and unnumbered layouts are not forcibly split', () => {
  assert.equal(recipeTextFromOcrLayout(null), null);
  const rows = Array.from({ length: 8 }, (_, index) => words(`${index + 1} cups chopped fruit with a pinch of spice`, 100, 100 + index * 30));
  assert.equal(recipeTextFromOcrLayout(blocks(rows)), null);
});
