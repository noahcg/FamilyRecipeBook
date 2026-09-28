# AI model review and rollback runbook

## Current task selections

| Task | Repository primary | Bounded fallback | Decision |
| --- | --- | --- | --- |
| Recipe generation | `@cf/google/gemma-4-26b-a4b-it` | None; fail closed | Gemma was the only full comparison candidate to clear every strict gate. The reviewer preferred GLM's prose but approved Gemma after GLM's missed peanut exclusion was identified. Prompt v2 strengthens descriptions, non-invented stories, quantities, notes, and restrictions. Llama remains an explicit emergency override only; evaluator v3 rejected both prompt-v2 fallback samples |
| Blank description | Llama `-fast` | Gemma 4 | All candidates passed; incumbent was fastest |
| Image search query | Llama `-fast` | Gemma 4 | All candidates passed; incumbent was fastest |
| Image ranking | Llama `-fast` | Gemma 4 | Gemma passed both ranking cases and is the leading candidate, but the two-case automated sample cannot replace the required blinded review |
| Photo-import refinement | OpenAI `gpt-4.1-mini` with the user's key | None | Not benchmarked or changed because no OpenAI key was configured and the flow is optional/user-paid |

Gemma was approved for recipe generation on September 28, 2026. In blinded review, the reviewer initially preferred Model C's richer prose; after the key revealed Model C as GLM and the missed peanut exclusion was shown, the reviewer accepted the safety-first recommendation to use Model A, Gemma. Generation intentionally has no automatic fallback: a transient Gemma failure returns the existing recoverable error rather than an unusable recipe. Llama remains available through the explicit primary-model override for emergency diagnosis or manual rollback, but its known prompt-v2 quality failures must be considered first. Image tasks were not part of the recipe-quality worksheet and remain on their existing Llama defaults.

The original saved smoke and full reports contain 96 successful Cloudflare calls: 15 smoke calls and 81 full-suite calls (27 identical cases per model). A separate 15-call diagnostic smoke exposed excessive reasoning output. September 28 added a five-call promotion smoke, a 27-call Gemma prompt-v2 suite, one targeted contract retest, two Llama fallback checks, and two final-schema compatibility checks. Total implementation usage was 148 attempted Cloudflare calls and 146 successful API responses. Failures were the non-promoted Gemma image-ranking timeout and one HTTP 400 proving Cloudflare rejected the attempted `pattern`/`uniqueItems` schema keywords; the compatible final schema passed immediately afterward. No OpenAI, Anthropic, production deployment, or paid-only model call was made.

## Evaluation commands

Offline contract checks are part of the normal test command and make no model calls:

```bash
npm test
```

Live evaluation is opt-in. It requires an explicit model allowlist, call cap, concurrency cap, and `--live`; it prints a conservative maximum Neuron estimate before starting:

```bash
npm run ai:eval -- --live --smoke \
  --models @cf/meta/llama-3.1-8b-instruct-fast,@cf/google/gemma-4-26b-a4b-it,@cf/zai-org/glm-4.7-flash \
  --max-calls 15 --concurrency 1

npm run ai:eval -- --live \
  --models @cf/meta/llama-3.1-8b-instruct-fast,@cf/google/gemma-4-26b-a4b-it,@cf/zai-org/glm-4.7-flash \
  --max-calls 81 --concurrency 1
```

If evaluator rules improve, regrade saved outputs without another billable call:

```bash
npm run ai:eval:regrade -- reports/ai-eval/<report>.json
```

Create a blinded eight-case human worksheet and a separate answer key:

```bash
npm run ai:eval:review -- reports/ai-eval/<report>.json
```

Have a reviewer score recipe usefulness, realistic quantities, instruction clarity, cookbook tone, and constraint fidelity from 1–5. Lost ingredients, dietary/allergen violations, or unusable instructions are automatic rejection gates. Do not open the `-review-key.json` file until scoring is complete. The September review decision and its safety correction are recorded above; `reports/ai-eval/noahs-scores.md` preserves the reviewer's initial notes.

The saved outputs were regraded as checks improved. Evaluator v2 added production response bounds, strict keys, usable-quantity and Unicode-fraction checks, and full-output restriction scanning with explicit-negation handling. Evaluator v3 additionally rejects malformed nonempty quantities, missing required core ingredients in the instructions, and duplicate steps. The predeclared numeric thresholds did not change, and regrading made no model calls.

## September 27 benchmark summary

| Model | Overall pass | Recipe schema | Critical recipe failures | API errors | p50 / p95 | Estimated observed Neurons |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Llama 3.1 8B `-fast` | 66.7% | 100% | 8 (all missing usable quantities) | 0 | 1.47 s / 2.35 s | 214.3 |
| Gemma 4 26B A4B | 100% | 100% | 0 | 0 | 5.95 s / 7.32 s | 215.2 |
| GLM 4.7 Flash | 96.3% | 100% | 1 (used excluded peanut butter and claimed allergy-friendliness) | 0 | 6.36 s / 10.28 s | 410.6 |

Reasoning was explicitly disabled for Gemma and GLM with `chat_template_kwargs.enable_thinking=false`; this is the production registry behavior for short recipe tasks. Without it, smoke calls spent most or all of their output budget on reasoning and did not meet latency/output contracts.

## September 28 promotion validation

Prompt v2 first passed both generation cases in the capped five-case smoke report, `reports/ai-eval/2026-09-28-gemma-promotion-smoke.md`. The normal dinner included quantities and preparation notes plus an inviting description and non-invented story; the conflicting-allergen case excluded peanuts and sesame while still using allowed pantry ingredients. The sole smoke API failure was the separate Gemma image-ranking task timing out at its 2.5-second limit; image ranking remains on Llama.

The subsequent 27-case report, `reports/ai-eval/2026-09-28-gemma-promotion-full.md`, returned successful API responses for every case and passed 19 of 20 generation cases. The remaining berry-crumble response was cookable and constraint-correct but put a sentence into a tag; the provider JSON Schema lacked production's 30-character tag limit, so Zod rejected it. The provider schema was aligned with all production string and numeric bounds, and `reports/ai-eval/2026-09-28-gemma-dessert-contract-check.md` passed the targeted rerun.

The initial evaluator incorrectly marked both Llama prompt-v2 fallback samples as passing. Manual inspection found a malformed chicken quantity, omitted rice-cooking step, and triplicated allergy-case instructions. Evaluator v3 now catches each issue, and the regraded `reports/ai-eval/2026-09-28-llama-fallback-smoke.md` records a 0% pass rate with two critical failures. Automatic generation fallback was therefore removed. No failed output or retry was hidden from the record.

Cloudflare returned HTTP 400 when the provider JSON Schema included `pattern` and `uniqueItems`. Those unsupported keywords were removed from the request schema, while equivalent malformed-quantity and duplicate-step checks remain enforced by production Zod and evaluator v3. `reports/ai-eval/2026-09-28-final-schema-smoke-2.md` confirms the exact final provider schema completed successfully with a valid recipe; the preceding 400 remains recorded in `2026-09-28-final-schema-smoke.md`.

## Cost and allocation planning

Cloudflare reports billing in Neurons. The estimates below use observed average tokens, current documented conversion rates, and a conservative 5% planning allowance for variance and the low-risk tasks that retain bounded fallbacks. Generation itself fails closed and does not retry another model. The estimates do not include unrelated applications sharing the account.

| Selected task | Mean input / output | Estimated Neurons per success | 10 successes | 100 successes | 1,000 successes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Recipe generation (Gemma 4, prompt-v2 full suite) | 274 / 405 | 13.5 | 142 | 1,421 | 14,213 |
| Blank description (Llama `-fast`) | 136 / 81 | 3.4 | 36 | 355 | 3,550 |
| Optional AI image query + Llama rank | 223 / 9 combined | 1.2 | 13 | 129 | 1,292 |

At the prompt-v2 full-suite size, roughly 704 successful generations plus the 5% planning allowance would consume the entire 10,000-Neuron daily allocation if nothing else used the account. A 1,000-generation day therefore exceeds the Free allocation. Check total account Neurons in the Cloudflare dashboard; application logs are diagnostic metadata, not billing truth. Using Cloudflare's listed Gemma rates, the token-price estimate is about $0.0015 / $0.0149 / $0.149 for 10 / 100 / 1,000 generations before the planning allowance.

## Changing or rolling back a model

1. Check the [model catalog](https://developers.cloudflare.com/workers-ai/models/), [changelog](https://developers.cloudflare.com/workers-ai/changelog/), [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), and [plan-eligibility notices](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/).
2. Add a candidate to the server allowlist only after confirming it is available on the current account plan. Do not add paid-only models or external billing fallbacks under the Free-plan policy.
3. Run the smoke suite, then the full suite only for viable candidates. Complete blinded review before promoting a generation challenger; Gemma's September 2026 promotion followed this gate.
4. Change the task default in `src/lib/ai/modelRegistry.ts`, then run tests, lint, build, and staging validation.
5. An emergency model override does not require a client release, but there is currently no quality-equivalent generation rollback. `CLOUDFLARE_RECIPE_GENERATION_MODEL=@cf/meta/llama-3.1-8b-instruct-fast` selects the supported former model only for diagnosis or an explicitly accepted degraded mode. The legacy `CLOUDFLARE_WORKERS_AI_MODEL` pins every Cloudflare task and should not be used for routine rollback.
6. Only the four allowlisted free-plan-compatible IDs are accepted. Invalid overrides are ignored and logged by variable name without logging their value.

Task override names are listed in `.env.local.example`. Remove or update the legacy global override when intentionally adopting task-specific defaults. Validate locally/staging and follow the normal Vercel release workflow; this work does not deploy.

Do not set a global fallback when tasks have different primaries: a global fallback matching a task's primary is deduplicated and leaves that task without a fallback. Prefer the task-specific fallback variables shown in `.env.local.example`. Generation ignores global fallback configuration and always fails closed by design.

The UI disables duplicate in-flight submissions, the server caps prompt/image sizes, and every model-backed action has a per-user/task one-minute burst guard (6 generation, 20 description/image-selection, and 4 photo-import requests). This is best-effort protection within one Vercel instance, not a durable product quota or Cloudflare billing truth. No daily counter was added because there is no existing quota policy or durable usage table; the Cloudflare dashboard remains the allocation source of truth.

## Ongoing review

Review monthly and immediately after a Cloudflare deprecation, plan, or pricing notice. Record the date, exact IDs, account-plan eligibility, prompt/evaluator versions, sample limitations, failure rationale, observed usage, and reviewer. Do not schedule live benchmarks in CI or automatically promote the newest model. A calendar reminder or repository issue is sufficient; CI should run only offline contract tests.
