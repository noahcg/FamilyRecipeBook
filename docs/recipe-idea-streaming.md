# Progressive recipe ideas

The recipe idea panel posts to `/api/recipe-ideas` and consumes server-sent events using `fetch`. The default Cloudflare request uses the existing model, prompt, token limit, timeout, and disabled thinking, with `stream: true` added. Cloudflare JSON mode does not support streaming, so streamed requests omit `response_format` and instead append the same JSON Schema to the system prompt. Final Zod validation remains mandatory. This removes provider-enforced output formatting and needs live quality evaluation before promotion. There is no additional model call or generation fallback.

The server extracts received title/description strings and ingredient/step fields from the accumulating JSON and sends preview snapshots. The panel labels these as a draft and disables cooking and saving. Only a `complete` event, sent after the existing Zod validation, unit handling, and applicable allowance consumption, enables those actions. Invalid output, truncated streams, provider failures, and exhausted allowances emit a recoverable error. A failed new attempt retains the previous completed idea. Leaving the page aborts the browser request and Cloudflare generation.

The route enforces same-origin POSTs, authenticated sessions, bounded JSON input, and the existing cookbook membership and per-user burst checks. Responses use `no-store, no-transform`. Private prompts and generated content are never included in timing logs. The existing server action remains available and shares the same generation implementation.

OpenAI/Anthropic personal keys now stream previews through the same endpoint. OpenAI retains strict JSON Schema output and uses `response.output_text.delta` events followed by a required `response.completed` event. Anthropic retains the forced `create_recipe` tool and streams `input_json_delta` fragments, with a required `message_stop` event. Failed, incomplete, and truncated responses cannot enable cooking or saving. A Cloudflare model override that returns a normal JSON envelope also remains supported without a progressive preview.

## Measuring after deployment

- In DevTools, inspect the POST to `/api/recipe-ideas`. Its first response bytes are a status event, so TTFB now measures stream opening rather than full recipe generation. Total request duration still measures through completion. Time to the first visible recipe preview must be measured separately.
- `[ai-model-request]` logs contain model `durationMs` and streaming `firstTokenMs`, measured from the upstream call.
- `[ai-recipe-stream]` logs contain `durationMs` and `firstPreviewMs`, measured from route entry, including session checks and setup. The same `requestId` links the Cloudflare and route logs. Missing `firstPreviewMs` means no progressive preview was produced.

Offline tests cover chunk boundaries, Unicode, previews before upstream completion, malformed/truncated streams, route protection, membership, throttle, recipe validation, and allowance gating. A single live synthetic Cloudflare smoke on October 13, 2026 verified first token at 1,257 ms, first preview at 1,309 ms, 15 distinct previews, and completion at 8,633 ms. The completed recipe passed evaluator v3, including schema and required ingredient/instruction checks. This confirms provider streaming for that sample; a full quality evaluation and deployed delivery check remain necessary.


The initial implementation incorrectly combined `stream: true` with provider JSON mode. [Cloudflare documents that JSON mode does not support streaming](https://developers.cloudflare.com/workers-ai/features/json-mode/). The corrected streaming request omits provider JSON mode; non-streaming callers retain it.

To repeat the bounded one-call synthetic smoke with explicit authorization, run `node scripts/ai-stream-smoke.mjs --live`. It uses only the recipe-generation model above and does not access application recipes or the database.


October 13 follow-up: the owner's local account had a personal OpenAI key selected, which bypassed the initially streamed Cloudflare path. After adding provider streaming, browser verification on `localhost:3001/app/ideas` visibly showed title and description under “Draft in progress” before completion, with disabled cook/save buttons; the completed result then enabled both buttons. OpenAI retains its original model, prompt, strict schema, and final Zod validation.
