import { type ImportedRecipe } from "@/lib/recipeImportSchema";

const MAX_IMPORT_BYTES = 700 * 1024;
const MAX_IMPORT_DIMENSION = 1800;
const MIN_IMPORT_DIMENSION = 1100;

export type { ImportedRecipe } from "@/lib/recipeImportSchema";

type OcrProgress = {
  status: string;
  progress: number;
};

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = dataUrl;
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read that image."));
    };
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number) {
  return canvas.toDataURL("image/jpeg", quality);
}

function byteSizeFromDataUrl(dataUrl: string) {
  const encoded = dataUrl.split(",")[1] ?? "";
  return Math.ceil((encoded.length * 3) / 4);
}

export async function prepareRecipeImportImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a photo of the recipe page.");
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);

  let maxDimension = MAX_IMPORT_DIMENSION;
  let quality = 0.82;
  let bestDataUrl = sourceDataUrl;

  while (maxDimension >= MIN_IMPORT_DIMENSION) {
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare that image.");
    context.drawImage(image, 0, 0, width, height);

    quality = 0.82;
    while (quality >= 0.58) {
      const dataUrl = canvasToDataUrl(canvas, quality);
      bestDataUrl = dataUrl;
      if (byteSizeFromDataUrl(dataUrl) <= MAX_IMPORT_BYTES) return dataUrl;
      quality -= 0.08;
    }

    maxDimension -= 250;
  }

  if (byteSizeFromDataUrl(bestDataUrl) > MAX_IMPORT_BYTES * 1.3) {
    throw new Error("That photo is too large to import. Try cropping closer to the recipe text.");
  }

  return bestDataUrl;
}

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

function normalizeOcrText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split("\n")
    .map(cleanLine)
    .filter(Boolean);
}

function isSectionHeading(line: string, headings: string[]) {
  const normalized = line.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  return headings.some((heading) => normalized === heading || normalized.startsWith(`${heading} `));
}

function isStepLine(line: string) {
  const cleaned = line.trim();
  if (/^(step\s+\d+|\d+[\).:-])\s+/i.test(cleaned) || /^\d{1,2}$/.test(cleaned)) return true;
  return /^(bake|beat|blend|boil|combine|cook|cover|fold|heat|mix|place|pour|preheat|reduce|remove|serve|simmer|stir|whisk)\b/i.test(cleaned);
}

function hasInstructionMarker(line: string) {
  return /^(step\s+\d+|\d{1,2}[\).:-])\s+/i.test(line.trim());
}

function isStandaloneInstructionMarker(line: string) {
  return /^\d{1,2}$/.test(line.trim());
}

function stripInstructionMarker(line: string) {
  return line.replace(/^(?:step\s+\d+|\d{1,2}[\).:-])\s*/i, "").trim();
}

function stripIngredientMarker(line: string) {
  return line.replace(/^[-•*]\s*/, "").trim();
}

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

function normalizeQuantity(quantity: string) {
  return quantity
    .replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (fraction) => FRACTION_GLYPHS[fraction] ?? fraction)
    .replace(/\s*-\s*/g, "-")
    .trim();
}

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

function parseIngredientLine(line: string): ImportedRecipe["ingredients"][number] {
  const cleaned = stripIngredientMarker(line);
  const match = cleaned.match(
    /^((?:\d+\s+)?(?:\d+(?:[./]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*[-–]\s*(?:\d+(?:[./]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]))?|[¼½¾⅓⅔⅛⅜⅝⅞]|(?:\d+\s*)?[¼½¾⅓⅔⅛⅜⅝⅞]|one|two|three|four|five|six|seven|eight|nine|ten)\s+([a-zA-Z]+\.?)?\s*(.*)$/
  );

  if (!match?.[1]) {
    return { quantity: "", unit: "", item: cleaned, note: "" };
  }

  const possibleUnit = match[2]?.replace(/\.$/, "") ?? "";
  const item = match[3]?.trim() ?? "";

  if (!possibleUnit || !COMMON_UNITS.has(possibleUnit.toLowerCase())) {
    return {
      quantity: normalizeQuantity(match[1]),
      unit: "",
      item: [possibleUnit, item].filter(Boolean).join(" ").trim() || cleaned,
      note: "",
    };
  }

  return {
    quantity: normalizeQuantity(match[1]),
    unit: possibleUnit,
    item: item || cleaned,
    note: "",
  };
}

function joinInstructionLines(lines: string[]) {
  const cleanedLines = lines.map(cleanLine).filter(Boolean);
  const markerCount = cleanedLines.filter((line) => hasInstructionMarker(line) || isStandaloneInstructionMarker(line)).length;
  const steps: string[] = [];

  if (markerCount >= 2) {
    let current = "";
    let pendingStandaloneMarker = false;

    for (const line of cleanedLines) {
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
    return steps;
  }

  const sentenceSteps: string[] = [];
  let current = "";

  for (const line of cleanedLines) {
    current = current ? `${current} ${line}` : line;

    if (/[.!?]$/.test(line) && current.split(/\s+/).length >= 6) {
      sentenceSteps.push(current.trim());
      current = "";
    }
  }

  if (current) sentenceSteps.push(current.trim());
  return sentenceSteps;
}

function looksLikeMetadata(line: string) {
  return /^(prep|cook|total|active|inactive|serves|servings|yield|makes|ready in)\b/i.test(line);
}

function hasQuantityCue(line: string) {
  return /^[-•*]?\s*(?:(?:\d+\s+)?\d+(?:[./]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(line);
}

function hasUnitCue(line: string) {
  return /\b(tsp|teaspoons?|tbsp|tablespoons?|cups?|ounces?|oz|pounds?|lbs?|grams?|g|kg|ml|liters?|pinch|cloves?|cans?|packages?|sticks?)\b/i.test(line);
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

function findIngredientRunStart(lines: string[]) {
  for (let index = 1; index < lines.length; index += 1) {
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
    ["instructions", "directions", "method", "preparation", "procedure"]
  );
  if (headingIndex >= 0) return startAfter + headingIndex;

  return lines.findIndex((line, index) => index > startAfter && isStepLine(line) && !looksLikeIngredient(line));
}

function findSectionIndex(lines: string[], headings: string[]) {
  return lines.findIndex((line) => isSectionHeading(line, headings));
}

function splitRecipeLines(lines: string[]) {
  const ingredientIndex = findSectionIndex(lines, ["ingredients", "ingredient"]);
  const instructionIndex = findSectionIndex(lines, [
    "instructions",
    "directions",
    "method",
    "preparation",
    "procedure",
  ]);

  const title = lines[0] ?? "Imported recipe";

  if (ingredientIndex >= 0 && instructionIndex > ingredientIndex) {
    return {
      title,
      descriptionLines: lines.slice(1, ingredientIndex).filter((line) => !looksLikeMetadata(line)),
      ingredientLines: lines.slice(ingredientIndex + 1, instructionIndex),
      instructionLines: lines.slice(instructionIndex + 1),
      hasIngredientHeading: true,
    };
  }

  const ingredientStart = ingredientIndex >= 0 ? ingredientIndex + 1 : findIngredientRunStart(lines);
  const instructionStart = ingredientStart >= 0 ? findInstructionStart(lines, ingredientStart) : -1;
  if (ingredientStart > 0 && instructionStart > ingredientStart) {
    return {
      title,
      descriptionLines: lines.slice(1, ingredientIndex >= 0 ? ingredientIndex : ingredientStart).filter((line) => !looksLikeMetadata(line)),
      ingredientLines: lines.slice(ingredientStart, instructionStart),
      instructionLines: lines.slice(instructionStart + (isSectionHeading(lines[instructionStart], [
        "instructions",
        "directions",
        "method",
        "preparation",
        "procedure",
      ]) ? 1 : 0)),
      hasIngredientHeading: ingredientIndex >= 0,
    };
  }

  const midpoint = Math.max(2, Math.floor(lines.length / 2));
  return {
    title,
    descriptionLines: lines.slice(1, midpoint).filter((line) => !looksLikeMetadata(line) && looksLikeProse(line)),
    ingredientLines: lines.slice(1, midpoint),
    instructionLines: lines.slice(midpoint),
    hasIngredientHeading: false,
  };
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

export function parseRecipeText(text: string): ImportedRecipe {
  const lines = normalizeOcrText(text);
  const warnings: string[] = [];

  if (lines.length < 4) {
    warnings.push("Very little text was detected. Try a brighter, closer photo.");
  }

  const { title, descriptionLines, ingredientLines, instructionLines, hasIngredientHeading } = splitRecipeLines(lines);
  const ingredients = ingredientLines
    .filter((line) => !isSectionHeading(line, ["ingredients", "ingredient"]))
    .filter((line) => !looksLikeMetadata(line))
    .filter((line) => looksLikeIngredient(line, hasIngredientHeading))
    .map(parseIngredientLine)
    .filter((ingredient) => ingredient.item);

  const instructions = joinInstructionLines(
    instructionLines
      .filter((line) => !isSectionHeading(line, ["instructions", "directions", "method", "preparation"]))
      .filter((line) => !looksLikeMetadata(line))
  ).map((body) => ({ body }));

  if (!ingredients.length) warnings.push("No clear ingredient list was found.");
  if (!instructions.length) warnings.push("No clear steps were found.");
  if (title === "Imported recipe") warnings.push("No clear title was found.");

  return {
    title: title.slice(0, 200),
    description: descriptionLines.join(" ").slice(0, 500),
    source_name: "",
    story: "",
    prep_minutes: parseMinutes(lines, ["prep", "preparation"]),
    cook_minutes: parseMinutes(lines, ["cook", "bake", "baking"]),
    servings: parseServings(lines),
    category: "",
    tags: [],
    ingredients: ingredients.length ? ingredients.slice(0, 80) : [{ quantity: "", unit: "", item: "", note: "" }],
    instructions: instructions.length ? instructions.slice(0, 80) : [{ body: "" }],
    confidence: warnings.length ? "medium" : "high",
    warnings,
  };
}

export async function importRecipeWithLocalOcr(
  imageDataUrl: string,
  onProgress?: (progress: OcrProgress) => void
) {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      onProgress?.({
        status: message.status,
        progress: Math.round((message.progress ?? 0) * 100),
      });
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: "1",
    });
    const result = await worker.recognize(imageDataUrl);
    const text = result.data.text.trim();
    if (!text) {
      throw new Error("No readable recipe text was found. Try a brighter, closer photo.");
    }
    return parseRecipeText(text);
  } finally {
    await worker.terminate();
  }
}
