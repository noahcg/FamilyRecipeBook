"use server";

import { runCloudflareTask } from "@/lib/ai/cloudflare";
import {
  buildRecipeImageRankingMessages,
  buildRecipeImageSearchMessages,
} from "@/lib/ai/prompts";
import { consumeAiTaskThrottle } from "@/lib/ai/throttle";
import { requireUser } from "@/lib/auth";
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

async function improveSearchQuery(
  title: string,
  ingredients: string[]
): Promise<string | null> {
  if (!hasCloudflareConfig()) return null;

  const safeTitle = title.trim().slice(0, 200);
  const safeIngredients = ingredients
    .slice(0, 5)
    .map((ingredient) => ingredient.trim().slice(0, 200))
    .filter(Boolean);

  const result = await runCloudflareTask("recipeImageSearchQuery", {
    messages: buildRecipeImageSearchMessages(safeTitle, safeIngredients),
  });
  const raw = result?.success && (typeof result.output === "string" || typeof result.output === "number")
    ? String(result.output).trim()
    : null;

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

  const safeTitle = title.trim().slice(0, 200);
  const safeQuery = query.trim().slice(0, 100);

  const result = await runCloudflareTask("recipeImageRanking", {
    messages: buildRecipeImageRankingMessages(
      safeTitle,
      safeQuery,
      candidates.map((candidate) => candidate.alt.slice(0, 300))
    ),
  });
  const raw = result?.success && (typeof result.output === "string" || typeof result.output === "number")
    ? String(result.output).trim()
    : null;

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
  const user = await requireUser();
  const useAiPicker = isAiImagePickerEnabled() &&
    consumeAiTaskThrottle(user.id, "recipeImageSearchQuery");
  return searchRecipeImageCandidates({
    title,
    ingredients,
    fetchCandidates: fetchPexelsCandidates,
    improveQuery: useAiPicker ? improveSearchQuery : undefined,
    rankCandidates: useAiPicker ? rankWithCloudflare : undefined,
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
