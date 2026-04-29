"use server";

interface UnsplashPhoto {
  alt_description: string | null;
  urls: { regular: string; small: string };
  user: { name: string; links: { html: string } };
}

// Shared helper — same fetch pattern as aiRecipes.ts
async function callCloudflareText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<string | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN;
  const model =
    process.env.CLOUDFLARE_WORKERS_AI_MODEL ?? "@cf/meta/llama-3.1-8b-instruct";

  if (!accountId || !apiToken) return null;

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
      result?: { response?: unknown };
    };
    const output = json.result?.response;
    return typeof output === "string" ? output.trim() : null;
  } catch {
    return null;
  }
}

// Step 1 — Turn a recipe into a good Unsplash search phrase
async function buildSearchQuery(title: string, ingredients: string[]): Promise<string> {
  const sample = ingredients.slice(0, 5).join(", ");

  const raw = await callCloudflareText(
    "You convert recipe names into short Unsplash photo search queries. Return ONLY a 3-5 word phrase. Focus on: homemade, rustic, warm lighting, natural presentation. No quotes, no punctuation, no explanation.",
    `Recipe: ${title}${sample ? `\nKey ingredients: ${sample}` : ""}`,
    40
  );

  if (!raw) return `homemade ${title.toLowerCase()} rustic`;

  // Take only the first line; strip quotes and leading/trailing noise
  const cleaned = raw.split("\n")[0].replace(/['"*]/g, "").trim().slice(0, 80);
  return cleaned || `homemade ${title.toLowerCase()} rustic`;
}

// Step 2 — Fetch candidate images from Unsplash
async function fetchCandidates(query: string): Promise<UnsplashPhoto[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return [];

  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "10");
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("content_filter", "high");

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
      cache: "no-store",
    });

    if (!response.ok) return [];

    const json = (await response.json()) as { results?: UnsplashPhoto[] };
    return json.results ?? [];
  } catch {
    return [];
  }
}

// Step 3 — Rank candidates with AI; return 0-based index of best pick
async function pickBestImage(
  title: string,
  query: string,
  candidates: UnsplashPhoto[]
): Promise<number> {
  if (candidates.length <= 1) return 0;

  const list = candidates
    .map((p, i) => `${i + 1}. ${p.alt_description ?? "(no description)"}`)
    .join("\n");

  const raw = await callCloudflareText(
    "You pick the best food photo for a warm family cookbook. Prefer: homemade look, natural lighting, simple plating, appetizing but not over-styled. Avoid: restaurant, studio. Return ONLY the number of the best image.",
    `Recipe: ${title}\nSearch: ${query}\n\nImages:\n${list}`,
    20
  );

  if (!raw) return 0;

  const num = parseInt(raw.replace(/\D/g, ""), 10);
  if (!isNaN(num) && num >= 1 && num <= candidates.length) return num - 1;
  return 0;
}

// Append sizing params to an Unsplash URL, preserving existing query string
function sizedUrl(base: string, width: number, quality = 80): string {
  try {
    const u = new URL(base);
    u.searchParams.set("auto", "format");
    u.searchParams.set("fit", "crop");
    u.searchParams.set("w", String(width));
    u.searchParams.set("q", String(quality));
    return u.toString();
  } catch {
    return base;
  }
}

/**
 * Automatically selects the most appropriate Unsplash image for a recipe.
 * Returns the image URL, or null if Unsplash is not configured or no
 * suitable image is found.
 *
 * Called only when the user has not uploaded their own photo.
 */
export async function selectRecipeImage(
  title: string,
  ingredients: string[]
): Promise<string | null> {
  try {
    const query = await buildSearchQuery(title, ingredients);

    let candidates = await fetchCandidates(query);

    // Fallback to a generic cozy-food query if specific one returns nothing
    if (candidates.length === 0) {
      candidates = await fetchCandidates("homemade meal warm rustic kitchen");
    }

    if (candidates.length === 0) return null;

    const bestIdx = await pickBestImage(title, query, candidates);
    const photo = candidates[bestIdx] ?? candidates[0];

    return sizedUrl(photo.urls.regular, 900);
  } catch {
    return null;
  }
}
