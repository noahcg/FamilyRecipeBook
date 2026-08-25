"use server";

import {
  searchRecipeImageCandidates,
  selectDefaultImageUrl,
  type PexelsPhoto,
  type RecipeImageCandidate,
} from "@/lib/pexelsSearch";

function isAiImagePickerEnabled() {
  return process.env.ENABLE_AI_IMAGE_PICKER === "true";
}

function hasCloudflareConfig() {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN
  );
}

// Shared helper - same fetch pattern as aiRecipes.ts, but gated by
// ENABLE_AI_IMAGE_PICKER so Pexels-only search remains the primary path.
async function callCloudflareText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<string | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN;
  const model =
    process.env.CLOUDFLARE_WORKERS_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast";

  if (!isAiImagePickerEnabled() || !accountId || !apiToken) return null;

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiToken}`,
          "content-type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
        }),
      }
    );

    if (!response.ok) return null;

    const json = (await response.json()) as {
      result?: {
        response?: unknown;
        choices?: { message?: { content?: unknown } }[];
      };
    };
    const output =
      json.result?.response ?? json.result?.choices?.[0]?.message?.content;
    return typeof output === "string" ? output.trim() : null;
  } catch {
    return null;
  }
}

async function improveSearchQuery(
  title: string,
  ingredients: string[]
): Promise<string | null> {
  if (!hasCloudflareConfig()) return null;

  const sample = ingredients.slice(0, 5).join(", ");
  const raw = await callCloudflareText(
    "You convert recipe names into short stock photo search queries. Return ONLY a 3-5 word phrase. Focus on homemade food and natural presentation. No quotes, no punctuation, no explanation.",
    `Recipe: ${title}${sample ? `\nKey ingredients: ${sample}` : ""}`,
    40
  );

  const cleaned = raw?.split("\n")[0].replace(/['"*]/g, "").trim().slice(0, 80);
  return cleaned || null;
}

async function fetchPexelsCandidates(query: string): Promise<PexelsPhoto[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "10");
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("size", "medium");
    url.searchParams.set("locale", "en-US");

    const response = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
      cache: "no-store",
    });

    if (!response.ok) return [];

    const json = (await response.json()) as { photos?: PexelsPhoto[] };
    return json.photos ?? [];
  } catch {
    return [];
  }
}

async function rankWithCloudflare(
  title: string,
  query: string,
  candidates: RecipeImageCandidate[]
): Promise<RecipeImageCandidate[] | null> {
  if (!hasCloudflareConfig() || candidates.length <= 1) return null;

  const list = candidates
    .map((candidate, index) => `${index + 1}. ${candidate.alt}`)
    .join("\n");

  const raw = await callCloudflareText(
    "You pick the best food photo for a warm family cookbook. Prefer homemade look, natural lighting, simple plating, and appetizing but not over-styled food. Avoid restaurant or studio photos. Return ONLY the number of the best image.",
    `Recipe: ${title}\nSearch: ${query}\n\nImages:\n${list}`,
    20
  );

  if (!raw) return null;

  const selected = parseInt(raw.replace(/\D/g, ""), 10);
  if (Number.isNaN(selected) || selected < 1 || selected > candidates.length) {
    return null;
  }

  const best = candidates[selected - 1];
  return [best, ...candidates.filter((candidate) => candidate !== best)];
}

export async function searchRecipeImages(
  title: string,
  ingredients: string[]
): Promise<RecipeImageCandidate[]> {
  return searchRecipeImageCandidates({
    title,
    ingredients,
    fetchCandidates: fetchPexelsCandidates,
    improveQuery: isAiImagePickerEnabled() ? improveSearchQuery : undefined,
    rankCandidates: isAiImagePickerEnabled() ? rankWithCloudflare : undefined,
    limit: 8,
  });
}

/**
 * Compatibility wrapper for existing create flows. Returns the best/default
 * image URL, or null if Pexels is not configured or no suitable image is found.
 */
export async function selectRecipeImage(
  title: string,
  ingredients: string[]
): Promise<string | null> {
  try {
    return selectDefaultImageUrl(await searchRecipeImages(title, ingredients));
  } catch {
    return null;
  }
}
