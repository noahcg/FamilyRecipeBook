import { z } from "zod";

export interface RecipeOriginal {
  path: string;
  name: string;
  url: string;
}

export const RECIPE_ORIGINAL_MAX_BYTES = 20 * 1024 * 1024;
export const RECIPE_ORIGINAL_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const recipeOriginalUploadSchema = z.object({
  recipeId: z.uuid(),
  name: z.string().trim().min(1).max(180).refine((name) => !/[\/\\\x00-\x1f\x7f]/.test(name), "Choose a file with a valid name."),
  size: z.number().int().positive().max(RECIPE_ORIGINAL_MAX_BYTES, "Each original must be 20 MB or smaller."),
  type: z.enum(RECIPE_ORIGINAL_TYPES, { error: "Choose a JPG, PNG, WebP, or PDF file." }),
});

export function originalFileName(name: string, type: string): string {
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[type] ?? "pdf";
  const base = name.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 120);
  return `${base || "Original recipe"}.${extension}`;
}

export function isRecipeOriginalPath(recipeId: string, path: string): boolean {
  return z.uuid().safeParse(recipeId).success && path.startsWith(`${recipeId}/`) &&
    /^[0-9a-f-]{36}\/[0-9a-f-]{36}_[a-zA-Z0-9 _-]+\.(jpg|png|webp|pdf)$/.test(path);
}
