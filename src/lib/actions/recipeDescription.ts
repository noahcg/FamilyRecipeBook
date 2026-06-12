"use server";

// Generates a short, warm one-line description for a recipe that the user
// left blank. Mirrors the auto-image flow in pexels.ts: the same Cloudflare
// Workers AI fetch pattern, called only when the user hasn't written their own.

// Shared helper — same fetch pattern as pexels.ts and aiRecipes.ts
async function callCloudflareText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<string | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN;
  const model =
    process.env.CLOUDFLARE_WORKERS_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast";

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
      result?: {
        response?: unknown;
        choices?: { message?: { content?: unknown } }[];
      };
    };
    // Newer Workers AI models return OpenAI chat-completion shape
    // (result.choices[].message.content); older ones use result.response.
    const output =
      json.result?.response ?? json.result?.choices?.[0]?.message?.content;
    return typeof output === "string" ? output.trim() : null;
  } catch {
    return null;
  }
}

// Schema caps description at 500 chars; leave headroom and trim on a sentence
// boundary so the paragraph never ends mid-word.
const MAX_DESCRIPTION = 480;

// Tidy the model output into a clean single-paragraph blurb. Collapses any
// line breaks the model adds, strips quotes/markdown, and trims to the last
// complete sentence that fits under the limit.
function cleanDescription(raw: string): string {
  const cleaned = raw
    .replace(/\s+/g, " ")
    .replace(/^["'*_\s]+/, "")
    .replace(/["'*_]+$/, "")
    .trim();

  if (cleaned.length <= MAX_DESCRIPTION) return cleaned;

  const truncated = cleaned.slice(0, MAX_DESCRIPTION);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? ")
  );
  // Prefer a clean sentence break; fall back to the last word boundary.
  if (lastSentenceEnd > 160) return truncated.slice(0, lastSentenceEnd + 1);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : MAX_DESCRIPTION).trim()}…`;
}

/**
 * Generates a short description for a recipe from its title and ingredients.
 * Returns the description, or null if Cloudflare is not configured or the
 * model returns nothing usable.
 *
 * Called only when the user has not written their own description.
 */
export async function generateRecipeDescription(
  title: string,
  ingredients: string[]
): Promise<string | null> {
  if (!title.trim()) return null;

  const sample = ingredients.slice(0, 8).join(", ");

  const raw = await callCloudflareText(
    "You write warm, appetizing descriptions for a family cookbook. Return ONLY a short paragraph of 3-4 sentences (about 45-75 words) describing the dish — what it is, its flavors or texture, and when you'd enjoy it. No title, no quotes, no markdown, no headings, no lists, no preamble. Be inviting and homey, not flowery.",
    `Recipe: ${title}${sample ? `\nKey ingredients: ${sample}` : ""}`,
    220
  );

  if (!raw) return null;

  const description = cleanDescription(raw);
  return description.length >= 12 ? description : null;
}
