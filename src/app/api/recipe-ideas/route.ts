import { z } from "zod";
import { getUser } from "@/lib/auth";
import { generateRecipeIdea } from "@/lib/ai/recipeGeneration";
import { recipePreview } from "@/lib/ai/stream";

export const maxDuration = 60;

const requestSchema = z.object({
  prompt: z.string().trim().min(10).max(2_000),
  bookId: z.string().uuid(),
}).strict();

export async function POST(request: Request) {
  const startedAt = Date.now();
  // Route handlers do not inherit Server Actions' same-origin protection.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Request not allowed." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "Invalid request." }, { status: 415 });
  }
  if (!await getUser()) return Response.json({ error: "Please sign in again." }, { status: 401 });
  // Bound the body before parsing, including requests without Content-Length.
  if (!request.body) return Response.json({ error: "Invalid request." }, { status: 400 });
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 12_000) {
        await reader.cancel();
        return Response.json({ error: "Request too large." }, { status: 413 });
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } finally { reader.releaseLock(); }
  let input;
  try { input = requestSchema.safeParse(JSON.parse(raw)); } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!input.success) return Response.json({ error: "Check your recipe request and try again." }, { status: 400 });

  const requestId = crypto.randomUUID();
  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal]);
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(data: unknown) {
        if (!closed && !signal.aborted) controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }
      let lastPreview = "";
      let firstPreviewMs: number | undefined;
      send({ type: "status" });
      try {
        const result = await generateRecipeIdea(input.data.prompt, input.data.bookId, {
          signal,
          requestId,
          onText(text) {
            const preview = recipePreview(text);
            const serialized = JSON.stringify(preview);
            if (serialized !== lastPreview && preview.title) {
              firstPreviewMs ??= Date.now() - startedAt;
              lastPreview = serialized;
              send({ type: "preview", data: preview });
            }
          },
        });
        send(result.success ? { type: "complete", data: result.data } : { type: "error", error: result.error });
        console.info("[ai-recipe-stream]", { requestId, durationMs: Date.now() - startedAt, firstPreviewMs, success: result.success });
      } catch {
        send({ type: "error", error: "We couldn’t generate an idea. Please try again." });
      } finally {
        if (!closed) { closed = true; controller.close(); }
      }
    },
    cancel() { closed = true; abort.abort(); },
  });
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no",
  } });
}
