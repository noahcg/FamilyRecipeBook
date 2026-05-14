"use server";

import { requireUser } from "@/lib/auth";
import { canContribute } from "@/lib/permissions";
import {
  importedRecipeJsonSchema,
  importedRecipeSchema,
  normalizeImportedRecipe,
  type ImportedRecipe,
} from "@/lib/recipeImportSchema";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

async function getBookRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookId: string,
  userId: string
) {
  const { data } = await supabase
    .from("book_members")
    .select("role")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .single();
  return data?.role ?? null;
}

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

export async function improveRecipeImportWithOpenAI(
  bookId: string,
  imageDataUrl: string
): Promise<ActionResult<ImportedRecipe>> {
  const user = await requireUser();
  const supabase = await createClient();

  const [memberRes, settingsRes] = await Promise.all([
    getBookRole(supabase, bookId, user.id),
    supabase
      .from("user_settings")
      .select("ai_provider, ai_api_key")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!canContribute(memberRes)) {
    return { success: false, error: "You don't have permission to add recipes." };
  }

  const settings = settingsRes.data;
  if (settings?.ai_provider !== "openai" || !settings.ai_api_key) {
    return {
      success: false,
      error: "Add your OpenAI API key in Settings to improve photo imports.",
    };
  }

  if (!/^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(imageDataUrl)) {
    return { success: false, error: "Upload a JPEG, PNG, or WebP image." };
  }

  if (imageDataUrl.length > 1_050_000) {
    return {
      success: false,
      error: "That photo is too large to improve. Try cropping closer to the recipe text.",
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${settings.ai_api_key}`,
      "content-type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model: process.env.OPENAI_RECIPE_OCR_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You extract printed cookbook recipes into structured data for a family recipe app. Transcribe faithfully. Do not invent missing ingredients or steps. Use empty strings and warning notes for unclear or missing fields.",
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Extract the recipe title, short description if present, source/author if present, prep time, cook or bake time, servings/yield, ingredients, and method steps from this image. Split ingredient quantity, unit, item, and note when reasonably clear. Preserve numbered instruction boundaries. If a field is not visible, use 0 or empty strings/arrays as appropriate.",
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "imported_recipe",
          strict: true,
          schema: importedRecipeJsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      success: false,
      error: `OpenAI could not improve this import. ${body.slice(0, 180)}`,
    };
  }

  const json = (await response.json()) as unknown;
  const outputText = extractOutputText(json);
  if (!outputText) {
    return { success: false, error: "OpenAI did not return recipe text." };
  }

  try {
    const parsedJson = JSON.parse(outputText) as unknown;
    const parsed = importedRecipeSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return {
        success: false,
        error: "OpenAI returned an incomplete recipe. Try a clearer, closer photo.",
      };
    }

    const normalized = normalizeImportedRecipe(parsed.data);
    if (!normalized.ingredients.length || !normalized.instructions.length) {
      return {
        success: false,
        error: "OpenAI could not find both ingredients and steps.",
      };
    }

    return { success: true, data: normalized };
  } catch {
    return {
      success: false,
      error: "OpenAI returned unreadable data. Try again with a clearer photo.",
    };
  }
}
