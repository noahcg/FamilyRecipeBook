import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/instructionGroupSave.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
Function("exports", compiled)(exports);

test("grouped saves require the migration-specific function and missing updates are visible", () => {
  const { recipeSaveRpc, recipeSaveError } = exports;
  assert.equal(recipeSaveRpc([{ group_label: "Dough" }]), "save_recipe_with_instruction_groups");
  assert.equal(recipeSaveRpc([{ group_label: null }]), "save_recipe_atomic");
  assert.match(recipeSaveError({ code: "PGRST202", message: "not found" }, recipeSaveRpc([{ group_label: "Dough" }]), "failed"), /database update/);
  assert.equal(recipeSaveError({ code: "42501", message: "Permission denied" }, recipeSaveRpc([{ group_label: "Dough" }]), "failed"), "Permission denied");
});
