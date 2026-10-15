import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const url = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
async function moduleUrl(path, replacements = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  let { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
  for (const [name, target] of Object.entries(replacements)) outputText = outputText.replaceAll(`"${name}"`, JSON.stringify(target));
  return url(outputText);
}
const zodUrl = pathToFileURL(require.resolve("zod")).href;
const streamUrl = await moduleUrl("../src/lib/ai/stream.ts");
const { readSse } = await import(streamUrl);
const routeMockUrl = url(`
export const state = { signedIn: true, calls: 0, result: { success: false, error: "Incomplete recipe." } };
export async function getUser() { return state.signedIn ? { id: "user" } : null; }
export async function generateRecipeIdea(prompt, bookId, stream) {
 state.calls++;
 state.signal = stream.signal;
 state.requestId = stream.requestId;
 stream.onText('{"title":"Soup","description":"A warm soup."');
 if (state.wait) await state.wait;
 return state.result;
}`);
const { state } = await import(routeMockUrl);
const route = await import(await moduleUrl("../src/app/api/recipe-ideas/route.ts", {
  zod: zodUrl, "@/lib/auth": routeMockUrl, "@/lib/ai/recipeGeneration": routeMockUrl, "@/lib/ai/stream": streamUrl,
}));
const bookId = "11111111-1111-4111-8111-111111111111";
function request(body = { prompt: "A warm rice dinner", bookId }, origin = "https://home.test") {
 return new Request("https://home.test/api/recipe-ideas", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}

test("stream route rejects cross-origin, signed-out and malformed requests before generation", async () => {
 state.calls = 0;
 assert.equal((await route.POST(request(undefined, "https://other.test"))).status, 403);
 state.signedIn = false;
 assert.equal((await route.POST(request())).status, 401);
 state.signedIn = true;
 assert.equal((await route.POST(request({ prompt: "short", bookId }))).status, 400);
 assert.equal((await route.POST(request({ prompt: "A rice dinner", bookId: "invalid" }))).status, 400);
 assert.equal((await route.POST(request({ prompt: "x".repeat(12_001), bookId }))).status, 413);
 assert.equal(state.calls, 0);
});

test("stream route exposes previews but sends no completion for rejected recipes", async () => {
 state.result = { success: false, error: "Incomplete recipe." };
 const response = await route.POST(request());
 assert.equal(response.headers.get("cache-control"), "no-store, no-transform");
 const events = [];
 await readSse(response.body, (data) => events.push(JSON.parse(data)));
 assert.equal(events[1].type, "preview");
 assert.equal(events[1].data.title, "Soup");
 assert.equal(events.at(-1).type, "error");
 assert.equal(events.some((event) => event.type === "complete"), false);
});

test("stream route sends the final validated result separately from previews", async () => {
 state.result = { success: true, data: { title: "Finished Soup" } };
 const events = [];
 await readSse((await route.POST(request())).body, (data) => events.push(JSON.parse(data)));
 assert.deepEqual(events.at(-1), { type: "complete", data: state.result.data });
});


test("route delivers previews before generation completes and aborts on disconnect", async () => {
 let release;
 state.wait = new Promise((resolve) => { release = resolve; });
 const response = await route.POST(request());
 const reader = response.body.getReader();
 const first = await reader.read();
 const second = await reader.read();
 assert.match(new TextDecoder().decode(first.value), /status/);
 assert.match(new TextDecoder().decode(second.value), /preview/);
 assert.equal(typeof state.requestId, "string");
 assert.equal(state.signal.aborted, false);
 await reader.cancel();
 assert.equal(state.signal.aborted, true);
 release();
 state.wait = null;
});

const coreMockUrl = url(`
export const core = { member: true, throttle: true, allowance: true, consumed: 0, calls: 0, output: null, provider: null, key: null };
export async function requireUser() { return { id: "user" }; }
export async function createClient() { return { from(table) { const query = {
 select() { return query; }, eq() { return query; },
 async maybeSingle() { return { data: core.member ? { role: "family" } : null }; },
 async order() { return { data: [{ name: "Dinner" }] }; },
 async single() { return { data: { metric_units: false, ai_provider: core.provider, ai_api_key: core.key } }; }
 }; return query; } }; }
export function consumeAiTaskThrottle() { return core.throttle; }
export class EntitlementError extends Error {}
export async function consumeAiAllowance() { core.consumed++; if (!core.allowance) throw new EntitlementError("Allowance exhausted."); }
export async function runCloudflareTask(task, options) { core.calls++; options.onText?.(JSON.stringify(core.output)); return { success: true, output: core.output }; }
export function cloudflareFailureMessage() { return "Unavailable"; }
export function displayIngredientAmount(quantity, unit) { return { quantity, unit }; }
export async function runExternalAiRequest(options) {
 core.externalOptions = options;
 options.onText?.(JSON.stringify(core.output));
 return { success: true, json: options.provider === "openai"
  ? { output_text: JSON.stringify(core.output) }
  : { content: [{ type: "tool_use", name: "create_recipe", input: core.output }] } };
}
`);
const { core } = await import(coreMockUrl);
const coreModule = await import(await moduleUrl("../src/lib/ai/recipeGeneration.ts", {
 "server-only": url("export{}"), zod: zodUrl,
 "@/lib/ai/cloudflare": coreMockUrl, "@/lib/ai/external": coreMockUrl,
 "@/lib/ai/modelRegistry": await moduleUrl("../src/lib/ai/modelRegistry.ts"),
 "@/lib/ai/throttle": coreMockUrl, "@/lib/ai/prompts": await moduleUrl("../src/lib/ai/prompts.ts"),
 "@/lib/metricUnits": coreMockUrl, "@/lib/ai/recipeContract": await moduleUrl("../src/lib/ai/recipeContract.ts"),
 "@/lib/auth": coreMockUrl, "@/lib/supabase/server": coreMockUrl, "@/lib/entitlements": coreMockUrl,
}));
const validRecipe = {
 title: "Rice Soup", description: "Warm rice soup.", source_name: "AI Recipe Idea", story: "A simple dinner.",
 prep_minutes: 5, cook_minutes: 20, servings: 4, category: "Dinner", tags: [],
 ingredients: ["rice", "water", "salt", "parsley"].map((item) => ({ quantity: "1", unit: "cup", item, note: "" })),
 instructions: [{ body: "Rinse rice." }, { body: "Simmer rice in water." }, { body: "Add salt and parsley." }],
};
async function generate(output) {
 core.output = output;
 return coreModule.generateRecipeIdea("A warm rice dinner", bookId, { signal: new AbortController().signal, onText() {} });
}

test("streaming core retains membership, throttle, validation and allowance gates", async () => {
 const oldAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
 const oldToken = process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN;
 process.env.CLOUDFLARE_ACCOUNT_ID = "fixture";
 process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN = "fixture";
 try {
   core.member = false;
   assert.equal((await generate(validRecipe)).success, false);
   assert.equal(core.calls, 0);
   core.member = true; core.throttle = false;
   assert.equal((await generate(validRecipe)).success, false);
   assert.equal(core.calls, 0);
   core.throttle = true;
   assert.equal((await generate({ title: "Incomplete" })).success, false);
   assert.equal(core.consumed, 0);
   const duplicate = structuredClone(validRecipe);
   duplicate.instructions[1] = duplicate.instructions[0];
   assert.equal((await generate(duplicate)).success, false);
   assert.equal(core.consumed, 0);
   core.allowance = false;
   assert.equal((await generate(validRecipe)).success, false);
   core.allowance = true;
   assert.deepEqual(await generate(validRecipe), { success: true, data: validRecipe });
 } finally {
   if (oldAccount === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID; else process.env.CLOUDFLARE_ACCOUNT_ID = oldAccount;
   if (oldToken === undefined) delete process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN; else process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN = oldToken;
 }
});


test("personal providers receive streaming callbacks, schema/tool contracts and cancellation", async () => {
 core.member = true; core.throttle = true; core.allowance = true; core.output = validRecipe;
 const originalCalls = core.calls;
 try {
  for (const provider of ["openai", "anthropic"]) {
   core.provider = provider; core.key = "private-fixture-key";
   const signal = new AbortController().signal;
   const previews = [];
   const result = await coreModule.generateRecipeIdea("A warm rice dinner", bookId, { signal, requestId: "test-request", onText: (text) => previews.push(text) });
   assert.equal(result.success, true);
   assert.equal(previews.length, 1);
   assert.equal(core.externalOptions.signal, signal);
   assert.equal(core.externalOptions.requestId, "test-request");
   if (provider === "openai") assert.equal(core.externalOptions.body.text.format.strict, true);
   else assert.equal(core.externalOptions.body.tool_choice.name, "create_recipe");
  }
  assert.equal(core.calls, originalCalls);
 } finally { core.provider = null; core.key = null; }
});
