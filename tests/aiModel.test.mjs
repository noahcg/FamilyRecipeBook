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
const cloudflare = await import(await moduleUrl("../src/lib/ai/cloudflare.ts", {
  "server-only": emptyModuleUrl,
  "@/lib/ai/modelRegistry": registryUrl,
}));
const external = await import(await moduleUrl("../src/lib/ai/external.ts", {
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
