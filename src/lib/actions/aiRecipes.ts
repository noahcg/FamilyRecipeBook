"use server";

import { z } from "zod";
import {
  cloudflareFailureMessage,
  runCloudflareTask,
} from "@/lib/ai/cloudflare";
import { runExternalAiRequest } from "@/lib/ai/external";
import { resolveExternalModel } from "@/lib/ai/modelRegistry";
import { consumeAiTaskThrottle } from "@/lib/ai/throttle";
import {
  RECIPE_GENERATION_QUALITY_GUIDANCE,
  buildRecipeGenerationMessages,
  formatCategoryList,
} from "@/lib/ai/prompts";
import {
  buildRecipeIdeaJsonSchema,
  isValidRecipeQuantity,
} from "@/lib/ai/recipeContract";
import { createRecipe } from "@/lib/actions/recipes";
import { selectRecipeImage } from "@/lib/actions/pexels";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Recipe } from "@/lib/types";
import { consumeAiAllowance, EntitlementError } from "@/lib/entitlements";

async function fetchBookCategoryNames(
  bookId: string,
  userId: string
): Promise<string[] | null> {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("book_members")
    .select("role")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) return null;

  const { data } = await supabase
    .from("book_categories")
    .select("name")
    .eq("book_id", bookId)
    .order("position", { ascending: true });
  return (data ?? []).map((row) => row.name);
}

const aiIngredientSchema = z.object({
  quantity: z.string().max(20).refine(isValidRecipeQuantity),
  unit: z.string().max(30),
  item: z.string().min(1),
  note: z.string().max(200),
}).strict();

const aiInstructionSchema = z.object({
  body: z.string().min(1),
}).strict();

const aiRecipeIdeaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500),
  source_name: z.string().max(100),
  story: z.string().max(2000),
  prep_minutes: z.number().int().min(0).max(10080),
  cook_minutes: z.number().int().min(0).max(10080),
  servings: z.number().int().min(1).max(100),
  // Free-form — the AI is told the user's actual list, but we validate downstream
  // by resolving the name to a book_categories row (case-insensitive) and falling
  // back to "Other" if no match exists.
  category: z.string().max(60),
  tags: z.array(z.string().max(30)).max(5),
  ingredients: z.array(aiIngredientSchema).min(4).max(8),
  instructions: z.array(aiInstructionSchema).min(3).max(6).superRefine((steps, context) => {
    const normalized = steps.map((step) =>
      step.body.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
    );
    if (new Set(normalized).size !== normalized.length) {
      context.addIssue({
        code: "custom",
        message: "Instruction steps must be distinct.",
      });
    }
  }),
}).strict();

export type AIRecipeIdea = z.infer<typeof aiRecipeIdeaSchema>;

function extractOutputText(response: unknown) {
  if (response && typeof response === "object" && "output_text" in response) {
    const text = (response as { output_text?: unknown }).output_text;
    if (typeof text === "string") return text;
  }

  const output = (response as { output?: unknown })?.output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    const content = (item as { content?: unknown })?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const text = (part as { text?: unknown })?.text;
      if (typeof text === "string") return text;
    }
  }

  return null;
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

async function generateWithCloudflare(
  prompt: string,
  categories: string[]
): Promise<ActionResult<AIRecipeIdea> | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN;

  if (!accountId || !apiToken) return null;

  const dynamicSchema = buildRecipeIdeaJsonSchema(categories);
  const result = await runCloudflareTask("recipeGeneration", {
    messages: buildRecipeGenerationMessages(prompt, categories),
    responseFormat: {
      type: "json_schema",
      json_schema: dynamicSchema,
    },
  });

  if (!result) return null;
  if (!result.success) {
    return {
      success: false,
      error: cloudflareFailureMessage(result.category),
    };
  }

  const output = result.output;
  if (typeof output === "object") {
    const parsed = aiRecipeIdeaSchema.safeParse(output);
    if (parsed.success) return { success: true, data: parsed.data };
  }

  if (typeof output === "string") {
    try {
      const parsedJson = JSON.parse(extractJsonObject(output)) as unknown;
      const parsed = aiRecipeIdeaSchema.safeParse(parsedJson);
      if (parsed.success) return { success: true, data: parsed.data };
    } catch {
      return {
        success: false,
        error: "The generated recipe was not valid JSON. Try again.",
      };
    }
  }

  return {
    success: false,
    error: "The generated recipe was incomplete. Try again with a little more detail.",
  };
}

async function generateWithOpenAI(
  prompt: string,
  categories: string[],
  overrideKey?: string
): Promise<ActionResult<AIRecipeIdea> | null> {
  const apiKey = overrideKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const dynamicSchema = buildRecipeIdeaJsonSchema(categories);
  const categoryList = formatCategoryList(categories);

  const result = await runExternalAiRequest({
    task: "recipeGeneration",
    provider: "openai",
    model: resolveExternalModel("recipeGeneration", "openai"),
    apiKey,
    timeoutMs: 30_000,
    body: {
      input: [
        {
          role: "system",
          content: `You are a warm, practical family cookbook assistant. Create one realistic, saveable recipe idea from the user's pantry and preferences. Favor common ingredients, clear steps, and family-friendly wording. Do not invent unavailable specialty ingredients unless they are explicitly optional. Choose category from ${categoryList}. ${RECIPE_GENERATION_QUALITY_GUIDANCE}`,
        },
        {
          role: "user",
          content: `Pantry request: ${prompt}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "recipe_idea",
          strict: true,
          schema: dynamicSchema,
        },
      },
    },
  });

  if (!result.success) {
    return {
      success: false,
      error: "OpenAI could not generate a recipe idea. Check the key and try again.",
    };
  }

  const outputText = extractOutputText(result.json);
  if (!outputText) {
    return { success: false, error: "The model did not return a recipe idea." };
  }

  try {
    const parsedJson = JSON.parse(extractJsonObject(outputText)) as unknown;
    const parsed = aiRecipeIdeaSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return {
        success: false,
        error: "The generated recipe was incomplete. Try again with a little more detail.",
      };
    }

    return { success: true, data: parsed.data };
  } catch {
    return {
      success: false,
      error: "The generated recipe was not valid JSON. Try again.",
    };
  }
}

async function generateWithAnthropic(
  prompt: string,
  categories: string[],
  apiKey: string
): Promise<ActionResult<AIRecipeIdea> | null> {
  const model = resolveExternalModel("recipeGeneration", "anthropic");
  const dynamicSchema = buildRecipeIdeaJsonSchema(categories);
  const categoryList = formatCategoryList(categories);

  const result = await runExternalAiRequest({
    task: "recipeGeneration",
    provider: "anthropic",
    model,
    apiKey,
    timeoutMs: 30_000,
    body: {
      max_tokens: 2000,
      system: `You are a warm, practical family cookbook assistant. Use the create_recipe tool to return exactly one realistic, saveable recipe idea. Favor common ingredients, clear steps, and family-friendly wording. Choose category from ${categoryList}. ${RECIPE_GENERATION_QUALITY_GUIDANCE}`,
      messages: [{ role: "user", content: `Pantry request: ${prompt}` }],
      tools: [
        {
          name: "create_recipe",
          description: "Return a single recipe idea as structured data.",
          input_schema: dynamicSchema,
        },
      ],
      tool_choice: { type: "tool", name: "create_recipe" },
    },
  });

  if (!result.success) {
    return {
      success: false,
      error: "Anthropic could not generate a recipe idea. Check the key and try again.",
    };
  }

  const json = result.json as {
    content?: { type: string; name?: string; input?: unknown }[];
  };

  const toolBlock = json.content?.find((b) => b.type === "tool_use" && b.name === "create_recipe");
  if (!toolBlock?.input) {
    return { success: false, error: "Claude did not return a recipe idea." };
  }

  const parsed = aiRecipeIdeaSchema.safeParse(toolBlock.input);
  if (!parsed.success) {
    return {
      success: false,
      error: "The generated recipe was incomplete. Try again with a little more detail.",
    };
  }

  return { success: true, data: parsed.data };
}

async function getUserAISettings(userId: string): Promise<{ provider: string | null; key: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("ai_provider, ai_api_key")
    .eq("user_id", userId)
    .single();
  return { provider: data?.ai_provider ?? null, key: data?.ai_api_key ?? null };
}

export async function generateRecipeIdea(
  pantryPrompt: string,
  bookId: string
): Promise<ActionResult<AIRecipeIdea>> {
  const prompt = pantryPrompt.trim();
  if (prompt.length < 10) {
    return {
      success: false,
      error: "Tell me what you have and what kind of meal you want.",
    };
  }
  if (prompt.length > 2_000) {
    return {
      success: false,
      error: "Keep the recipe request under 2,000 characters.",
    };
  }

  const user = await requireUser();

  async function consumeOnSuccess(result: ActionResult<AIRecipeIdea>): Promise<ActionResult<AIRecipeIdea>> {
    if (!result.success) return result;
    try {
      await consumeAiAllowance(user.id);
      return result;
    } catch (error) {
      if (error instanceof EntitlementError) return { success: false as const, error: error.message };
      throw error;
    }
  }

  // Tell the AI about this cookbook's actual chapters, so suggestions land in
  // the right place (including any custom chapters the user has added).
  const categories = await fetchBookCategoryNames(bookId, user.id);
  if (!categories) {
    return { success: false, error: "You don't have access to this cookbook." };
  }
  if (!consumeAiTaskThrottle(user.id, "recipeGeneration")) {
    return {
      success: false,
      error: "Too many recipe requests at once. Wait a minute and try again.",
    };
  }

  // User's own provider/key takes priority
  const { provider, key } = await getUserAISettings(user.id);
  if (provider && key) {
    if (provider === "anthropic") {
      const result = await generateWithAnthropic(prompt, categories, key);
      if (result) return consumeOnSuccess(result);
    } else {
      const result = await generateWithOpenAI(prompt, categories, key);
      if (result) return result;
    }
  }

  // Fall back to server-configured Cloudflare Workers AI
  const cloudflareResult = await generateWithCloudflare(prompt, categories);
  if (cloudflareResult) return consumeOnSuccess(cloudflareResult);

  // Fall back to server-configured OpenAI key
  const openAIResult = await generateWithOpenAI(prompt, categories);
  if (openAIResult) return consumeOnSuccess(openAIResult);

  return {
    success: false,
    error: "No AI provider is configured. Add your API key in Settings to enable recipe ideas.",
  };
}

export async function saveRecipeIdea(
  bookId: string,
  idea: AIRecipeIdea
): Promise<ActionResult<Recipe>> {
  const parsed = aiRecipeIdeaSchema.safeParse(idea);
  if (!parsed.success) {
    return { success: false, error: "This recipe idea is not ready to save." };
  }

  const ingredientNames = parsed.data.ingredients.map((i) => i.item);
  const photo_url = await selectRecipeImage(parsed.data.title, ingredientNames) ?? undefined;

  return createRecipe(bookId, {
    ...parsed.data,
    photo_url,
    source_name: parsed.data.source_name || "AI Recipe Idea",
    ingredients: parsed.data.ingredients.map((ingredient) => ({
      quantity: ingredient.quantity.slice(0, 20),
      unit: ingredient.unit.slice(0, 30),
      item: ingredient.item,
      note: ingredient.note.slice(0, 200),
    })),
    instructions: parsed.data.instructions,
  });
}
