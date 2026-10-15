import { readFile } from "node:fs/promises";
import ts from "typescript";
import { evaluateCase } from "./ai-eval-lib.mjs";

// One synthetic call, one allowlisted model, no application/database access.
if (!process.argv.includes("--live")) throw new Error("Use --live to authorize one Cloudflare call.");
const root = new URL("../", import.meta.url);
const environment = await readFile(new URL(".env.local", root), "utf8");
for (const line of environment.split(/\r?\n/)) {
  if (line.trimStart().startsWith("#")) continue;
  const match = line.match(/^\s*(CLOUDFLARE_ACCOUNT_ID|CLOUDFLARE_WORKERS_AI_API_TOKEN)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
}
async function moduleUrl(path, replacements = {}) {
  const source = await readFile(new URL(path, root), "utf8");
  let { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
  for (const [name, target] of Object.entries(replacements)) outputText = outputText.replaceAll(`"${name}"`, JSON.stringify(target));
  return `data:text/javascript,${encodeURIComponent(outputText)}`;
}
const registryUrl = await moduleUrl("src/lib/ai/modelRegistry.ts");
const streamUrl = await moduleUrl("src/lib/ai/stream.ts");
const { recipePreview } = await import(streamUrl);
const { buildRecipeGenerationMessages } = await import(await moduleUrl("src/lib/ai/prompts.ts"));
const { buildRecipeIdeaJsonSchema } = await import(await moduleUrl("src/lib/ai/recipeContract.ts"));
const { runCloudflareTask } = await import(await moduleUrl("src/lib/ai/cloudflare.ts", {
  "server-only": "data:text/javascript,export{}",
  "@/lib/ai/modelRegistry": registryUrl,
  "@/lib/ai/stream": streamUrl,
}));
const fixture = JSON.parse(await readFile(new URL("evals/ai/recipe-tasks.cases.json", root), "utf8"))[0];
process.env.CLOUDFLARE_RECIPE_GENERATION_MODEL = "@cf/google/gemma-4-26b-a4b-it";
console.info({ maxCalls: 1, concurrency: 1, model: process.env.CLOUDFLARE_RECIPE_GENERATION_MODEL, conservativeMaxNeurons: 65 });
const startedAt = Date.now();
let firstPreviewMs;
let previewCount = 0;
let lastPreview;
const result = await runCloudflareTask("recipeGeneration", {
  messages: buildRecipeGenerationMessages(fixture.prompt, fixture.categories),
  responseFormat: { type: "json_schema", json_schema: buildRecipeIdeaJsonSchema(fixture.categories) },
  onText(text) {
    const preview = recipePreview(text);
    const serialized = JSON.stringify(preview);
    if (preview.title && serialized !== lastPreview) {
      firstPreviewMs ??= Date.now() - startedAt;
      previewCount++;
      lastPreview = serialized;
    }
  },
});
const evaluation = result?.success ? evaluateCase(fixture, result.output) : undefined;
console.info({ firstPreviewMs, previewCount, durationMs: result?.durationMs, success: result?.success, category: result && !result.success ? result.category : undefined, evaluation: evaluation && { pass: evaluation.pass, schemaPass: evaluation.schemaPass, criticalFailure: evaluation.criticalFailure, failures: evaluation.failures } });
if (!result?.success || !evaluation?.pass || previewCount < 2 || firstPreviewMs >= result.durationMs) process.exitCode = 1;
