# AI model inventory

Verified against the repository and local development configuration on September 28, 2026. Home Cooked is a Next.js 16 application deployed as server-rendered routes/actions; it calls Cloudflare Workers AI through the REST API from Vercel. There is no Worker binding or Wrangler deployment in this repository.

## Model-backed capabilities

| Capability | Entry point and upstream input | Preprocessing and prompt | Model selection | Response and validation | Retry/fallback | Authentication and gate | Typical live size | User-facing failure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Recipe idea generation | `AIRecipeIdeaPanel` → `generateRecipeIdea`; free-text Tonight's Table request | `buildIdeaTablePrompt` adds servings, budget, time, diet, allergy, and pantry constraints; `buildRecipeGenerationMessages`; `recipe-generation-v2`; 2,000-character server cap; richer but non-invented descriptions/stories and practical quantities/notes | Cloudflare default: `@cf/google/gemma-4-26b-a4b-it`; no automatic generation fallback. User BYO OpenAI or Anthropic key takes priority; optional server OpenAI fallback remains off unless configured | Cloudflare-compatible bounded JSON Schema plus stricter Zod `aiRecipeIdeaSchema`; Zod also rejects malformed quantities and duplicate steps because Cloudflare rejects those JSON Schema keywords. Category resolves against the cookbook | Fails closed on model errors. The prior Llama fallback was removed after prompt-v2 checks produced malformed quantities, missing core cooking steps, and duplicate instructions | Authenticated cookbook member required; six-request/minute per-instance burst guard; no paid product-tier gate or durable per-user quota | Prompt-v2 full-suite mean: 274 input / 405 output tokens; p95 16.03 s across 20 generation cases. Nineteen passed initially; the only contract mismatch was fixed and its targeted rerun passed. The exact final schema passed a separate live smoke | Existing inline recoverable error; daily-limit, burst-limit, and authorization failures have specific safe messages |
| Blank recipe description | `RecipeForm` → `generateRecipeDescription`; only when the author left description blank | Title capped at 200 characters; first eight ingredients capped at 200 characters each; `recipe-description-v1` | Cloudflare Llama `-fast`; bounded Gemma fallback | Plain text is collapsed, stripped of wrapping markup/quotes, and capped at 480 characters | Adapter policy above | Authenticated user; 20-request/minute per-instance burst guard; no product-tier gate | Mean 136 input / 81 output tokens; p95 0.53 s across 3 cases | Returns `null`; the recipe save continues without a generated description |
| Optional recipe-image search query | `searchRecipeImages` → `improveSearchQuery`; recipe title and first five ingredients | Short-query prompt, `recipe-image-search-v1`; enabled only with `ENABLE_AI_IMAGE_PICKER=true` | Cloudflare Llama `-fast`; bounded Gemma fallback | Plain text; first line, markup removed, capped at 80 characters | Adapter policy above; deterministic query generation remains available | Authenticated user, feature flag, Cloudflare config, Pexels key, and 20-request/minute per-instance AI burst guard | Mean 92 input / 7 output tokens; p95 0.29 s across 2 cases | Falls back to deterministic Pexels queries |
| Optional recipe-image ranking | `searchRecipeImages` → `rankWithCloudflare`; Pexels candidate alt text | Candidate descriptions capped at 300 characters; `recipe-image-ranking-v1`; enabled only with `ENABLE_AI_IMAGE_PICKER=true` | Llama `-fast`; bounded Gemma 4 fallback. The two-case automated result favored Gemma, but image selection was outside the human recipe review and remains unchanged | Model must return a valid 1-based candidate number | Adapter policy above | Same authenticated, flagged, configured, and burst-guarded image-search request; at least two Pexels candidates | Mean 131 input / 2 output tokens; p95 0.31 s across 2 incumbent cases | Keeps deterministic Pexels ordering when ranking is unavailable or invalid |
| Optional photo-import refinement | `RecipeForm` → `improveRecipeImportWithOpenAI`; one to four JPEG/PNG/WebP data URLs | Each image is capped near 1 MB; structured extraction prompt; `recipe-photo-import-v1` | User-supplied OpenAI key; server-controlled default `gpt-4.1-mini` | OpenAI Responses Structured Output; `importedRecipeSchema`; normalization plus required ingredients and instructions | No automatic retry or provider fallback | Authenticated user must be Keeper or eligible Contributor for the cookbook and must configure an OpenAI key | Image-token usage was not measured: no OpenAI key is configured locally and no paid call was made | Actionable inline error; local OCR result remains available for correction |

Cloudflare, OpenAI, and Anthropic requests now pass through server-side adapters that log only task, provider/model, prompt version, correlation ID, duration, outcome category, fallback state, and supplied usage totals. Raw prompts, recipes, generated text, API keys, user IDs, and account IDs are not logged.

## Deterministic imports (no model call by default)

| Input | Implementation | Behavior |
| --- | --- | --- |
| Pasted recipe text | `recipeTextImport.ts` | Local headings, ingredient, fraction, time, serving, and instruction parsing |
| Selectable-text PDF | `recipeFileImport.ts` + `pdfjs-dist` | Browser text extraction, then local recipe parsing |
| Scanned PDF | `recipeFileImport.ts` + `tesseract.js` | Browser page rendering and local OCR, then local parsing |
| Recipe photo/image | `imageImport.ts` + `tesseract.js` | Local OCR and one/two-recipe layout parsing; optional user-triggered OpenAI refinement is separate |
| HTML | `recipeFileImport.ts` | JSON-LD Recipe extraction first, then local text parsing |
| TXT/CSV/JSON/Paprika/ZIP | `recipeFileImport.ts` | Local format-specific parsing; ZIP contents are parsed locally |

The source file/text remains in the browser-side review flow when parsing is incomplete, and imported fields are not saved until the user reviews and submits them.

## Configuration and deployment state

- Repository defaults and the allowlist live in `src/lib/ai/modelRegistry.ts`; model IDs no longer live in route handlers.
- The local `.env.local` has usable Cloudflare credentials and no active global model pin, so task-specific repository defaults take effect. Vercel production configuration was not inspected; remove any production `CLOUDFLARE_WORKERS_AI_MODEL` pin before release or it will override this selection.
- No local server OpenAI key is configured. User BYO provider keys may exist in `user_settings`, but production data was not inspected.
- `ENABLE_AI_IMAGE_PICKER` is unset locally, so the two image-selection AI tasks are off by default and deterministic Pexels search remains active.
- Home Cooked product tiers do not currently gate these AI actions. This is independent of the Cloudflare Workers Free/Paid account plan.

## Deprecation and plan findings

The former generation model and emergency diagnostic override use the exact `@cf/meta/llama-3.1-8b-instruct-fast` variant. It remains supported but failed both evaluator-v3 prompt-v2 samples, so it is not an automatic or quality-equivalent rollback. Cloudflare's May 2026 notice says this `-fast` variant remains active; the deprecated ID is the non-fast `@cf/meta/llama-3.1-8b-instruct`. The previous README incorrectly named the deprecated non-fast model as the default and has been corrected.

Cloudflare currently documents Gemma 4, GLM 4.7 Flash, and Nemotron 3 as available on Workers Free. It also documents a shared 10,000-Neuron daily allocation that resets at 00:00 UTC; Free stops when exhausted, while Paid bills excess usage. Verify these facts before every model promotion:

- [Workers AI deprecation notice](https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/)
- [Workers Free model eligibility notice](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/)
- [Workers AI pricing and Neuron allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Gemma 4 model page](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/)
- [GLM 4.7 Flash model page](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/)
