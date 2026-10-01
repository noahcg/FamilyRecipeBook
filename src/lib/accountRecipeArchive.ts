import { gzipSync } from "zlib";
import { createServiceClient } from "@/lib/supabase/service";

const RECIPE_SELECT = `
  *,
  category:book_categories!recipes_category_id_fkey(id,name),
  ingredients:recipe_ingredients(*),
  instructions:recipe_instructions(*),
  stories:recipe_stories(*)
`;

const MAX_EMAIL_ARCHIVE_BYTES = 35 * 1024 * 1024;

type ServiceClient = ReturnType<typeof createServiceClient>;
type RecipeRow = Record<string, unknown> & { id: string; book_id: string };

async function getRecipesInDeletedBooks(service: ServiceClient, ids: string[]): Promise<RecipeRow[]> {
  if (!ids.length) return [];
  const recipes: RecipeRow[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await service
      .from("recipes")
      .select(RECIPE_SELECT)
      .in("book_id", ids)
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as RecipeRow[];
    recipes.push(...page);
    if (page.length < pageSize) return recipes;
  }
}

/**
 * Creates a compact, lossless JSON representation of content that will actually
 * disappear. Recipes authored in a cookbook that survives are deliberately not
 * archived: account deletion now preserves them with anonymized attribution.
 */
export async function createAccountRecipeArchive(
  service: ServiceClient,
  userId: string,
  email: string,
  deletedBookIds: string[]
): Promise<{ filename: string; content: Buffer; recipeCount: number }> {
  const recipes = await getRecipesInDeletedBooks(service, deletedBookIds);
  const bookIds = [...new Set(deletedBookIds)];

  const { data: books, error: booksError } = bookIds.length
    ? await service
        .from("recipe_books")
        .select("id,title,description,cover_image_url,cover_style,icon,sharing_enabled,owner_id,created_at,updated_at")
        .in("id", bookIds)
        .order("id")
    : { data: [], error: null };
  if (booksError) throw new Error(booksError.message);

  const archive = {
    format: "home-cooked-recipe-archive",
    version: 1,
    exportedAt: new Date().toISOString(),
    account: { id: userId, email },
    scope: {
      description: "Cookbook content removed by this account deletion, with cookbook metadata, ingredients, instructions, and recipe stories.",
      recipeCount: recipes.length,
      binaryMediaIncluded: false,
      binaryMediaNote: "Photo URLs and other recipe metadata are retained, but image and scanned-original file binaries are not included in this compact archive.",
    },
    cookbooks: books ?? [],
    recipes,
  };
  const content = gzipSync(Buffer.from(JSON.stringify(archive)));
  if (content.byteLength > MAX_EMAIL_ARCHIVE_BYTES) {
    throw new Error("The recipe archive is too large to deliver safely by email.");
  }

  const date = new Date().toISOString().slice(0, 10);
  return {
    filename: `home-cooked-recipe-archive-${date}.json.gz`,
    content,
    recipeCount: recipes.length,
  };
}
