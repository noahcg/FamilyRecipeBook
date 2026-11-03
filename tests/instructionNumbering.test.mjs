import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/instructionNumbering.ts", import.meta.url), "utf8");
const exports = {};
Function("exports", ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(exports);
const { instructionNumbers } = exports;

test("numbers restart at each heading and ungrouped recipes stay sequential", () => {
  assert.deepEqual(instructionNumbers([{}, {}, {}]), [1, 2, 3]);
  assert.deepEqual(instructionNumbers([{group_label: "Dough"}, {group_label: "Dough"}, {group_label: "Glaze"}, {group_label: "Glaze"}]), [1, 2, 1, 2]);
  assert.deepEqual(instructionNumbers([{}, {}, {group_label: "Glaze"}, {group_label: "Glaze"}, {}, {group_label: "Glaze"}]), [1, 2, 1, 2, 3, 1]);
  assert.deepEqual(instructionNumbers([{}, {group_label: ""}, {group_label: ""}]), [1, 1, 2]);
});
