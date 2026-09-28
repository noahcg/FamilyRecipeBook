import "server-only";

import {
  cloudflareModelRequestOptions,
  resolveCloudflareTaskConfig,
  type CloudflareAiTask,
  type CloudflareModelId,
} from "@/lib/ai/modelRegistry";
import type { AiMessage } from "@/lib/ai/prompts";

export type AiFailureCategory =
  | "authentication"
  | "authorization_or_plan"
  | "budget_or_rate_limit"
  | "invalid_request"
  | "model_unavailable"
  | "transient"
  | "timeout"
  | "invalid_response"
  | "unknown";

export type AiUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type CloudflareTaskResult =
  | {
      success: true;
      output: unknown;
      model: CloudflareModelId;
      requestId: string;
      durationMs: number;
      usage?: AiUsage;
      usedFallback: boolean;
    }
  | {
      success: false;
      category: AiFailureCategory;
      model: CloudflareModelId;
      requestId: string;
      durationMs: number;
      status?: number;
      usedFallback: boolean;
    };

type JsonSchema = Record<string, unknown>;

type RunCloudflareTaskOptions = {
  messages: AiMessage[];
  responseFormat?: {
    type: "json_schema";
    json_schema: JsonSchema;
  };
  requestId?: string;
  fetchImpl?: typeof fetch;
  logger?: Pick<Console, "info" | "warn">;
};

type CloudflareEnvelope = {
  success?: boolean;
  errors?: { message?: string }[];
  result?: {
    response?: unknown;
    choices?: { message?: { content?: unknown } }[];
    usage?: Record<string, unknown>;
  };
  usage?: Record<string, unknown>;
};

function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function extractUsage(json: CloudflareEnvelope): AiUsage | undefined {
  const usage = json.result?.usage ?? json.usage;
  if (!usage) return undefined;
  const inputTokens = numeric(usage.prompt_tokens ?? usage.input_tokens);
  const outputTokens = numeric(usage.completion_tokens ?? usage.output_tokens);
  const totalTokens = numeric(usage.total_tokens);
  if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) {
    return undefined;
  }
  return { inputTokens, outputTokens, totalTokens };
}

function extractOutput(json: CloudflareEnvelope) {
  return json.result?.response ?? json.result?.choices?.[0]?.message?.content;
}

function classifyHttpFailure(status: number, body: string): AiFailureCategory {
  if (status === 401) return "authentication";
  if (status === 403) return "authorization_or_plan";
  if (status === 429) return "budget_or_rate_limit";
  if ([500, 502, 503, 504].includes(status)) return "transient";

  const normalized = body.toLowerCase();
  if (
    status === 404 ||
    /model.{0,40}(unavailable|not found|deprecated|unsupported)/.test(normalized) ||
    /out of capacity|error code.?3040|json mode couldn.t be met/.test(normalized)
  ) {
    return "model_unavailable";
  }
  if (status >= 400 && status < 500) return "invalid_request";
  return "unknown";
}

function isFallbackEligible(category: AiFailureCategory) {
  return category === "transient" || category === "timeout" || category === "model_unavailable";
}

function logAttempt(
  logger: Pick<Console, "info" | "warn">,
  details: {
    task: CloudflareAiTask;
    model: CloudflareModelId;
    promptVersion: string;
    durationMs: number;
    requestId: string;
    success: boolean;
    category?: AiFailureCategory;
    usage?: AiUsage;
    usedFallback: boolean;
  }
) {
  logger.info("[ai-model-request]", details);
}

async function runAttempt(
  task: CloudflareAiTask,
  model: CloudflareModelId,
  promptVersion: string,
  maxOutputTokens: number,
  timeoutMs: number,
  accountId: string,
  apiToken: string,
  options: RunCloudflareTaskOptions,
  requestId: string,
  usedFallback: boolean
): Promise<CloudflareTaskResult> {
  const startedAt = Date.now();
  const fetchImpl = options.fetchImpl ?? fetch;
  const logger = options.logger ?? console;

  try {
    const response = await fetchImpl(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiToken}`,
          "content-type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          messages: options.messages,
          max_tokens: maxOutputTokens,
          ...cloudflareModelRequestOptions(model),
          ...(options.responseFormat
            ? { response_format: options.responseFormat }
            : {}),
        }),
      }
    );
    const body = await response.text();
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const category = classifyHttpFailure(response.status, body);
      logAttempt(logger, {
        task,
        model,
        promptVersion,
        durationMs,
        requestId,
        success: false,
        category,
        usedFallback,
      });
      return {
        success: false,
        category,
        model,
        requestId,
        durationMs,
        status: response.status,
        usedFallback,
      };
    }

    let json: CloudflareEnvelope;
    try {
      json = JSON.parse(body) as CloudflareEnvelope;
    } catch {
      const result: CloudflareTaskResult = {
        success: false,
        category: "invalid_response",
        model,
        requestId,
        durationMs,
        usedFallback,
      };
      logAttempt(logger, {
        task,
        model,
        promptVersion,
        durationMs,
        requestId,
        success: false,
        category: result.category,
        usedFallback,
      });
      return result;
    }

    if (json.success === false) {
      const category = classifyHttpFailure(
        response.status,
        json.errors?.map((error) => error.message).filter(Boolean).join(" ") ?? ""
      );
      logAttempt(logger, {
        task,
        model,
        promptVersion,
        durationMs,
        requestId,
        success: false,
        category,
        usedFallback,
      });
      return {
        success: false,
        category,
        model,
        requestId,
        durationMs,
        status: response.status,
        usedFallback,
      };
    }

    const output = extractOutput(json);
    if (output === undefined || output === null || output === "") {
      logAttempt(logger, {
        task,
        model,
        promptVersion,
        durationMs,
        requestId,
        success: false,
        category: "invalid_response",
        usedFallback,
      });
      return {
        success: false,
        category: "invalid_response",
        model,
        requestId,
        durationMs,
        usedFallback,
      };
    }

    const usage = extractUsage(json);
    logAttempt(logger, {
      task,
      model,
      promptVersion,
      durationMs,
      requestId,
      success: true,
      usage,
      usedFallback,
    });
    return {
      success: true,
      output,
      model,
      requestId,
      durationMs,
      usage,
      usedFallback,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const category: AiFailureCategory =
      error instanceof Error && error.name === "TimeoutError" ? "timeout" : "transient";
    logAttempt(options.logger ?? console, {
      task,
      model,
      promptVersion,
      durationMs,
      requestId,
      success: false,
      category,
      usedFallback,
    });
    return {
      success: false,
      category,
      model,
      requestId,
      durationMs,
      usedFallback,
    };
  }
}

export async function runCloudflareTask(
  task: CloudflareAiTask,
  options: RunCloudflareTaskOptions
): Promise<CloudflareTaskResult | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN;
  if (!accountId || !apiToken) return null;

  const config = resolveCloudflareTaskConfig(task);
  const logger = options.logger ?? console;
  if (config.rejectedOverrides.length) {
    logger.warn("[ai-model-config] Ignored model override outside the allowlist.", {
      task,
      variables: config.rejectedOverrides,
    });
  }

  const requestId = options.requestId ?? crypto.randomUUID();
  const primaryResult = await runAttempt(
    task,
    config.primary,
    config.promptVersion,
    config.maxOutputTokens,
    config.timeoutMs,
    accountId,
    apiToken,
    options,
    requestId,
    false
  );

  if (
    primaryResult.success ||
    !config.fallback ||
    !isFallbackEligible(primaryResult.category)
  ) {
    return primaryResult;
  }

  return runAttempt(
    task,
    config.fallback,
    config.promptVersion,
    config.maxOutputTokens,
    config.timeoutMs,
    accountId,
    apiToken,
    options,
    requestId,
    true
  );
}

export function cloudflareFailureMessage(category: AiFailureCategory) {
  switch (category) {
    case "authentication":
    case "authorization_or_plan":
      return "Recipe ideas are temporarily unavailable because the AI service is not authorized.";
    case "budget_or_rate_limit":
      return "Recipe ideas have reached today’s AI limit. Try again after the daily reset.";
    case "timeout":
    case "transient":
    case "model_unavailable":
      return "The AI service is temporarily unavailable. Try again in a moment.";
    default:
      return "The AI service could not complete that request. Try again with a little more detail.";
  }
}
