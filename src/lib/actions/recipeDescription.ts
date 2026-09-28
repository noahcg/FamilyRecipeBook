"use server";

import { runCloudflareTask } from "@/lib/ai/cloudflare";
import { buildRecipeDescriptionMessages } from "@/lib/ai/prompts";
import { consumeAiTaskThrottle } from "@/lib/ai/throttle";
import { requireUser } from "@/lib/auth";

// Generates a short, warm one-line description for a recipe that the user
// left blank. Mirrors the auto-image flow in pexels.ts: the same Cloudflare
// Workers AI fetch pattern, called only when the user hasn't written their own.

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
  const user = await requireUser();
  if (!consumeAiTaskThrottle(user.id, "recipeDescription")) return null;
  const safeTitle = title.trim().slice(0, 200);
  if (!safeTitle) return null;
  const safeIngredients = ingredients
    .slice(0, 8)
    .map((ingredient) => ingredient.trim().slice(0, 200))
    .filter(Boolean);

  const result = await runCloudflareTask("recipeDescription", {
    messages: buildRecipeDescriptionMessages(safeTitle, safeIngredients),
  });
  const raw = result?.success && typeof result.output === "string"
    ? result.output.trim()
    : null;

  if (!raw) return null;

  const description = cleanDescription(raw);
  return description.length >= 12 ? description : null;
}
