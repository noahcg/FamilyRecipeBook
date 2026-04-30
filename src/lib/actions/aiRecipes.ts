"use server";

import { z } from "zod";
import { createRecipe } from "@/lib/actions/recipes";
import { selectRecipeImage } from "@/lib/actions/unsplash";
import type { ActionResult, Recipe } from "@/lib/types";

const aiIngredientSchema = z.object({
  quantity: z.string().max(20),
  unit: z.string().max(30),
  item: z.string().min(1),
  note: z.string().max(200),
});

const aiInstructionSchema = z.object({
  body: z.string().min(1),
});

const aiRecipeIdeaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500),
  source_name: z.string().max(100),
  story: z.string().max(2000),
  prep_minutes: z.number().int().min(0).max(10080),
  cook_minutes: z.number().int().min(0).max(10080),
  servings: z.number().int().min(1).max(100),
  category: z.string().max(50),
  tags: z.array(z.string().max(30)).max(10),
  ingredients: z.array(aiIngredientSchema).min(1),
  instructions: z.array(aiInstructionSchema).min(1),
});

export type AIRecipeIdea = z.infer<typeof aiRecipeIdeaSchema>;

const recipeIdeaJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "source_name",
    "story",
    "prep_minutes",
    "cook_minutes",
    "servings",
    "category",
    "tags",
    "ingredients",
    "instructions",
  ],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    source_name: { type: "string" },
    story: { type: "string" },
    prep_minutes: { type: "integer" },
    cook_minutes: { type: "integer" },
    servings: { type: "integer" },
    category: { type: "string" },
    tags: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
    ingredients: {
      type: "array",
      minItems: 4,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["quantity", "unit", "item", "note"],
        properties: {
          quantity: { type: "string" },
          unit: { type: "string" },
          item: { type: "string" },
          note: { type: "string" },
        },
      },
    },
    instructions: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["body"],
        properties: {
          body: { type: "string" },
        },
      },
    },
  },
};

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

async function generateWithCloudflare(prompt: string): Promise<ActionResult<AIRecipeIdea> | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN;
  const model = process.env.CLOUDFLARE_WORKERS_AI_MODEL ?? "@cf/meta/llama-3.1-8b-instruct";

  if (!accountId || !apiToken) return null;

  const messages = [
    {
      role: "system",
      content:
        "You are a warm, practical family cookbook assistant. Return only valid compact JSON matching this shape: {\"title\":\"\",\"description\":\"\",\"source_name\":\"AI Recipe Idea\",\"story\":\"\",\"prep_minutes\":0,\"cook_minutes\":0,\"servings\":4,\"category\":\"Dinner\",\"tags\":[\"\"],\"ingredients\":[{\"quantity\":\"\",\"unit\":\"\",\"item\":\"\",\"note\":\"\"}],\"instructions\":[{\"body\":\"\"}]}. Keep descriptions and steps concise. Use 4-8 ingredients and 3-6 steps. Use empty strings for unknown quantity, unit, or note. Do not include markdown.",
    },
    {
      role: "user",
      content: `Create one realistic, saveable recipe idea from this pantry request: ${prompt}`,
    },
  ];

  async function runCloudflare(useSchema: boolean) {
    return fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiToken}`,
          "content-type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          messages,
          max_tokens: 1800,
          ...(useSchema
            ? {
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    type: "object",
                    properties: recipeIdeaJsonSchema.properties,
                    required: recipeIdeaJsonSchema.required,
                  },
                },
              }
            : {}),
        }),
      }
    );
  }

  const response = await runCloudflare(true);

  if (!response.ok) {
    const body = await response.text();
    return {
      success: false,
      error: `Cloudflare Workers AI could not generate a recipe. ${body.slice(0, 180)}`,
    };
  }

  const json = (await response.json()) as {
    success?: boolean;
    errors?: { message?: string }[];
    result?: { response?: unknown };
  };

  if (json.success === false) {
    return {
      success: false,
      error: json.errors?.[0]?.message ?? "Cloudflare Workers AI returned an error.",
    };
  }

  const output = json.result?.response;
  if (!output) {
    return {
      success: false,
      error: "Cloudflare Workers AI did not return a recipe idea.",
    };
  }

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
      // Retry below without schema mode; some models mix schema output with text.
    }
  }

  const retryResponse = await runCloudflare(false);
  if (!retryResponse.ok) {
    return {
      success: false,
      error: "The generated recipe was incomplete. Try again with a little more detail.",
    };
  }

  const retryJson = (await retryResponse.json()) as {
    result?: { response?: unknown };
  };
  const retryOutput = retryJson.result?.response;

  try {
    const parsedJson =
      typeof retryOutput === "string"
        ? (JSON.parse(extractJsonObject(retryOutput)) as unknown)
        : retryOutput;
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

async function generateWithOpenAI(prompt: string): Promise<ActionResult<AIRecipeIdea> | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model: process.env.OPENAI_RECIPE_MODEL ?? "gpt-5-mini",
      input: [
        {
          role: "system",
          content:
            "You are a warm, practical family cookbook assistant. Create one realistic, saveable recipe idea from the user's pantry and preferences. Favor common ingredients, clear steps, and family-friendly wording. Do not invent unavailable specialty ingredients unless they are explicitly optional.",
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
          schema: recipeIdeaJsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      success: false,
      error: `OpenAI could not generate a recipe idea. ${body.slice(0, 180)}`,
    };
  }

  const json = (await response.json()) as unknown;
  const outputText = extractOutputText(json);
  if (!outputText) {
    return { success: false, error: "The model did not return a recipe idea." };
  }

  const parsedJson = JSON.parse(outputText) as unknown;
  const parsed = aiRecipeIdeaSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return {
      success: false,
      error: "The generated recipe was incomplete. Try again with a little more detail.",
    };
  }

  return { success: true, data: parsed.data };
}

export async function generateRecipeIdea(
  pantryPrompt: string
): Promise<ActionResult<AIRecipeIdea>> {
  const prompt = pantryPrompt.trim();
  if (prompt.length < 10) {
    return {
      success: false,
      error: "Tell me what you have and what kind of meal you want.",
    };
  }

  const cloudflareResult = await generateWithCloudflare(prompt);
  if (cloudflareResult) return cloudflareResult;

  const openAIResult = await generateWithOpenAI(prompt);
  if (openAIResult) return openAIResult;

  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN) {
    return {
      success: false,
      error: "Cloudflare Workers AI is not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_WORKERS_AI_API_TOKEN.",
    };
  }

  return { success: false, error: "No recipe AI provider is configured." };
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
