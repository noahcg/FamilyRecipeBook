import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  EVALUATOR_VERSION,
  MODEL_PRICING,
  PASS_THRESHOLDS,
  estimateUsage,
  evaluateCase,
  extractCloudflareOutput,
  extractUsage,
  reportMarkdown,
  summarizeResults,
} from "./ai-eval-lib.mjs";
import { importTypescriptModule } from "./load-typescript-module.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CASES_PATH = path.join(ROOT, "evals/ai/recipe-tasks.cases.json");
const REPORT_DIR = path.join(ROOT, "reports/ai-eval");

function parseArgs(argv) {
  const options = { concurrency: 1 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--live") options.live = true;
    else if (arg === "--models") options.models = argv[++index]?.split(",").map((value) => value.trim()).filter(Boolean);
    else if (arg === "--max-calls") options.maxCalls = Number(argv[++index]);
    else if (arg === "--concurrency") options.concurrency = Number(argv[++index]);
    else if (arg === "--smoke") options.smoke = true;
    else if (arg === "--case-ids") options.caseIds = argv[++index]?.split(",").map((value) => value.trim()).filter(Boolean);
    else if (arg === "--report-name") options.reportName = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function loadDotEnv(text) {
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

async function loadLocalEnvironment() {
  try {
    loadDotEnv(await readFile(path.join(ROOT, ".env.local"), "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function bodyForCase(testCase, promptBuilders, contract, maxOutputTokens, modelOptions) {
  let messages;
  if (testCase.task === "recipeGeneration") {
    messages = promptBuilders.buildRecipeGenerationMessages(testCase.prompt, testCase.categories);
  } else if (testCase.task === "recipeDescription") {
    messages = promptBuilders.buildRecipeDescriptionMessages(testCase.title, testCase.ingredients);
  } else if (testCase.task === "recipeImageSearchQuery") {
    messages = promptBuilders.buildRecipeImageSearchMessages(testCase.title, testCase.ingredients);
  } else {
    messages = promptBuilders.buildRecipeImageRankingMessages(testCase.title, testCase.query, testCase.imageDescriptions);
  }
  return {
    messages,
    max_tokens: maxOutputTokens,
    ...modelOptions,
    ...(testCase.task === "recipeGeneration"
      ? {
          response_format: {
            type: "json_schema",
            json_schema: contract.buildRecipeIdeaJsonSchema(testCase.categories),
          },
        }
      : {}),
  };
}

async function runOne({ accountId, apiToken, model, testCase, promptBuilders, contract, registry }) {
  const config = registry.resolveCloudflareTaskConfig(testCase.task, {});
  const body = bodyForCase(
    testCase,
    promptBuilders,
    contract,
    config.maxOutputTokens,
    registry.cloudflareModelRequestOptions(model)
  );
  const startedAt = Date.now();
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    const durationMs = Date.now() - startedAt;
    const json = await response.json().catch(() => null);
    if (!response.ok || json?.success === false) {
      return { model, caseId: testCase.id, task: testCase.task, callSuccess: false, status: response.status, durationMs, errorCategory: response.status === 403 ? "authorization_or_plan" : response.status === 429 ? "budget_or_rate_limit" : response.status >= 500 ? "transient" : "request" };
    }
    const output = extractCloudflareOutput(json);
    if (output === null || output === undefined || output === "") {
      return { model, caseId: testCase.id, task: testCase.task, callSuccess: false, durationMs, errorCategory: "invalid_response" };
    }
    return { model, caseId: testCase.id, task: testCase.task, callSuccess: true, durationMs, usage: extractUsage(json), evaluation: evaluateCase(testCase, output), output };
  } catch (error) {
    return { model, caseId: testCase.id, task: testCase.task, callSuccess: false, durationMs: Date.now() - startedAt, errorCategory: error?.name === "TimeoutError" ? "timeout" : "network" };
  }
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index]);
      process.stdout.write(`${results[index].callSuccess ? "." : "x"}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  process.stdout.write("\n");
  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.live) throw new Error("Live calls are disabled. Add --live to opt in.");
  if (!options.models?.length) throw new Error("Provide an explicit --models allowlist.");
  if (!Number.isInteger(options.maxCalls) || options.maxCalls < options.models.length) throw new Error("--max-calls must be an integer at least as large as the model count.");
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 3) throw new Error("--concurrency must be between 1 and 3.");
  for (const model of options.models) if (!MODEL_PRICING[model]) throw new Error(`Model is not in the evaluation allowlist: ${model}`);

  await loadLocalEnvironment();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN;
  if (!accountId || !apiToken) throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_WORKERS_AI_API_TOKEN are required.");

  const allCases = JSON.parse(await readFile(CASES_PATH, "utf8"));
  if (options.smoke && options.caseIds?.length) {
    throw new Error("Use either --smoke or --case-ids, not both.");
  }
  const requestedCases = options.caseIds?.length
    ? allCases.filter((testCase) => options.caseIds.includes(testCase.id))
    : options.smoke
      ? allCases.filter((testCase) => ["generation-chicken-rice", "generation-allergy-conflict", "description-lasagna", "image-query-stew", "image-ranking-soup"].includes(testCase.id))
      : allCases;
  if (options.caseIds?.length && requestedCases.length !== new Set(options.caseIds).size) {
    throw new Error("Every --case-ids value must name a unique evaluation case.");
  }
  const casesPerModel = Math.min(requestedCases.length, Math.floor(options.maxCalls / options.models.length));
  const selectedCases = requestedCases.slice(0, casesPerModel);
  const calls = options.models.flatMap((model) => selectedCases.map((testCase) => ({ model, testCase })));

  const maxEstimate = options.models.reduce((total, model) => {
    const perCall = estimateUsage(model, 700, 1800);
    return total + (perCall?.neurons ?? 0) * selectedCases.length;
  }, 0);
  console.log(`About to make ${calls.length} capped live calls (${selectedCases.length} identical cases per model, concurrency ${options.concurrency}).`);
  console.log(`Conservative maximum estimate: ${maxEstimate.toFixed(0)} Neurons, assuming 700 input and 1,800 output tokens for every call.`);

  const promptBuilders = await importTypescriptModule(path.join(ROOT, "src/lib/ai/prompts.ts"));
  const contract = await importTypescriptModule(path.join(ROOT, "src/lib/ai/recipeContract.ts"));
  const registry = await importTypescriptModule(path.join(ROOT, "src/lib/ai/modelRegistry.ts"));
  const results = await mapConcurrent(calls, options.concurrency, (item) => runOne({ accountId, apiToken, promptBuilders, contract, registry, ...item }));
  const createdAt = new Date().toISOString();
  const report = { createdAt, evaluatorVersion: EVALUATOR_VERSION, thresholds: PASS_THRESHOLDS, models: options.models, cases: selectedCases.map(({ id, task, invariants }) => ({ id, task, invariants })), summary: summarizeResults(results), results };

  await mkdir(REPORT_DIR, { recursive: true });
  const reportName = options.reportName || `${createdAt.slice(0, 10)}-${options.smoke ? "smoke" : "live"}`;
  const jsonPath = path.join(REPORT_DIR, `${reportName}.json`);
  const markdownPath = path.join(REPORT_DIR, `${reportName}.md`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, reportMarkdown(report));
  console.log(`Wrote ${path.relative(ROOT, jsonPath)} and ${path.relative(ROOT, markdownPath)}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
