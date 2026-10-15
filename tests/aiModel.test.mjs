import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { evaluateCase } from "../scripts/ai-eval-lib.mjs";

async function moduleUrl(path, replacements = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  });
  for (const [name, target] of Object.entries(replacements)) {
    outputText = outputText.replaceAll(`"${name}"`, JSON.stringify(target));
  }
  return `data:text/javascript,${encodeURIComponent(outputText)}`;
}

const emptyModuleUrl = "data:text/javascript,export{}";
const registryUrl = await moduleUrl("../src/lib/ai/modelRegistry.ts");
const registry = await import(registryUrl);
const throttle = await import(await moduleUrl("../src/lib/ai/throttle.ts", {
  "server-only": emptyModuleUrl,
  "@/lib/ai/modelRegistry": registryUrl,
}));
const prompts = await import(await moduleUrl("../src/lib/ai/prompts.ts"));
const recipeContract = await import(await moduleUrl("../src/lib/ai/recipeContract.ts"));
const streamUrl = await moduleUrl("../src/lib/ai/stream.ts");
const stream = await import(streamUrl);
const cloudflare = await import(await moduleUrl("../src/lib/ai/cloudflare.ts", {
  "server-only": emptyModuleUrl,
  "@/lib/ai/modelRegistry": registryUrl,
  "@/lib/ai/stream": streamUrl,
}));
const external = await import(await moduleUrl("../src/lib/ai/external.ts", {
  "@/lib/ai/stream": streamUrl,
  "server-only": emptyModuleUrl,
  "@/lib/ai/modelRegistry": registryUrl,
}));

const originalCloudflareEnv = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken: process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN,
  model: process.env.CLOUDFLARE_WORKERS_AI_MODEL,
};

test.after(() => {
  if (originalCloudflareEnv.accountId === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
  else process.env.CLOUDFLARE_ACCOUNT_ID = originalCloudflareEnv.accountId;
  if (originalCloudflareEnv.apiToken === undefined) delete process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN;
  else process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN = originalCloudflareEnv.apiToken;
  if (originalCloudflareEnv.model === undefined) delete process.env.CLOUDFLARE_WORKERS_AI_MODEL;
  else process.env.CLOUDFLARE_WORKERS_AI_MODEL = originalCloudflareEnv.model;
});

function configureTestCloudflare() {
  process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
  process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN = "test-token";
  process.env.CLOUDFLARE_WORKERS_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
}

function quietLogger() {
  return { info() {}, warn() {} };
}

test("model registry rejects arbitrary overrides and keeps model IDs server-controlled", () => {
  const config = registry.resolveCloudflareTaskConfig("recipeGeneration", {
    CLOUDFLARE_RECIPE_GENERATION_MODEL: "@cf/unknown/paid-model",
  });
  assert.equal(config.primary, "@cf/google/gemma-4-26b-a4b-it");
  assert.equal(config.fallback, undefined);
  assert.equal(config.promptVersion, "recipe-generation-v2");
  assert.deepEqual(config.rejectedOverrides, ["CLOUDFLARE_RECIPE_GENERATION_MODEL"]);
  assert.equal(registry.isCloudflareModelAllowed("@cf/google/gemma-4-26b-a4b-it"), true);
  assert.equal(registry.isCloudflareModelAllowed("@cf/unknown/paid-model"), false);
  assert.equal(
    registry.getCloudflareModelDisplayName(config.primary),
    "Gemma 4 26B"
  );
  assert.deepEqual(
    registry.cloudflareModelRequestOptions("@cf/google/gemma-4-26b-a4b-it"),
    { chat_template_kwargs: { enable_thinking: false } }
  );

  const globalConfig = registry.resolveCloudflareTaskConfig("recipeGeneration", {
    CLOUDFLARE_WORKERS_AI_MODEL: "@cf/unknown/paid-model",
    CLOUDFLARE_WORKERS_AI_FALLBACK_MODEL: "@cf/meta/llama-3.1-8b-instruct-fast",
  });
  assert.deepEqual(globalConfig.rejectedOverrides, ["CLOUDFLARE_WORKERS_AI_MODEL"]);
  assert.equal(globalConfig.fallback, undefined);
});

test("per-user AI burst throttle is isolated by task and expires", () => {
  const policy = throttle.AI_THROTTLE_POLICIES.recipeGeneration;
  for (let index = 0; index < policy.limit; index += 1) {
    assert.equal(throttle.consumeAiTaskThrottle("throttle-user", "recipeGeneration", 10_000), true);
  }
  assert.equal(throttle.consumeAiTaskThrottle("throttle-user", "recipeGeneration", 10_000), false);
  assert.equal(throttle.consumeAiTaskThrottle("other-user", "recipeGeneration", 10_000), true);
  assert.equal(throttle.consumeAiTaskThrottle("throttle-user", "recipeDescription", 10_000), true);
  assert.equal(
    throttle.consumeAiTaskThrottle("throttle-user", "recipeGeneration", 10_000 + policy.windowMs + 1),
    true
  );
});

test("production prompt builders keep task-specific output contracts", () => {
  const generation = prompts.buildRecipeGenerationMessages("Use beans", ["Dinner", "Other"]);
  assert.match(generation[0].content, /Return only valid compact JSON/);
  assert.match(generation[0].content, /Dinner, or Other/);
  assert.match(generation[0].content, /Give every ingredient a practical quantity/);
  assert.match(generation[0].content, /never invent a person, family history/);
  assert.match(generation[0].content, /Never relax a dietary or allergy exclusion/);
  assert.match(generation[1].content, /Use beans/);

  const imageQuery = prompts.buildRecipeImageSearchMessages("Bean Soup", ["beans", "stock"]);
  assert.match(imageQuery[0].content, /3-5 word phrase/);
});

test("provider recipe schema mirrors production string and collection limits", () => {
  const schema = recipeContract.buildRecipeIdeaJsonSchema(["Dinner"]);
  assert.equal(schema.properties.title.maxLength, 200);
  assert.equal(schema.properties.tags.maxItems, 5);
  assert.equal(schema.properties.tags.items.maxLength, 30);
  assert.equal(schema.properties.ingredients.minItems, 4);
  assert.equal(schema.properties.ingredients.maxItems, 8);
  assert.equal(schema.properties.ingredients.items.properties.quantity.maxLength, 20);
  assert.equal(schema.properties.ingredients.items.properties.note.maxLength, 200);
  assert.equal(schema.properties.instructions.minItems, 3);
  assert.equal(schema.properties.instructions.maxItems, 6);
  assert.deepEqual(schema.properties.category.enum, ["Dinner"]);
  assert.equal(recipeContract.isValidRecipeQuantity(","), false);
  assert.equal(recipeContract.isValidRecipeQuantity("½"), true);
  assert.equal(recipeContract.isValidRecipeQuantity("to taste"), false);
  assert.equal(recipeContract.isValidRecipeQuantity(""), true);
});

test("Cloudflare adapter returns structured output and usage without exposing request content", async () => {
  configureTestCloudflare();
  const events = [];
  const result = await cloudflare.runCloudflareTask("recipeGeneration", {
    messages: [{ role: "user", content: "private recipe text" }],
    fetchImpl: async () => new Response(JSON.stringify({
      success: true,
      result: { response: { title: "Soup" }, usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } },
    }), { status: 200 }),
    logger: { info: (...args) => events.push(args), warn() {} },
  });
  assert.equal(result.success, true);
  assert.deepEqual(result.output, { title: "Soup" });
  assert.equal(result.usage.totalTokens, 30);
  assert.doesNotMatch(JSON.stringify(events), /private recipe text/);
});

test("Cloudflare adapter makes one bounded fallback attempt for transient failures", async () => {
  configureTestCloudflare();
  const urls = [];
  const result = await cloudflare.runCloudflareTask("recipeDescription", {
    messages: [{ role: "user", content: "Soup" }],
    fetchImpl: async (url) => {
      urls.push(String(url));
      if (urls.length === 1) return new Response("capacity", { status: 503 });
      return new Response(JSON.stringify({ success: true, result: { response: "Warm soup." } }), { status: 200 });
    },
    logger: quietLogger(),
  });
  assert.equal(urls.length, 2);
  assert.match(urls[1], /gemma-4-26b-a4b-it/);
  assert.equal(result.success, true);
  assert.equal(result.usedFallback, true);
});

test("recipe generation fails closed without an automatic model fallback", async () => {
  configureTestCloudflare();
  delete process.env.CLOUDFLARE_WORKERS_AI_MODEL;
  let calls = 0;
  const result = await cloudflare.runCloudflareTask("recipeGeneration", {
    messages: [{ role: "user", content: "Dinner" }],
    fetchImpl: async (url) => {
      calls += 1;
      assert.match(String(url), /gemma-4-26b-a4b-it/);
      return new Response("capacity", { status: 503 });
    },
    logger: quietLogger(),
  });
  assert.equal(calls, 1);
  assert.equal(result.success, false);
  assert.equal(result.usedFallback, false);
});

test("Cloudflare adapter does not retry authorization, rate-limit, or plan errors", async () => {
  configureTestCloudflare();
  for (const status of [401, 403, 429]) {
    let calls = 0;
    const result = await cloudflare.runCloudflareTask("recipeGeneration", {
      messages: [{ role: "user", content: "Dinner" }],
      fetchImpl: async () => {
        calls += 1;
        return new Response("denied", { status });
      },
      logger: quietLogger(),
    });
    assert.equal(result.success, false);
    assert.equal(calls, 1);
  }
});

test("Cloudflare adapter does not retry malformed successful output", async () => {
  configureTestCloudflare();
  let calls = 0;
  const result = await cloudflare.runCloudflareTask("recipeGeneration", {
    messages: [{ role: "user", content: "Dinner" }],
    fetchImpl: async () => {
      calls += 1;
      return new Response(JSON.stringify({ success: true, result: {} }), { status: 200 });
    },
    logger: quietLogger(),
  });
  assert.equal(result.success, false);
  assert.equal(result.category, "invalid_response");
  assert.equal(calls, 1);
});

test("external provider adapter records safe metadata without logging keys or prompts", async () => {
  const events = [];
  const result = await external.runExternalAiRequest({
    task: "recipeGeneration",
    provider: "openai",
    model: "gpt-5-mini",
    apiKey: "sk-secret-value",
    timeoutMs: 1000,
    body: { input: "private family recipe" },
    fetchImpl: async (_url, request) => {
      assert.match(request.headers.authorization, /^Bearer /);
      return new Response(JSON.stringify({ output_text: "{}", usage: { input_tokens: 4, output_tokens: 2 } }), { status: 200 });
    },
    logger: { info: (...args) => events.push(args) },
  });
  assert.equal(result.success, true);
  assert.equal(result.usage.inputTokens, 4);
  assert.doesNotMatch(JSON.stringify(events), /sk-secret-value|private family recipe/);
});

test("evaluation fixtures contain at least 20 synthetic cases and reject malformed output", async () => {
  const cases = JSON.parse(await readFile(new URL("../evals/ai/recipe-tasks.cases.json", import.meta.url), "utf8"));
  assert.ok(cases.length >= 20);
  assert.equal(new Set(cases.map((testCase) => testCase.id)).size, cases.length);
  const generationCase = cases.find((testCase) => testCase.task === "recipeGeneration");
  const malformed = evaluateCase(generationCase, "not json");
  assert.equal(malformed.pass, false);
  assert.equal(malformed.criticalFailure, true);
});

test("recipe evaluator enforces the complete response contract and quantities", () => {
  const testCase = {
    task: "recipeGeneration",
    categories: ["Dinner"],
    invariants: {
      servings: 4,
      forbiddenIngredients: ["peanut"],
      ingredientQuantities: [{ item: "parsley", accepted: ["0.5", "½"] }],
    },
  };
  const recipe = {
    title: "Parsley Rice",
    description: "A practical rice dinner without peanut.",
    source_name: "AI Recipe Idea",
    story: "",
    prep_minutes: 10,
    cook_minutes: 20,
    servings: 4,
    category: "Dinner",
    tags: ["quick"],
    ingredients: [
      { quantity: "1", unit: "cup", item: "rice", note: "" },
      { quantity: "0.5", unit: "cup", item: "parsley", note: "" },
      { quantity: "2", unit: "cups", item: "water", note: "" },
      { quantity: "1", unit: "tsp", item: "salt", note: "" },
    ],
    instructions: [
      { body: "Rinse the rice." },
      { body: "Cook the rice in water." },
      { body: "Fold in parsley and salt." },
    ],
  };
  assert.equal(evaluateCase(testCase, recipe).pass, true);

  const missingField = structuredClone(recipe);
  delete missingField.story;
  assert.deepEqual(evaluateCase(testCase, missingField).failures, ["invalid_recipe_schema"]);

  const unsafeNote = structuredClone(recipe);
  unsafeNote.ingredients[0].note = "top with peanut crumbs";
  assert.match(evaluateCase(testCase, unsafeNote).failures.join(","), /forbidden_ingredient:peanut/);

  const unsafeTitle = structuredClone(recipe);
  unsafeTitle.title = "Peanut Parsley Rice";
  assert.match(evaluateCase(testCase, unsafeTitle).failures.join(","), /forbidden_ingredient:peanut/);

  const safeNegation = structuredClone(recipe);
  safeNegation.description = "A practical peanut-free rice dinner without peanuts.";
  assert.equal(evaluateCase(testCase, safeNegation).pass, true);

  const unquantified = structuredClone(recipe);
  for (const ingredient of unquantified.ingredients) ingredient.quantity = "";
  assert.match(evaluateCase(testCase, unquantified).failures.join(","), /quantified_ingredients:0/);

  const duplicateSteps = structuredClone(recipe);
  duplicateSteps.instructions[1].body = duplicateSteps.instructions[0].body;
  assert.match(evaluateCase(testCase, duplicateSteps).failures.join(","), /duplicate_instructions/);

  const malformedQuantity = structuredClone(recipe);
  malformedQuantity.ingredients[0].quantity = ",";
  assert.match(evaluateCase(testCase, malformedQuantity).failures.join(","), /invalid_quantity:rice/);
});


test("SSE reader preserves split Unicode, CRLF, multiline data and final frames", async () => {
  const bytes = new TextEncoder().encode(': heartbeat\r\ndata: café\r\ndata: soup\r\n\r\ndata: [DONE]');
  const events = [];
  await stream.readSse(new ReadableStream({ start(controller) {
    for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
    controller.close();
  } }), (data) => events.push(data));
  assert.deepEqual(events, ["café\nsoup", "[DONE]"]);
});

test("recipe preview handles escaped strings and exposes only received ingredient fields", () => {
  const text = JSON.stringify({ title: 'Soup "for two"', description: "Café soup", ingredients: [
    { quantity: "1", unit: "cup", item: "rice", note: "rinsed" },
    { quantity: "2", unit: "cups", item: "water", note: "" },
  ], instructions: [{ body: "Cook the rice." }] });
  const early = stream.recipePreview(text.slice(0, text.indexOf(',"description"')));
  assert.equal(early.title, 'Soup "for two"');
  assert.equal(early.description, undefined);
  const partial = stream.recipePreview(text.slice(0, text.indexOf('"water"') + 3));
  assert.equal(partial.ingredients.length, 1);
  assert.deepEqual(stream.recipePreview(text).instructions, [{ body: "Cook the rice." }]);
});

test("Cloudflare streams before completion without incompatible JSON mode, preserving schema guidance and bounded request", async () => {
  configureTestCloudflare();
  delete process.env.CLOUDFLARE_WORKERS_AI_MODEL;
  const previews = [];
  const logs = [];
  let upstream;
  const pending = cloudflare.runCloudflareTask("recipeGeneration", {
    messages: [{ role: "system", content: "Return JSON." }, { role: "user", content: "private prompt" }],
    responseFormat: { type: "json_schema", json_schema: { type: "object" } },
    onText: (text) => previews.push(text),
    logger: { info: (...args) => logs.push(args), warn() {} },
    fetchImpl: async (_url, request) => {
      const body = JSON.parse(request.body);
      assert.equal(body.stream, true);
      assert.equal(body.chat_template_kwargs.enable_thinking, false);
      assert.equal(body.response_format, undefined);
      assert.match(body.messages[0].content, /Match this JSON Schema exactly/);
      assert.match(body.messages[0].content, /"type":"object"/);
      assert.equal(body.max_tokens, 1800);
      return new Response(new ReadableStream({ start(controller) { upstream = controller; } }), { headers: { "content-type": "text/event-stream" } });
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  upstream.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({ response: '{"title":"Soup"' }) + '\n\n'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(previews, ['{"title":"Soup"']);
  upstream.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({ choices: [{ delta: { content: '}' } }] }) + '\n\ndata: [DONE]\n\n'));
  upstream.close();
  const result = await pending;
  assert.equal(result.success, true);
  assert.equal(result.output, '{"title":"Soup"}');
  assert.equal(typeof logs[0][1].firstTokenMs, "number");
  assert.doesNotMatch(JSON.stringify(logs), /private prompt|Soup/);
});

test("Cloudflare rejects truncated, malformed and error streams without retrying generation", async () => {
  configureTestCloudflare();
  for (const content of ['data: {"response":"partial"}\n\n', 'data: broken\n\n', 'data: {"error":"failed"}\n\ndata: [DONE]\n\n']) {
    let calls = 0;
    const result = await cloudflare.runCloudflareTask("recipeGeneration", {
      messages: [{ role: "user", content: "Dinner" }], onText() {}, logger: quietLogger(),
      fetchImpl: async () => { calls++; return new Response(content, { headers: { "content-type": "text/event-stream" } }); },
    });
    assert.equal(result.success, false);
    assert.equal(calls, 1);
  }
});


test("streaming adapter passes cancellation upstream and accepts a normal JSON envelope", async () => {
  configureTestCloudflare();
  const abort = new AbortController();
  abort.abort();
  const cancelled = await cloudflare.runCloudflareTask("recipeGeneration", {
    messages: [], signal: abort.signal, onText() {}, logger: quietLogger(),
    fetchImpl: async (_url, request) => { assert.equal(request.signal.aborted, true); request.signal.throwIfAborted(); },
  });
  assert.equal(cancelled.success, false);
  const complete = await cloudflare.runCloudflareTask("recipeGeneration", {
    messages: [], onText() {}, logger: quietLogger(),
    fetchImpl: async () => new Response(JSON.stringify({ success: true, result: { response: '{"title":"Soup"}' } }), { headers: { "content-type": "application/json" } }),
  });
  assert.equal(complete.success, true);
  assert.equal(complete.output, '{"title":"Soup"}');
});

test("SSE reader cancels upstream when an error event interrupts consumption", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('data: error\n\n')); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(stream.readSse(body, () => { throw new Error("Interrupted"); }), /Interrupted/);
  assert.equal(cancelled, true);
});


test("OpenAI streams structured output previews before its completed response", async () => {
 const previews = [];
 let upstream;
 const pending = external.runExternalAiRequest({
   task: "recipeGeneration", provider: "openai", model: "gpt-5-mini", apiKey: "fixture-key", timeoutMs: 1000,
   body: { text: { format: { type: "json_schema", strict: true, schema: { type: "object" } } } },
   onText: (text) => previews.push(text), logger: quietLogger(),
   fetchImpl: async (_url, request) => {
     const body = JSON.parse(request.body);
     assert.equal(body.stream, true);
     assert.equal(body.text.format.strict, true);
     return new Response(new ReadableStream({ start(controller) { upstream = controller; } }), { headers: { "content-type": "text/event-stream" } });
   },
 });
 await new Promise((resolve) => setImmediate(resolve));
 upstream.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({ type: "response.output_text.delta", delta: '{"title":"Soup"' }) + '\n\n'));
 await new Promise((resolve) => setImmediate(resolve));
 assert.deepEqual(previews, ['{"title":"Soup"']);
 upstream.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({ type: "response.completed", response: { status: "completed", output_text: '{"title":"Soup"}', usage: { input_tokens: 10, output_tokens: 6 } } }) + '\n\n'));
 upstream.close();
 const result = await pending;
 assert.equal(result.success, true);
 assert.equal(result.json.output_text, '{"title":"Soup"}');
 assert.equal(result.usage.outputTokens, 6);
});

test("Anthropic streams create_recipe tool JSON and reconstructs the completed tool", async () => {
 const previews = [];
 const events = [
  { type: "message_start", message: { usage: { input_tokens: 10 } } },
  { type: "content_block_start", index: 0, content_block: { type: "tool_use", name: "create_recipe" } },
  { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"title":' } },
  { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '"Soup"}' } },
  { type: "message_delta", usage: { output_tokens: 5 } },
  { type: "message_stop" },
 ];
 const result = await external.runExternalAiRequest({
  task: "recipeGeneration", provider: "anthropic", model: "fixture", apiKey: "fixture", timeoutMs: 1000,
  body: {}, onText: (text) => previews.push(text), logger: quietLogger(),
  fetchImpl: async () => new Response(events.map((event) => 'data: ' + JSON.stringify(event) + '\n\n').join(''), { headers: { "content-type": "text/event-stream" } }),
 });
 assert.equal(result.success, true);
 assert.deepEqual(previews, ['{"title":', '{"title":"Soup"}']);
 assert.deepEqual(result.json.content[0].input, { title: "Soup" });
 assert.equal(result.usage.inputTokens, 10);
 assert.equal(result.usage.outputTokens, 5);
});

test("external providers reject truncated, failed and incomplete streams", async () => {
 for (const event of [
   { type: "response.output_text.delta", delta: '{}' },
   { type: "response.failed", response: { error: { message: "private" } } },
   { type: "response.incomplete" },
 ]) {
  const result = await external.runExternalAiRequest({
   task: "recipeGeneration", provider: "openai", model: "fixture", apiKey: "fixture", timeoutMs: 1000,
   body: {}, onText() {}, logger: quietLogger(),
   fetchImpl: async () => new Response('data: ' + JSON.stringify(event) + '\n\n', { headers: { "content-type": "text/event-stream" } }),
  });
  assert.equal(result.success, false);
  assert.equal(result.category, "invalid_response");
 }
});
