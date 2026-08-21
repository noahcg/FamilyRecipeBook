export interface PexelsPhoto {
  alt: string | null;
  src: {
    large: string;
    large2x?: string;
    landscape?: string;
    medium?: string;
  };
  photographer: string;
  photographer_url: string;
  url: string;
}

export interface RecipeImageCandidate {
  image_url: string;
  alt: string;
  photographer: string;
  photographer_url: string;
  source_url: string;
  query: string;
}

type CandidateFetcher = (query: string) => Promise<PexelsPhoto[]>;

interface SearchRecipeImageCandidatesOptions {
  title: string;
  ingredients: string[];
  fetchCandidates: CandidateFetcher;
  improveQuery?: (title: string, ingredients: string[]) => Promise<string | null>;
  rankCandidates?: (
    title: string,
    query: string,
    candidates: RecipeImageCandidate[]
  ) => Promise<RecipeImageCandidate[] | null>;
  limit?: number;
}

const GENERIC_FALLBACK_QUERY = "homemade meal warm rustic kitchen";

const STOP_WORDS = new Set([
  "fresh",
  "dried",
  "ground",
  "chopped",
  "minced",
  "sliced",
  "diced",
  "large",
  "small",
  "medium",
  "optional",
  "taste",
  "salt",
  "pepper",
  "water",
]);

function cleanSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\b\d+([./]\d+)?\b/g, " ")
    .replace(/\b(cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|grams?|g|kg|ml|liters?|cloves?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIngredient(ingredient: string) {
  const words = cleanSearchText(ingredient)
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  return words.slice(-3).join(" ");
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildDeterministicSearchQueries(title: string, ingredients: string[]) {
  const cleanTitle = cleanSearchText(title);
  const topIngredients = unique(ingredients.map(normalizeIngredient)).slice(0, 3);
  const primaryIngredient = topIngredients[0] ?? "";
  const ingredientPhrase = topIngredients.slice(0, 2).join(" ");

  return unique([
    [cleanTitle, ingredientPhrase, "homemade"].filter(Boolean).join(" "),
    [cleanTitle, primaryIngredient].filter(Boolean).join(" "),
    [cleanTitle, "homemade food"].filter(Boolean).join(" "),
    [primaryIngredient, "homemade meal"].filter(Boolean).join(" "),
    ingredientPhrase ? `${ingredientPhrase} food` : "",
    GENERIC_FALLBACK_QUERY,
  ]);
}

export function sizedPexelsUrl(base: string, width: number, quality = 80): string {
  try {
    const url = new URL(base);
    url.searchParams.set("auto", "compress");
    url.searchParams.set("cs", "tinysrgb");
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality));
    return url.toString();
  } catch {
    return base;
  }
}

function pexelsPhotoToCandidate(photo: PexelsPhoto, query: string): RecipeImageCandidate {
  const image =
    photo.src.large2x ?? photo.src.large ?? photo.src.landscape ?? photo.src.medium;

  return {
    image_url: sizedPexelsUrl(image, 900),
    alt: photo.alt?.trim() || "Recipe photo",
    photographer: photo.photographer,
    photographer_url: photo.photographer_url,
    source_url: photo.url,
    query,
  };
}

export async function searchRecipeImageCandidates({
  title,
  ingredients,
  fetchCandidates,
  improveQuery,
  rankCandidates,
  limit = 8,
}: SearchRecipeImageCandidatesOptions): Promise<RecipeImageCandidate[]> {
  const deterministicQueries = buildDeterministicSearchQueries(title, ingredients);
  const aiQuery = improveQuery ? await improveQuery(title, ingredients) : null;
  const queries = unique([aiQuery ?? "", ...deterministicQueries]);
  const candidates: RecipeImageCandidate[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const photos = await fetchCandidates(query);
    for (const photo of photos) {
      const candidate = pexelsPhotoToCandidate(photo, query);
      const key = candidate.source_url || candidate.image_url;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(candidate);
      if (candidates.length >= limit) break;
    }
    if (candidates.length >= limit) break;
  }

  if (!candidates.length) return [];

  if (rankCandidates) {
    const ranked = await rankCandidates(title, queries[0] ?? deterministicQueries[0] ?? "", candidates);
    if (ranked?.length) return ranked.slice(0, limit);
  }

  return candidates.slice(0, limit);
}

export function selectDefaultImageUrl(candidates: RecipeImageCandidate[]) {
  return candidates[0]?.image_url ?? null;
}
