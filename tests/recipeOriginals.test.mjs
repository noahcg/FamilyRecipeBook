import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function moduleUrl(path, replacements = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  let { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
  for (const [name, target] of Object.entries(replacements)) outputText = outputText.replaceAll(`"${name}"`, JSON.stringify(target));
  return `data:text/javascript,${encodeURIComponent(outputText)}`;
}
const validatorsUrl = await moduleUrl("../src/lib/recipeOriginals.ts", { zod: import.meta.resolve("zod") });
const permissionsUrl = await moduleUrl("../src/lib/permissions.ts");
const { recipeOriginalUploadSchema, isRecipeOriginalPath, originalFileName } = await import(validatorsUrl);
const recipeId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const validPath = `${recipeId}/${otherId}_Grandma cake.pdf`;

const mockClientUrl = `data:text/javascript,${encodeURIComponent("export async function createClient() { return globalThis.__originalTestClient; }")}`;
const actions = await import(await moduleUrl("../src/lib/actions/recipeOriginals.ts", {
  zod: import.meta.resolve("zod"),
  "@/lib/supabase/server": mockClientUrl,
  "@/lib/permissions": permissionsUrl,
  "@/lib/recipeOriginals": validatorsUrl,
}));

function setup({ role = "keeper", creator = true, authenticated = true, visible = true } = {}) {
  let storageCalls = 0;
  globalThis.__originalTestClient = {
    auth: { getUser: async () => ({ data: { user: authenticated ? { id: "viewer" } : null } }) },
    from(table) {
      const builder = {
        select() { return builder; }, eq() { return builder; },
        async single() { return { data: table === "recipes" ? (visible ? { book_id: "book", created_by: creator ? "viewer" : "someone-else" } : null) : (role ? { role } : null) }; },
      };
      return builder;
    },
    storage: { from() {
      storageCalls++;
      return {
        list: async () => ({ data: [], error: null }),
        createSignedUploadUrl: async (path) => ({ data: { path, token: "upload-token" }, error: null }),
        remove: async () => ({ data: [{ name: validPath }], error: null }),
      };
    } },
  };
  return () => storageCalls;
}

test("validates file types, size, names, and recipe IDs", () => {
  const valid = { recipeId, name: "Grandma cake.pdf", type: "application/pdf", size: 20 * 1024 * 1024 };
  assert.equal(recipeOriginalUploadSchema.safeParse(valid).success, true);
  for (const changes of [{ size: valid.size + 1 }, { size: 0 }, { type: "image/svg+xml" }, { name: "../secret.pdf" }, { name: "" }, { recipeId: "bad-id" }]) {
    assert.equal(recipeOriginalUploadSchema.safeParse({ ...valid, ...changes }).success, false);
  }
  assert.equal(originalFileName("../secret.svg", "image/png"), "secret.png");
});

test("attachment paths cannot escape their recipe or use executable extensions", () => {
  assert.equal(isRecipeOriginalPath(recipeId, validPath), true);
  for (const path of [validPath.replace(recipeId, otherId), `${recipeId}/../secret.pdf`, `${validPath}/extra`, validPath.replace(".pdf", ".html")]) assert.equal(isRecipeOriginalPath(recipeId, path), false);
});

test("Keeper and owning Contributor can attach and remove originals", async () => {
  for (const options of [{ role: "keeper", creator: false }, { role: "contributor", creator: true }]) {
    setup(options);
    assert.equal((await actions.prepareRecipeOriginalUpload(recipeId, "scan.pdf", 100, "application/pdf")).success, true);
    assert.equal((await actions.removeRecipeOriginal(recipeId, validPath)).success, true);
  }
});

test("Family and other Contributors can read but cannot mutate originals", async () => {
  for (const options of [{ role: "family", creator: true }, { role: "contributor", creator: false }]) {
    const calls = setup(options);
    assert.equal((await actions.prepareRecipeOriginalUpload(recipeId, "scan.pdf", 100, "application/pdf")).success, false);
    assert.equal((await actions.removeRecipeOriginal(recipeId, validPath)).success, false);
    assert.equal(calls(), 0);
    assert.equal((await actions.listRecipeOriginals(recipeId)).success, true);
  }
});

test("unauthenticated and unrelated cookbook users never reach Storage", async () => {
  for (const options of [{ authenticated: false }, { visible: false }, { role: null }]) {
    const calls = setup(options);
    assert.equal((await actions.listRecipeOriginals(recipeId)).success, false);
    assert.equal((await actions.prepareRecipeOriginalUpload(recipeId, "scan.pdf", 100, "application/pdf")).success, false);
    assert.equal((await actions.removeRecipeOriginal(recipeId, validPath)).success, false);
    assert.equal((await actions.copyRecipeOriginals(recipeId, otherId)).success, false);
    assert.equal(calls(), 0);
  }
});
