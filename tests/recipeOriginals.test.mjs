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

function setup({ role = "keeper", creator = true, authenticated = true, visible = true, files = [] } = {}) {
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
        list: async () => ({ data: files, error: null }),
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

test("originals return authorized media URLs and preparation returns no reusable upload token", async () => {
  const calls = setup({ files: [{ id: "file", name: `${otherId}_Grandma cake.pdf` }] });
  const listing = await actions.listRecipeOriginals(recipeId);
  assert.equal(listing.success, true);
  assert.equal(listing.data[0].url, `/api/media/recipe-originals/${recipeId}/${otherId}_Grandma%20cake.pdf`);
  const before = calls();
  const prepared = await actions.prepareRecipeOriginalUpload(recipeId, "scan.pdf", 100, "application/pdf");
  assert.equal(prepared.success, true);
  assert.deepEqual(Object.keys(prepared.data), ["path"]);
  assert.equal(isRecipeOriginalPath(recipeId, prepared.data.path), true);
  assert.equal(calls(), before, "preparation must not issue any Storage capability");
});

test("drawer uploads prepared paths through current-session RLS and surfaces lost membership", async () => {
  const source = await readFile(new URL("../src/components/recipe/RecipeOriginalsDrawer.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  let removed = false;
  const uploadCalls = [];
  const states = [];
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const storage = { from: () => ({ upload: async (path, file, options) => {
    uploadCalls.push({ path, file, options });
    return { error: removed ? { message: "row-level security policy denied upload" } : null };
  } }) };
  Function("require", "exports", compiled)((name) => {
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name === "react") return { useRef: () => ({ current: null }), useEffect() {}, useState: (initial) => [initial === true ? false : initial, (value) => states.push(value)] };
    if (name === "lucide-react") return {};
    if (name === "@/components/ui") return { Button: "Button", Drawer: "Drawer" };
    if (name === "@/lib/supabase/client") return { createClient: () => ({ storage }) };
    if (name === "@/lib/actions/recipeOriginals") return {
      prepareRecipeOriginalUpload: async () => { removed = true; return { success: true, data: { path: validPath } }; },
      listRecipeOriginals: async () => ({ success: true, data: [] }), removeRecipeOriginal: async () => ({ success: true }),
    };
    throw new Error(`Unexpected import ${name}`);
  }, exports);
  const tree = exports.RecipeOriginalsDrawer({ recipeId, canEdit: true, onClose() {} });
  function findInput(node) {
    if (!node || typeof node !== "object") return null;
    if (node.type === "input") return node;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      const found = findInput(child);
      if (found) return found;
    }
    return null;
  }
  const file = new File(["%PDF-1.7"], "scan.pdf", { type: "application/pdf" });
  findInput(tree).props.onChange({ target: { files: [file], value: "scan.pdf" } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(uploadCalls.length, 1);
  assert.equal(uploadCalls[0].path, validPath);
  assert.equal(uploadCalls[0].file, file);
  assert.deepEqual(uploadCalls[0].options, { contentType: "application/pdf", upsert: false });
  assert.ok(states.includes("Could not upload this file. Please try again."));
});
