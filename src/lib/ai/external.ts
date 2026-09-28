import "server-only";

import { getAiPromptVersion, type AiTask } from "@/lib/ai/modelRegistry";
import type { AiFailureCategory, AiUsage } from "@/lib/ai/cloudflare";

type ExternalProvider = "openai" | "anthropic";

type ExternalAiResult =
  | {
      success: true;
      json: unknown;
      requestId: string;
      durationMs: number;
      usage?: AiUsage;
    }
  | {
      success: false;
      category: AiFailureCategory;
      requestId: string;
      durationMs: number;
      status?: number;
    };

type ExternalAiRequest = {
  task: Extract<AiTask, "recipeGeneration" | "recipePhotoImport">;
  provider: ExternalProvider;
  model: string;
  apiKey: string;
  body: Record<string, unknown>;
  timeoutMs: number;
  requestId?: string;
  fetchImpl?: typeof fetch;
  logger?: Pick<Console, "info">;
};

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function extractUsage(json: unknown): AiUsage | undefined {
  if (!json || typeof json !== "object") return undefined;
  const usage = (json as { usage?: Record<string, unknown> }).usage;
  if (!usage) return undefined;
  const inputTokens = numberValue(usage.input_tokens ?? usage.prompt_tokens);
  const outputTokens = numberValue(usage.output_tokens ?? usage.completion_tokens);
  const totalTokens = numberValue(usage.total_tokens);
  if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) {
    return undefined;
  }
  return { inputTokens, outputTokens, totalTokens };
}

function classifyStatus(status: number): AiFailureCategory {
  if (status === 401) return "authentication";
  if (status === 403) return "authorization_or_plan";
  if (status === 429) return "budget_or_rate_limit";
  if ([500, 502, 503, 504].includes(status)) return "transient";
  if (status >= 400 && status < 500) return "invalid_request";
  return "unknown";
}

export async function runExternalAiRequest(
  options: ExternalAiRequest
): Promise<ExternalAiResult> {
  const requestId = options.requestId ?? crypto.randomUUID();
  const startedAt = Date.now();
  const logger = options.logger ?? console;
  const promptVersion = getAiPromptVersion(options.task);
  const headers: Record<string, string> = { "content-type": "application/json" };
  const endpoint = options.provider === "openai"
    ? "https://api.openai.com/v1/responses"
    : "https://api.anthropic.com/v1/messages";
  if (options.provider === "openai") {
    headers.authorization = `Bearer ${options.apiKey}`;
  } else {
    headers["x-api-key"] = options.apiKey;
    headers["anthropic-version"] = "2023-06-01";
  }

  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint, {
      method: "POST",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs),
      body: JSON.stringify({ ...options.body, model: options.model }),
    });
    const durationMs = Date.now() - startedAt;
    if (!response.ok) {
      const category = classifyStatus(response.status);
      logger.info("[ai-model-request]", {
        task: options.task,
        provider: options.provider,
        model: options.model,
        promptVersion,
        durationMs,
        requestId,
        success: false,
        category,
      });
      return { success: false, category, requestId, durationMs, status: response.status };
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      logger.info("[ai-model-request]", {
        task: options.task,
        provider: options.provider,
        model: options.model,
        promptVersion,
        durationMs,
        requestId,
        success: false,
        category: "invalid_response",
      });
      return { success: false, category: "invalid_response", requestId, durationMs };
    }

    const usage = extractUsage(json);
    logger.info("[ai-model-request]", {
      task: options.task,
      provider: options.provider,
      model: options.model,
      promptVersion,
      durationMs,
      requestId,
      success: true,
      usage,
    });
    return { success: true, json, requestId, durationMs, usage };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const category: AiFailureCategory =
      error instanceof Error && error.name === "TimeoutError" ? "timeout" : "transient";
    logger.info("[ai-model-request]", {
      task: options.task,
      provider: options.provider,
      model: options.model,
      promptVersion,
      durationMs,
      requestId,
      success: false,
      category,
    });
    return { success: false, category, requestId, durationMs };
  }
}
