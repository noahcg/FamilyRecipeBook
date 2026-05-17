import JSZip from "jszip";
import Papa from "papaparse";
import { parseIngredientLine, parsePastedRecipe } from "@/lib/recipeTextImport";
import type { IngredientInput, InstructionInput } from "@/lib/validators/recipe";

export type ImportRecipeImage = {
  file: File;
  previewUrl: string;
};

export type NormalizedImportedRecipe = {
  id: string;
  title: string;
  description?: string;
  source_name?: string;
  story?: string;
  source_url?: string;
  prep_minutes?: number;
  cook_minutes?: number;
  servings?: number;
  category?: string;
  tags: string[];
  ingredients: IngredientInput[];
  instructions: InstructionInput[];
  notes?: string;
  nutrition: Record<string, unknown>;
  import_source: string;
  import_metadata: Record<string, unknown>;
  warnings: string[];
  image?: ImportRecipeImage;
};

export type RecipeImportSkippedFile = {
  fileName: string;
  reason: string;
};

export type RecipeImportResult = {
  recipes: NormalizedImportedRecipe[];
  skippedFiles: RecipeImportSkippedFile[];
  warnings: string[];
};

type JsonValue = Record<string, unknown> | unknown[];

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|heic)$/i;
const HTML_EXTENSIONS = /\.(html?|xhtml)$/i;

function compact(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return compact(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(stringValue).filter(Boolean).join(", ");
  if (value && typeof value === "object" && "name" in value) return stringValue((value as { name?: unknown }).name);
  return "";
}

function stringArray(value: unknown) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : String(value).split(/[,;|]/);
  return values.map(stringValue).filter(Boolean);
}

function minutesFromDuration(value: unknown) {
  const text = stringValue(value);
  if (!text) return undefined;
  const iso = text.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (iso) return Number(iso[1] ?? 0) * 60 + Number(iso[2] ?? 0);
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const minutes = text.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i);
  const total = (hours ? Math.round(Number(hours[1]) * 60) : 0) + (minutes ? Number(minutes[1]) : 0);
  if (total > 0) return total;
  const bare = text.match(/\b(\d{1,4})\b/);
  return bare ? Number(bare[1]) : undefined;
}

function servingsFrom(value: unknown) {
  const text = stringValue(value);
  const match = text.match(/\b(\d{1,3})\b/);
  return match ? Number(match[1]) : undefined;
}

function instructionInputs(value: unknown): InstructionInput[] {
  if (Array.isArray(value)) {
    return value
      .map((step) => {
        if (typeof step === "string") return step;
        if (step && typeof step === "object") return stringValue((step as Record<string, unknown>).text ?? (step as Record<string, unknown>).name);
        return "";
      })
      .map((body) => body.replace(/^\d+[\).:-]\s*/, "").trim())
      .filter(Boolean)
      .map((body) => ({ body }));
  }

  return stringValue(value)
    .split(/\n+|\r+|(?:\s+)(?=\d+[\).]\s+)/)
    .map((body) => body.replace(/^\d+[\).:-]\s*/, "").trim())
    .filter(Boolean)
    .map((body) => ({ body }));
}

function ingredientInputs(value: unknown): IngredientInput[] {
  const values = Array.isArray(value) ? value : stringValue(value).split(/\n+|\r+/);
  return values.map(stringValue).filter(Boolean).map(parseIngredientLine);
}

function recipeId(fileName: string, index: number) {
  return `${fileName}-${index}-${Math.random().toString(36).slice(2)}`;
}

function normalizeRecipe(raw: Record<string, unknown>, importSource: string, fileName: string, index: number): NormalizedImportedRecipe | null {
  const title = stringValue(raw.name ?? raw.title ?? raw.recipe_name ?? raw.recipeName);
  const ingredients = ingredientInputs(raw.recipeIngredient ?? raw.ingredients ?? raw.ingredient);
  const instructions = instructionInputs(raw.recipeInstructions ?? raw.instructions ?? raw.directions ?? raw.method);

  if (!title && !ingredients.length && !instructions.length) return null;

  const warnings: string[] = [];
  if (!title) warnings.push("Missing title; using file name.");
  if (!ingredients.length) warnings.push("No ingredients were found.");
  if (!instructions.length) warnings.push("No instructions were found.");

  return {
    id: recipeId(fileName, index),
    title: title || fileName.replace(/\.[^.]+$/, ""),
    description: stringValue(raw.description ?? raw.summary),
    source_name: stringValue(raw.author ?? raw.source ?? raw.source_name),
    story: stringValue(raw.notes ?? raw.note ?? raw.story),
    source_url: stringValue(raw.url ?? raw.source_url ?? raw.canonical_url),
    prep_minutes: minutesFromDuration(raw.prepTime ?? raw.prep_time ?? raw.prep_minutes),
    cook_minutes: minutesFromDuration(raw.cookTime ?? raw.cook_time ?? raw.cook_minutes),
    servings: servingsFrom(raw.recipeYield ?? raw.yield ?? raw.servings),
    category: stringValue(raw.recipeCategory ?? raw.category),
    tags: stringArray(raw.keywords ?? raw.tags ?? raw.categories).slice(0, 10),
    ingredients,
    instructions,
    notes: stringValue(raw.notes ?? raw.note),
    nutrition: raw.nutrition && typeof raw.nutrition === "object" ? raw.nutrition as Record<string, unknown> : {},
    import_source: importSource,
    import_metadata: { fileName, unmapped: raw },
    warnings,
  };
}

function findRecipeObjects(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(findRecipeObjects);

  const object = value as Record<string, unknown>;
  const type = object["@type"];
  const types = Array.isArray(type) ? type.map(String) : [String(type ?? "")];
  const hasRecipeShape = types.some((t) => t.toLowerCase() === "recipe") ||
    Boolean(object.recipeIngredient || object.ingredients || object.recipeInstructions || object.instructions);

  const nested = Object.values(object).flatMap(findRecipeObjects);
  return hasRecipeShape ? [object, ...nested] : nested;
}

function parseJson(text: string, fileName: string) {
  const parsed = JSON.parse(text) as JsonValue;
  const roots = Array.isArray(parsed) ? parsed : [parsed];
  const graphRecipes = roots.flatMap((root) => {
    if (root && typeof root === "object" && !Array.isArray(root) && Array.isArray((root as Record<string, unknown>)["@graph"])) {
      return findRecipeObjects((root as Record<string, unknown>)["@graph"]);
    }
    return findRecipeObjects(root);
  });

  return graphRecipes
    .map((recipe, index) => normalizeRecipe(recipe, "JSON", fileName, index))
    .filter((recipe): recipe is NormalizedImportedRecipe => Boolean(recipe));
}

function parseHtml(text: string, fileName: string) {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const jsonRecipes = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
    .flatMap((script) => {
      try {
        return parseJson(script.textContent ?? "", fileName);
      } catch {
        return [];
      }
    });
  if (jsonRecipes.length) return jsonRecipes.map((recipe) => ({ ...recipe, import_source: "HTML JSON-LD" }));

  const title = compact(doc.querySelector("h1")?.textContent) || compact(doc.querySelector("title")?.textContent);
  const bodyText = compact(doc.body?.innerText ?? "");
  const parsed = parsePastedRecipe([title, bodyText].filter(Boolean).join("\n\n"));
  if (!parsed.ingredients.length && !parsed.instructions.length) return [];

  return [{
    id: recipeId(fileName, 0),
    title: parsed.title || title || fileName.replace(/\.[^.]+$/, ""),
    prep_minutes: parsed.prep_minutes,
    cook_minutes: parsed.cook_minutes,
    servings: parsed.servings,
    tags: [],
    ingredients: parsed.ingredients,
    instructions: parsed.instructions,
    nutrition: {},
    import_source: "HTML",
    import_metadata: { fileName },
    warnings: parsed.warnings,
  }];
}

function parseText(text: string, fileName: string) {
  const parsed = parsePastedRecipe(text);
  if (!parsed.ingredients.length && !parsed.instructions.length) return [];
  return [{
    id: recipeId(fileName, 0),
    title: parsed.title || fileName.replace(/\.[^.]+$/, ""),
    prep_minutes: parsed.prep_minutes,
    cook_minutes: parsed.cook_minutes,
    servings: parsed.servings,
    tags: [],
    ingredients: parsed.ingredients,
    instructions: parsed.instructions,
    nutrition: {},
    import_source: "Text",
    import_metadata: { fileName },
    warnings: parsed.warnings,
  }];
}

function parseCsv(text: string, fileName: string) {
  const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
  return result.data
    .map((row, index) => normalizeRecipe(row, "CSV", fileName, index))
    .filter((recipe): recipe is NormalizedImportedRecipe => Boolean(recipe));
}

async function parseSingleFile(file: File): Promise<NormalizedImportedRecipe[]> {
  const fileName = file.name;
  const text = await file.text();
  if (fileName.endsWith(".csv")) return parseCsv(text, fileName);
  if (fileName.endsWith(".txt")) return parseText(text, fileName);
  if (HTML_EXTENSIONS.test(fileName) || file.type === "text/html") return parseHtml(text, fileName);
  if (fileName.endsWith(".json") || fileName.endsWith(".paprikarecipes") || file.type.includes("json")) return parseJson(text, fileName);
  return [];
}

async function parseZip(file: File): Promise<RecipeImportResult> {
  const zip = await JSZip.loadAsync(file);
  const recipes: NormalizedImportedRecipe[] = [];
  const skippedFiles: RecipeImportSkippedFile[] = [];
  const imageByBaseName = new Map<string, ImportRecipeImage>();

  await Promise.all(Object.values(zip.files).map(async (entry) => {
    if (entry.dir || !IMAGE_EXTENSIONS.test(entry.name)) return;
    const blob = await entry.async("blob");
    const imageFile = new File([blob], entry.name.split("/").pop() ?? entry.name, { type: blob.type || "image/jpeg" });
    imageByBaseName.set(entry.name.replace(/^.*\/|(\.[^.]+$)/g, ""), {
      file: imageFile,
      previewUrl: URL.createObjectURL(imageFile),
    });
  }));

  for (const entry of Object.values(zip.files)) {
    if (entry.dir || IMAGE_EXTENSIONS.test(entry.name)) continue;
    const lower = entry.name.toLowerCase();
    if (!/\.(html?|json|txt|csv)$/i.test(lower)) {
      skippedFiles.push({ fileName: entry.name, reason: "Unsupported file inside ZIP." });
      continue;
    }

    const text = await entry.async("text");
    let parsed: NormalizedImportedRecipe[] = [];
    try {
      if (lower.endsWith(".csv")) parsed = parseCsv(text, entry.name);
      else if (lower.endsWith(".json")) parsed = parseJson(text, entry.name);
      else if (HTML_EXTENSIONS.test(lower)) parsed = parseHtml(text, entry.name);
      else parsed = parseText(text, entry.name);
    } catch (error) {
      skippedFiles.push({ fileName: entry.name, reason: error instanceof Error ? error.message : "Could not parse file." });
      continue;
    }

    const base = entry.name.replace(/^.*\/|(\.[^.]+$)/g, "");
    const image = imageByBaseName.get(base) ?? imageByBaseName.values().next().value;
    recipes.push(...parsed.map((recipe) => image && !recipe.image ? { ...recipe, image } : recipe));
  }

  return { recipes, skippedFiles, warnings: [] };
}

export async function importRecipeFiles(files: File[]): Promise<RecipeImportResult> {
  const recipes: NormalizedImportedRecipe[] = [];
  const skippedFiles: RecipeImportSkippedFile[] = [];

  for (const file of files) {
    try {
      if (/\.zip$/i.test(file.name) || file.type === "application/zip") {
        const result = await parseZip(file);
        recipes.push(...result.recipes);
        skippedFiles.push(...result.skippedFiles);
        continue;
      }

      const parsed = await parseSingleFile(file);
      if (parsed.length) recipes.push(...parsed);
      else skippedFiles.push({ fileName: file.name, reason: "No recipe could be detected." });
    } catch (error) {
      skippedFiles.push({ fileName: file.name, reason: error instanceof Error ? error.message : "Could not parse file." });
    }
  }

  return { recipes, skippedFiles, warnings: [] };
}
