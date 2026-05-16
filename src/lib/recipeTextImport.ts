import type { IngredientInput, InstructionInput } from "@/lib/validators/recipe";

const FRACTION_GLYPHS: Record<string, string> = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

const COMMON_UNITS = new Set([
  "t",
  "tsp",
  "teaspoon",
  "teaspoons",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "c",
  "cup",
  "cups",
  "pt",
  "pint",
  "pints",
  "qt",
  "quart",
  "quarts",
  "gal",
  "gallon",
  "gallons",
  "fl",
  "fluid",
  "oz",
  "ounce",
  "ounces",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "g",
  "gram",
  "grams",
  "kg",
  "ml",
  "l",
  "liter",
  "liters",
  "pinch",
  "pinches",
  "dash",
  "dashes",
  "clove",
  "cloves",
  "can",
  "cans",
  "package",
  "packages",
  "pkg",
  "stick",
  "sticks",
  "slice",
  "slices",
  "large",
  "medium",
  "small",
]);

export type PastedRecipeConfidence = "high" | "medium" | "low";

export type PastedRecipeParseResult = {
  title?: string;
  prep_minutes?: number;
  cook_minutes?: number;
  servings?: number;
  ingredients: IngredientInput[];
  instructions: InstructionInput[];
  warnings: string[];
  confidence: PastedRecipeConfidence;
};

function cleanLine(line: string) {
  return line
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[⁄∕]/g, "/")
    .replace(/\b([1-9])\s*[Il|]\s*([2-9])\b/g, "$1/$2")
    .replace(/^\s*%\s+/, "1/2 ")
    .replace(/^\s*¥\s+/, "1/2 ")
    .replace(/^\s*%(\s*[a-zA-Z])/, "1/2$1")
    .replace(/^\s*¥(\s*[a-zA-Z])/, "1/2$1")
    .replace(/^\s*%/, "1/2")
    .replace(/^\s*¥/, "1/2")
    .replace(/\s+/g, " ")
    .trim();
}

function toCleanLines(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split("\n")
    .map(cleanLine)
    .filter(Boolean);
}

function normalizeQuantity(quantity: string) {
  return quantity
    .replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (fraction) => FRACTION_GLYPHS[fraction] ?? fraction)
    .replace(/\s*-\s*/g, "-")
    .trim();
}

function stripIngredientMarker(line: string) {
  return line.replace(/^[-•*]\s*/, "").replace(/^\d{1,2}[\).:-]\s*/, "").trim();
}

function stripInstructionMarker(line: string) {
  return line.replace(/^(?:step\s+\d+|\d{1,2}[\).:-]|[-•*])\s*/i, "").trim();
}

function hasInstructionMarker(line: string) {
  return /^(step\s+\d+|\d{1,2}[\).:-]|[-•*])\s+/i.test(line.trim());
}

function isStandaloneInstructionMarker(line: string) {
  return /^\d{1,2}$/.test(line.trim());
}

function parseIngredientLine(line: string): IngredientInput {
  const cleaned = stripIngredientMarker(line);
  const noteMatch = cleaned.match(/^(.*?)\s+\(([^)]+)\)\s*$/);
  const withoutParentheticalNote = noteMatch?.[1]?.trim() ?? cleaned;
  const note = noteMatch?.[2]?.trim() ?? "";
  const match = withoutParentheticalNote.match(
    /^((?:\d+\s+)?(?:\d+(?:[./]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*[-–]\s*(?:\d+(?:[./]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]))?|[¼½¾⅓⅔⅛⅜⅝⅞]|(?:\d+\s*)?[¼½¾⅓⅔⅛⅜⅝⅞]|one|two|three|four|five|six|seven|eight|nine|ten)\s+([a-zA-Z]+\.?)?\s*(.*)$/
  );

  if (!match?.[1]) return { quantity: "", unit: "", item: cleaned, note };

  const possibleUnit = match[2]?.replace(/\.$/, "") ?? "";
  const item = match[3]?.trim() ?? "";

  if (!possibleUnit || !COMMON_UNITS.has(possibleUnit.toLowerCase())) {
    return {
      quantity: normalizeQuantity(match[1]),
      unit: "",
      item: [possibleUnit, item].filter(Boolean).join(" ").trim() || cleaned,
      note,
    };
  }

  return {
    quantity: normalizeQuantity(match[1]),
    unit: possibleUnit,
    item: item || cleaned,
    note,
  };
}

function splitParagraphSteps(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((step) => step.trim())
    .filter((step) => step.split(/\s+/).length >= 3);
}

function isSectionHeading(line: string, headings: string[]) {
  const normalized = line.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  return headings.some((heading) => normalized === heading || normalized.startsWith(`${heading} `));
}

function looksLikeMetadata(line: string) {
  return /^(prep|cook|total|active|inactive|serves|servings|yield|makes|ready in)\b/i.test(line);
}

function looksLikeTimeOrServingMetadata(line: string) {
  return /^(prep|preparation|cook|bake|baking|total|active|inactive|serves|servings|yield|makes|ready in)\b/i.test(line);
}

function hasQuantityCue(line: string) {
  return /^[-•*]?\s*(?:(?:\d+\s+)?\d+(?:[./]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(line);
}

function hasUnitCue(line: string) {
  return /\b(tsp|teaspoons?|tbsp|tablespoons?|cups?|ounces?|oz|pounds?|lbs?|grams?|g|kg|ml|liters?|pinch|cloves?|cans?|packages?|sticks?)\b/i.test(line);
}

function isStepLine(line: string) {
  const cleaned = line.trim();
  if (/^(step\s+\d+|\d+[\).:-])\s+/i.test(cleaned) || /^\d{1,2}$/.test(cleaned)) return true;
  return /^(bake|beat|blend|boil|combine|cook|cover|fold|heat|mix|place|pour|preheat|reduce|remove|serve|simmer|stir|whisk)\b/i.test(cleaned);
}

function looksLikeInstruction(line: string) {
  return isStepLine(line) || /(\buntil\b|\bminutes?\b|\bhours?\b|degrees?|°|oven|skillet|saucepan|bowl|pan)\b/i.test(line);
}

function looksLikeProse(line: string) {
  const words = line.split(/\s+/).filter(Boolean).length;
  return (
    words > 13 ||
    /[.!?]$/.test(line) ||
    /\b(this|these|you|your|we|our|perfect|favorite|delicious|classic|simple|easy)\b/i.test(line)
  );
}

function ingredientScore(line: string) {
  const cleaned = stripIngredientMarker(line);
  if (!cleaned || looksLikeMetadata(cleaned) || isSectionHeading(cleaned, ["notes", "note"])) return 0;
  if (looksLikeInstruction(cleaned)) return 0;

  let score = 0;
  if (hasQuantityCue(line)) score += 3;
  if (hasUnitCue(line)) score += 2;
  if (/^[-•*]\s*/.test(line)) score += 1;
  if (/,?\s*(chopped|diced|minced|sliced|softened|melted|divided|optional|to taste)$/i.test(cleaned)) score += 1;
  if (cleaned.split(/\s+/).length <= 8) score += 1;
  if (looksLikeProse(cleaned)) score -= 3;

  return Math.max(0, score);
}

function looksLikeIngredient(line: string, fromExplicitSection = false) {
  const score = ingredientScore(line);
  return fromExplicitSection ? score >= 1 && !looksLikeProse(line) : score >= 3;
}

function findSectionIndex(lines: string[], headings: string[]) {
  return lines.findIndex((line) => isSectionHeading(line, headings));
}

function findIngredientRunStart(lines: string[]) {
  for (let index = 0; index < lines.length; index += 1) {
    if (!looksLikeIngredient(lines[index])) continue;

    const nextFew = lines.slice(index, index + 5);
    const ingredientLikeCount = nextFew.filter((line) => looksLikeIngredient(line)).length;
    if (ingredientLikeCount >= 2) return index;
  }

  return -1;
}

function findInstructionStart(lines: string[], startAfter: number) {
  const headingIndex = findSectionIndex(
    lines.slice(startAfter),
    ["instructions", "directions", "method", "preparation", "procedure", "steps"]
  );
  if (headingIndex >= 0) return startAfter + headingIndex;

  return lines.findIndex((line, index) => index > startAfter && isStepLine(line) && !looksLikeIngredient(line));
}

function splitPastedRecipeLines(lines: string[]) {
  const ingredientIndex = findSectionIndex(lines, ["ingredients", "ingredient"]);
  const instructionIndex = findSectionIndex(lines, [
    "instructions",
    "directions",
    "method",
    "preparation",
    "procedure",
    "steps",
  ]);

  if (ingredientIndex >= 0 && instructionIndex > ingredientIndex) {
    return {
      leadingLines: lines.slice(0, ingredientIndex),
      ingredientLines: lines.slice(ingredientIndex + 1, instructionIndex),
      instructionLines: lines.slice(instructionIndex + 1),
      hasIngredientHeading: true,
      confidence: "high" as const,
    };
  }

  const ingredientStart = ingredientIndex >= 0 ? ingredientIndex + 1 : findIngredientRunStart(lines);
  const instructionStart = ingredientStart >= 0 ? findInstructionStart(lines, ingredientStart) : -1;

  if (ingredientStart >= 0 && instructionStart > ingredientStart) {
    return {
      leadingLines: lines.slice(0, ingredientStart),
      ingredientLines: lines.slice(ingredientStart, instructionStart),
      instructionLines: lines.slice(instructionStart + (isSectionHeading(lines[instructionStart], [
        "instructions",
        "directions",
        "method",
        "preparation",
        "procedure",
        "steps",
      ]) ? 1 : 0)),
      hasIngredientHeading: ingredientIndex >= 0,
      confidence: ingredientIndex >= 0 ? "high" as const : "medium" as const,
    };
  }

  return {
    leadingLines: [],
    ingredientLines: [],
    instructionLines: [],
    hasIngredientHeading: false,
    confidence: "low" as const,
  };
}

function parsePastedTitle(leadingLines: string[]) {
  for (const line of leadingLines) {
    const explicitTitle = line.match(/^(?:title|recipe(?:\s+name)?)\s*[:\-]\s*(.+)$/i)?.[1]?.trim();
    if (explicitTitle) return explicitTitle.slice(0, 200);

    if (
      looksLikeTimeOrServingMetadata(line) ||
      isSectionHeading(line, ["ingredients", "ingredient", "instructions", "directions", "method", "preparation", "procedure", "steps"]) ||
      looksLikeIngredient(line) ||
      looksLikeInstruction(line)
    ) {
      continue;
    }

    const wordCount = line.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 1 && wordCount <= 14) return line.slice(0, 200);
  }

  return "";
}

function parseMinutes(lines: string[], labels: string[]) {
  const labelPattern = labels.join("|");
  const compactText = lines.join(" ");
  const patterns = [
    new RegExp(`\\b(?:${labelPattern})\\s*(?:time)?\\s*[:\\-]?\\s*(\\d+)\\s*(min|mins|minute|minutes|hr|hrs|hour|hours)?\\b`, "i"),
    new RegExp(`\\b(\\d+)\\s*(min|mins|minute|minutes|hr|hrs|hour|hours)\\s*(?:${labelPattern})\\b`, "i"),
  ];

  const match = patterns.map((pattern) => compactText.match(pattern)).find(Boolean);
  if (!match) return 0;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 0 || value > 10080) return 0;

  const unit = match[2]?.toLowerCase() ?? "";
  return unit.startsWith("h") ? value * 60 : value;
}

function parseServings(lines: string[]) {
  const patterns = [
    /\b(?:makes|make|yields?|serves|servings?)\s*[:\-]?\s*(\d{1,3})\b/i,
    /\b(\d{1,3})\s*(?:servings?|pieces?|bars?|cookies?|muffins?|slices?)\b/i,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match) continue;
      const value = Number(match[1]);
      if (value > 0 && value <= 100) return value;
    }
  }

  return 0;
}

export function parsePastedIngredients(text: string): IngredientInput[] {
  return toCleanLines(text)
    .filter((line) => !/^(ingredients?|notes?)$/i.test(line))
    .map(parseIngredientLine)
    .filter((ingredient) => ingredient.item?.trim())
    .slice(0, 80);
}

export function parsePastedInstructions(text: string): InstructionInput[] {
  const lines = toCleanLines(text).filter(
    (line) => !/^(instructions?|directions?|method|preparation|steps?)$/i.test(line)
  );
  const markerCount = lines.filter((line) => hasInstructionMarker(line) || isStandaloneInstructionMarker(line)).length;
  const steps: string[] = [];

  if (markerCount >= 2) {
    let current = "";
    let pendingStandaloneMarker = false;

    for (const line of lines) {
      if (isStandaloneInstructionMarker(line)) {
        if (current) steps.push(current.trim());
        current = "";
        pendingStandaloneMarker = true;
        continue;
      }

      if (hasInstructionMarker(line)) {
        if (current) steps.push(current.trim());
        current = stripInstructionMarker(line);
        pendingStandaloneMarker = false;
        continue;
      }

      if (pendingStandaloneMarker) {
        if (current) steps.push(current.trim());
        current = line;
        pendingStandaloneMarker = false;
        continue;
      }

      current = current ? `${current} ${line}` : line;
    }

    if (current) steps.push(current.trim());
  } else if (lines.length > 1) {
    steps.push(...lines.map(stripInstructionMarker));
  } else {
    steps.push(...splitParagraphSteps(lines[0] ?? ""));
  }

  return steps
    .map((body) => ({ body: body.trim() }))
    .filter((instruction) => instruction.body)
    .slice(0, 80);
}

export function parsePastedRecipe(text: string): PastedRecipeParseResult {
  const lines = toCleanLines(text);
  const warnings: string[] = [];

  if (lines.length < 4) {
    warnings.push("Paste a full recipe with ingredients and steps.");
  }

  const { leadingLines, ingredientLines, instructionLines, hasIngredientHeading, confidence } = splitPastedRecipeLines(lines);
  const title = parsePastedTitle(leadingLines);
  const prepMinutes = parseMinutes(lines, ["prep", "preparation"]);
  const cookMinutes = parseMinutes(lines, ["cook", "bake", "baking"]);
  const servings = parseServings(lines);
  const ingredients = ingredientLines
    .filter((line) => !isSectionHeading(line, ["ingredients", "ingredient"]))
    .filter((line) => !looksLikeMetadata(line))
    .filter((line) => looksLikeIngredient(line, hasIngredientHeading))
    .map(parseIngredientLine)
    .filter((ingredient) => ingredient.item?.trim())
    .slice(0, 80);

  const instructions = parsePastedInstructions(
    instructionLines
      .filter((line) => !isSectionHeading(line, ["instructions", "directions", "method", "preparation", "procedure", "steps"]))
      .filter((line) => !looksLikeMetadata(line))
      .join("\n")
  );

  if (confidence === "low") {
    warnings.push("We could not confidently separate ingredients from steps. Add Ingredients and Instructions headings and try again.");
  } else if (confidence === "medium") {
    warnings.push("Review the generated ingredients and steps before saving.");
  }

  if (!ingredients.length) warnings.push("No clear ingredients were found.");
  if (!instructions.length) warnings.push("No clear steps were found.");

  return {
    title: title || undefined,
    prep_minutes: prepMinutes || undefined,
    cook_minutes: cookMinutes || undefined,
    servings: servings || undefined,
    ingredients,
    instructions,
    warnings,
    confidence: !ingredients.length || !instructions.length ? "low" : confidence,
  };
}
