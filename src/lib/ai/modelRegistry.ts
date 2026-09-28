export const CLOUDFLARE_FREE_MODEL_ALLOWLIST = [
  "@cf/meta/llama-3.1-8b-instruct-fast",
  "@cf/google/gemma-4-26b-a4b-it",
  "@cf/zai-org/glm-4.7-flash",
  "@cf/nvidia/nemotron-3-120b-a12b",
] as const;

export type CloudflareModelId = (typeof CLOUDFLARE_FREE_MODEL_ALLOWLIST)[number];

const cloudflareModelDisplayNames: Record<CloudflareModelId, string> = {
  "@cf/meta/llama-3.1-8b-instruct-fast": "Llama 3.1 8B",
  "@cf/google/gemma-4-26b-a4b-it": "Gemma 4 26B",
  "@cf/zai-org/glm-4.7-flash": "GLM 4.7 Flash",
  "@cf/nvidia/nemotron-3-120b-a12b": "Nemotron 3 120B",
};

export type AiTask =
  | "recipeGeneration"
  | "recipeDescription"
  | "recipeImageSearchQuery"
  | "recipeImageRanking"
  | "recipePhotoImport";

export type CloudflareAiTask = Exclude<AiTask, "recipePhotoImport">;

type CloudflareTaskConfig = {
  primary: CloudflareModelId;
  fallback?: CloudflareModelId;
  maxOutputTokens: number;
  timeoutMs: number;
  promptVersion: string;
  overrideEnv: string;
  fallbackOverrideEnv?: string;
};

const cloudflareModelRegistry: Record<CloudflareAiTask, CloudflareTaskConfig> = {
  recipeGeneration: {
    primary: "@cf/google/gemma-4-26b-a4b-it",
    maxOutputTokens: 1800,
    timeoutMs: 30_000,
    promptVersion: "recipe-generation-v2",
    overrideEnv: "CLOUDFLARE_RECIPE_GENERATION_MODEL",
  },
  recipeDescription: {
    primary: "@cf/meta/llama-3.1-8b-instruct-fast",
    fallback: "@cf/google/gemma-4-26b-a4b-it",
    maxOutputTokens: 220,
    timeoutMs: 10_000,
    promptVersion: "recipe-description-v1",
    overrideEnv: "CLOUDFLARE_RECIPE_DESCRIPTION_MODEL",
    fallbackOverrideEnv: "CLOUDFLARE_RECIPE_DESCRIPTION_FALLBACK_MODEL",
  },
  recipeImageSearchQuery: {
    primary: "@cf/meta/llama-3.1-8b-instruct-fast",
    fallback: "@cf/google/gemma-4-26b-a4b-it",
    maxOutputTokens: 40,
    timeoutMs: 2_500,
    promptVersion: "recipe-image-search-v1",
    overrideEnv: "CLOUDFLARE_RECIPE_IMAGE_SEARCH_MODEL",
    fallbackOverrideEnv: "CLOUDFLARE_RECIPE_IMAGE_SEARCH_FALLBACK_MODEL",
  },
  recipeImageRanking: {
    primary: "@cf/meta/llama-3.1-8b-instruct-fast",
    fallback: "@cf/google/gemma-4-26b-a4b-it",
    maxOutputTokens: 20,
    timeoutMs: 2_500,
    promptVersion: "recipe-image-ranking-v1",
    overrideEnv: "CLOUDFLARE_RECIPE_IMAGE_RANKING_MODEL",
    fallbackOverrideEnv: "CLOUDFLARE_RECIPE_IMAGE_RANKING_FALLBACK_MODEL",
  },
};

const externalModelRegistry = {
  recipeGeneration: {
    openai: { defaultModel: "gpt-5-mini", overrideEnv: "OPENAI_RECIPE_MODEL" },
    anthropic: {
      defaultModel: "claude-haiku-4-5-20251001",
      overrideEnv: "ANTHROPIC_RECIPE_MODEL",
    },
  },
  recipePhotoImport: {
    openai: {
      defaultModel: "gpt-4.1-mini",
      overrideEnv: "OPENAI_RECIPE_OCR_MODEL",
    },
  },
} as const;

const taskPromptVersions: Record<AiTask, string> = {
  recipeGeneration: "recipe-generation-v2",
  recipeDescription: "recipe-description-v1",
  recipeImageSearchQuery: "recipe-image-search-v1",
  recipeImageRanking: "recipe-image-ranking-v1",
  recipePhotoImport: "recipe-photo-import-v1",
};

type Env = Record<string, string | undefined>;

function isAllowedCloudflareModel(value: string): value is CloudflareModelId {
  return (CLOUDFLARE_FREE_MODEL_ALLOWLIST as readonly string[]).includes(value);
}

function allowedOverride(value: string | undefined) {
  if (!value) return undefined;
  return isAllowedCloudflareModel(value) ? value : null;
}

export type ResolvedCloudflareTaskConfig = Omit<
  CloudflareTaskConfig,
  "overrideEnv" | "fallbackOverrideEnv"
> & {
  rejectedOverrides: string[];
};

export function resolveCloudflareTaskConfig(
  task: CloudflareAiTask,
  env: Env = process.env
): ResolvedCloudflareTaskConfig {
  const config = cloudflareModelRegistry[task];
  const rejectedOverrides: string[] = [];
  const primarySource = env[config.overrideEnv] !== undefined
    ? config.overrideEnv
    : env.CLOUDFLARE_WORKERS_AI_MODEL !== undefined
      ? "CLOUDFLARE_WORKERS_AI_MODEL"
      : undefined;
  const fallbackSource = config.fallbackOverrideEnv
    ? env[config.fallbackOverrideEnv] !== undefined
      ? config.fallbackOverrideEnv
      : env.CLOUDFLARE_WORKERS_AI_FALLBACK_MODEL !== undefined
        ? "CLOUDFLARE_WORKERS_AI_FALLBACK_MODEL"
        : undefined
    : undefined;
  const primaryValue = primarySource ? env[primarySource] : undefined;
  const fallbackValue = fallbackSource ? env[fallbackSource] : undefined;
  const primaryOverride = allowedOverride(primaryValue);
  const fallbackOverride = allowedOverride(fallbackValue);

  if (primaryOverride === null) {
    rejectedOverrides.push(primarySource ?? config.overrideEnv);
  }
  if (fallbackOverride === null) {
    rejectedOverrides.push(fallbackSource ?? "CLOUDFLARE_WORKERS_AI_FALLBACK_MODEL");
  }

  const primary = primaryOverride || config.primary;
  const resolvedFallback = fallbackOverride || config.fallback;
  const fallback = resolvedFallback === primary ? undefined : resolvedFallback;

  return {
    primary,
    fallback,
    maxOutputTokens: config.maxOutputTokens,
    timeoutMs: config.timeoutMs,
    promptVersion: config.promptVersion,
    rejectedOverrides,
  };
}

export function resolveExternalModel(
  task: "recipeGeneration",
  provider: "openai" | "anthropic",
  env?: Env
): string;
export function resolveExternalModel(
  task: "recipePhotoImport",
  provider: "openai",
  env?: Env
): string;
export function resolveExternalModel(
  task: "recipeGeneration" | "recipePhotoImport",
  provider: "openai" | "anthropic",
  env: Env = process.env
) {
  const taskConfig = externalModelRegistry[task] as Partial<
    Record<"openai" | "anthropic", { defaultModel: string; overrideEnv: string }>
  >;
  const config = taskConfig[provider];
  if (!config) throw new Error(`Provider ${provider} is not configured for ${task}.`);
  return env[config.overrideEnv] || config.defaultModel;
}

export function isCloudflareModelAllowed(model: string): model is CloudflareModelId {
  return isAllowedCloudflareModel(model);
}

export function getCloudflareModelDisplayName(model: CloudflareModelId) {
  return cloudflareModelDisplayNames[model];
}

export function getAiPromptVersion(task: AiTask) {
  return taskPromptVersions[task];
}

export function cloudflareModelRequestOptions(model: CloudflareModelId) {
  if (
    model === "@cf/google/gemma-4-26b-a4b-it" ||
    model === "@cf/zai-org/glm-4.7-flash" ||
    model === "@cf/nvidia/nemotron-3-120b-a12b"
  ) {
    return { chat_template_kwargs: { enable_thinking: false } };
  }
  return {};
}

export const AI_MODEL_REGISTRY = cloudflareModelRegistry;
