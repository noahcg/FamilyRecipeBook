import { type ImportedRecipe } from "@/lib/recipeImportSchema";

const MAX_IMPORT_BYTES = 700 * 1024;
const MAX_IMPORT_DIMENSION = 3000;
const MIN_IMPORT_DIMENSION = 1100;

export type { ImportedRecipe } from "@/lib/recipeImportSchema";

type OcrProgress = {
  status: string;
  progress: number;
};

type OcrBlock = {
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
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
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return (encoded.length * 3) / 4 - padding;
}

export async function prepareRecipeImportImage(file: File, mode: "local" | "openai" = "openai", pageCount = 4) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a photo of the recipe page.");
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const maxBytes = Math.floor((MAX_IMPORT_BYTES * 4) / Math.max(1, Math.min(4, pageCount)));

  // Local OCR has no upload limit. Avoid discarding fine print and fractions
  // merely to fit the separate AI request budget.
  if (mode === "local") {
    const scale = Math.min(1, 3000 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare that image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  }

  // Spend the total request budget on the selected pages. A single dense page
  // should not lose detail to a byte allowance reserved for four pages.
  if (/^image\/(jpeg|png|webp)$/.test(file.type)
    && Math.max(image.width, image.height) <= MAX_IMPORT_DIMENSION
    && byteSizeFromDataUrl(sourceDataUrl) <= maxBytes) {
    return sourceDataUrl;
  }

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
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    quality = 0.82;
    while (quality >= 0.58) {
      const dataUrl = canvasToDataUrl(canvas, quality);
      bestDataUrl = dataUrl;
      if (byteSizeFromDataUrl(dataUrl) <= maxBytes) return dataUrl;
      quality -= 0.08;
    }

    maxDimension -= 250;
  }

  if (byteSizeFromDataUrl(bestDataUrl) > maxBytes) {
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

function isLikelyRecipeTitleBlock(block: OcrBlock) {
  const firstLine = block.text.trim().split("\n")[0]?.trim() ?? "";
  const letters = firstLine.match(/[a-z]/gi) ?? [];
  const uppercaseLetters = firstLine.match(/[A-Z]/g) ?? [];
  const wordCount = firstLine.split(/\s+/).filter(Boolean).length;

  return (
    wordCount >= 1 &&
    wordCount <= 7 &&
    letters.length >= 4 &&
    uppercaseLetters.length / letters.length >= 0.8
  );
}

function recipeTitleFromBlock(block: OcrBlock) {
  const text = block.text.trim().replace(/\s+/g, " ");
  // Cookbook title blocks often include a parenthetical image caption and,
  // after OCR, the opening description sentence. Keep the all-caps title only.
  const uppercaseTitle = text.match(/^([A-Z0-9][A-Z0-9 '&.-]*(?:\s+[A-Z0-9][A-Z0-9 '&.-]*)*)/);
  return (uppercaseTitle?.[1] ?? text.split(/\s*\(/)[0] ?? text).trim();
}

/**
 * Split only spreads containing two independently titled recipes. This is
 * intentionally stricter than detecting two text columns: a recipe such as
 * Brunch Casserole has one centered title with ingredients and directions in
 * columns and must remain a single import.
 */
function splitIndependentlyTitledRecipeColumns(blocks: OcrBlock[] | null) {
  if (!blocks?.length) return null;

  const readableBlocks = blocks
    .map((block) => ({ ...block, text: block.text.trim() }))
    .filter((block) => block.text && block.bbox.x1 > block.bbox.x0 && block.bbox.y1 > block.bbox.y0);
  if (readableBlocks.length < 4) return null;

  const leftEdge = Math.min(...readableBlocks.map((block) => block.bbox.x0));
  const rightEdge = Math.max(...readableBlocks.map((block) => block.bbox.x1));
  const topEdge = Math.min(...readableBlocks.map((block) => block.bbox.y0));
  const bottomEdge = Math.max(...readableBlocks.map((block) => block.bbox.y1));
  const pageWidth = rightEdge - leftEdge;
  const pageHeight = bottomEdge - topEdge;
  if (pageWidth <= 0 || pageHeight <= 0) return null;

  const midpoint = leftEdge + pageWidth / 2;
  const titleLimit = topEdge + pageHeight * 0.3;
  const titleBlocks = readableBlocks.filter(
    (block) => block.bbox.y0 <= titleLimit && isLikelyRecipeTitleBlock(block)
  );
  const leftTitle = titleBlocks
    .filter((block) => (block.bbox.x0 + block.bbox.x1) / 2 < midpoint)
    .sort((a, b) => a.bbox.y0 - b.bbox.y0)[0];
  const rightTitle = titleBlocks
    .filter((block) => (block.bbox.x0 + block.bbox.x1) / 2 > midpoint)
    .sort((a, b) => a.bbox.y0 - b.bbox.y0)[0];

  if (!leftTitle || !rightTitle || Math.abs(leftTitle.bbox.y0 - rightTitle.bbox.y0) > pageHeight * 0.08) {
    return null;
  }

  const sortTopToBottom = (a: OcrBlock, b: OcrBlock) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0;
  const titleTop = Math.min(leftTitle.bbox.y0, rightTitle.bbox.y0) - 8;
  const leftText = readableBlocks
    .filter((block) => block.bbox.y0 >= titleTop && (block.bbox.x0 + block.bbox.x1) / 2 < midpoint)
    .sort(sortTopToBottom)
    .map((block) => (block === leftTitle ? recipeTitleFromBlock(block) : block.text))
    .join("\n\n");
  const rightText = readableBlocks
    .filter((block) => block.bbox.y0 >= titleTop && (block.bbox.x0 + block.bbox.x1) / 2 > midpoint)
    .sort(sortTopToBottom)
    .map((block) => (block === rightTitle ? recipeTitleFromBlock(block) : block.text))
    .join("\n\n");

  return leftText.length >= 100 && rightText.length >= 100 ? [leftText, rightText] : null;
}

function isSectionHeading(line: string, headings: string[]) {
  const normalized = line.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  return headings.some((heading) => normalized === heading || normalized.startsWith(`${heading} `));
}

function isStepLine(line: string) {
  const cleaned = line.trim();
  if (/^(step\s+\d+|\d+[\).:-])\s+/i.test(cleaned) || isStandaloneInstructionMarker(cleaned)) return true;
  return /^(add|bake|beat|blend|boil|bring|chill|combine|cook|cover|dissolve|fold|heat|mix|place|pour|preheat|reduce|remove|serve|simmer|stir|whisk)\b/i.test(cleaned);
}

function hasInstructionMarker(line: string) {
  return /^(step\s+\d+|\d{1,2}[\).:-])\s+/i.test(line.trim());
}

function isStandaloneInstructionMarker(line: string) {
  // Tesseract commonly puts a list number and its punctuation on its own line
  // before the instruction paragraph ("1." rather than "1. Mix …").
  return /^\d{1,2}[.)]?$/.test(line.trim());
}

function stripInstructionMarker(line: string) {
  return line.replace(/^(?:step\s+\d+|\d{1,2}[\).:-])\s*/i, "").trim();
}

function normalizeBareInstructionNumbers(lines: string[]) {
  // A bare number can also be an ingredient quantity. Require a sequence
  // beginning at 1 and instruction-like text before treating it as a step.
  const candidates = lines.flatMap((line, index) => {
    const match = line.match(/^(\d{1,2})\s+([A-Za-z].*)$/);
    if (!match) return [];
    const body = match[2];
    const firstWord = body.match(/^[A-Za-z]+/)?.[0].toLowerCase() ?? "";
    if (COMMON_UNITS.has(firstWord)) return [];
    const instructionOpening = /^(?:in|using|with|when|once|after|before|while|divide|roll|shape|transfer|let|set|sift|sprinkle|spread|knead|brush|arrange|drain|toss|turn|continue)\b/i.test(body);
    if (!isStepLine(body) && !instructionOpening) return [];
    return [{ index, number: Number(match[1]), body }];
  });
  const normalized = [...lines];
  for (let start = 0; start < candidates.length; start += 1) {
    if (candidates[start].number !== 1) continue;
    let end = start + 1;
    let hasConsecutivePair = false;
    while (end < candidates.length) {
      const gap = candidates[end].number - candidates[end - 1].number;
      if (gap < 1 || gap > 3) break;
      if (gap === 1) hasConsecutivePair = true;
      end += 1;
    }
    if (!hasConsecutivePair) continue;
    for (const candidate of candidates.slice(start, end)) {
      normalized[candidate.index] = `${candidate.number}. ${candidate.body}`;
    }
    start = end - 1;
  }
  return normalized;
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
    .replace(/(\d)([¼½¾⅓⅔⅛⅜⅝⅞])/g, "$1 $2")
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
  const quantity = "(?:\\d+\\s+\\d+/\\d+|\\d+\\s*[¼½¾⅓⅔⅛⅜⅝⅞]|\\d+(?:[./]\\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]|one|two|three|four|five|six|seven|eight|nine|ten)";
  const match = cleaned.match(new RegExp(`^(${quantity}(?:\\s*(?:[-–]|\\bto\\b)\\s*${quantity})?)\\s+([a-zA-Z]+\\.?)?\\s*(.*)$`, "i"));

  if (!match?.[1]) {
    return { quantity: "", unit: "", item: cleaned, note: "", group_label: null };
  }

  const possibleUnit = match[2]?.replace(/\.$/, "") ?? "";
  const item = match[3]?.trim() ?? "";

  if (!possibleUnit || !COMMON_UNITS.has(possibleUnit.toLowerCase())) {
    return {
      quantity: normalizeQuantity(match[1]),
      unit: "",
      item: [possibleUnit, item].filter(Boolean).join(" ").trim() || cleaned,
      note: "",
      group_label: null,
    };
  }

  return {
    quantity: normalizeQuantity(match[1]),
    unit: possibleUnit,
    item: item || cleaned,
    note: "",
    group_label: null,
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
  // Bare cooking verbs belong to the method, including "Bake 20 minutes".
  return /^(?:(?:prep|total|active|inactive)(?:\s+time)?\s*[:\-]?\s*\d|(?:prep|cook|bake|total|active|inactive)\s+time\b|(?:cook|bake)\s*:\s*\d|(?:serves|servings|yield|makes|ready in)\s*[:\-]?\s*\d)/i.test(line);
}

function hasQuantityCue(line: string) {
  return /^[-•*]?\s*(?:(?:\d+\s+)?\d+(?:[./]\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(line)
    || /^[-•*]?\s*[¼½¾⅓⅔⅛⅜⅝⅞]+(?=\s|$)/.test(line);
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
  return fromExplicitSection ? score >= 1 && (!looksLikeProse(line) || hasQuantityCue(line)) : score >= 3;
}

// Cookbook recipes commonly divide a single ingredient list into components.
// Keep this deliberately conservative so an ingredient such as "pasta sauce"
// is never mistaken for a heading.
const GROUP_HEADING_WORD = /^(sauce|topping|toppings|crust|filling|dough|batter|frosting|icing|glaze|dressing|marinade|garnish|streusel|crumble|assembly|base|cake|custard|coating|rub)$/i;

function isIngredientGroupHeading(line: string) {
  const cleaned = stripIngredientMarker(line).trim();
  if (!cleaned || hasQuantityCue(line) || hasUnitCue(line) || looksLikeInstruction(cleaned)) return false;
  if (cleaned.split(/\s+/).filter(Boolean).length > 6) return false;

  const withoutColon = cleaned.replace(/:\s*$/, "").trim();
  return /:\s*$/.test(cleaned) || /^for\s+the\b/i.test(cleaned) || GROUP_HEADING_WORD.test(withoutColon);
}

function cleanGroupLabel(line: string) {
  const label = stripIngredientMarker(line)
    .replace(/:\s*$/, "")
    .replace(/^for\s+the\s+/i, "")
    .trim()
    .slice(0, 100);
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "";
}

function buildGroupedIngredients(lines: string[], fromExplicitSection: boolean) {
  const groupedLines: { text: string; group: string | null }[] = [];
  let currentGroup: string | null = null;
  let canContinue = false;

  for (const line of lines) {
    if (isSectionHeading(line, ["ingredients", "ingredient"]) || looksLikeMetadata(line)) {
      canContinue = false;
      continue;
    }
    if (isIngredientGroupHeading(line)) {
      currentGroup = cleanGroupLabel(line) || null;
      canContinue = false;
      continue;
    }
    const previous = groupedLines.at(-1);
    const standaloneSeasoning = /^(?:salt|(?:freshly ground\s+)?(?:(?:black|white)\s+)?pepper)\b/i.test(line)
      || /\b(?:to taste|as needed|for serving|for greasing)\b/i.test(line);
    const continuation = canContinue && previous && !hasQuantityCue(line) && !/^[-•*]/.test(line)
      && !hasUnitCue(line) && !isStepLine(line) && !standaloneSeasoning
      && (/^[a-z(,]/.test(line) || /[,(-]$/.test(previous.text) || /\([^)]*$/.test(previous.text));
    if (continuation) {
      previous.text = `${previous.text} ${line}`;
      continue;
    }
    if (!looksLikeIngredient(line, fromExplicitSection)) {
      canContinue = false;
      continue;
    }
    groupedLines.push({ text: line, group: currentGroup });
    canContinue = true;
  }

  return groupedLines.map(({ text, group }) => ({ ...parseIngredientLine(text), group_label: group }))
    .filter((ingredient) => ingredient.item).slice(0, 80);
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

  const title = parseRecipeTitle(lines);
  const titleLineCount = recipeTitleLineCount(lines);

  if (ingredientIndex >= 0 && instructionIndex > ingredientIndex) {
    return {
      title,
      descriptionLines: lines.slice(titleLineCount, ingredientIndex).filter((line) => !looksLikeMetadata(line)),
      ingredientLines: lines.slice(ingredientIndex + 1, instructionIndex),
      instructionLines: lines.slice(instructionIndex + 1),
      hasIngredientHeading: true,
    };
  }

  let ingredientStart = ingredientIndex >= 0 ? ingredientIndex + 1 : findIngredientRunStart(lines);
  // The first quantified item follows a component heading in many cookbooks.
  // Include that heading so its group label is applied to the first items too.
  if (ingredientIndex < 0 && ingredientStart > 0 && isIngredientGroupHeading(lines[ingredientStart - 1])) {
    ingredientStart -= 1;
  }
  const instructionStart = ingredientStart >= 0 ? findInstructionStart(lines, ingredientStart) : -1;
  if (ingredientStart > 0 && instructionStart > ingredientStart) {
    return {
      title,
      descriptionLines: lines.slice(titleLineCount, ingredientIndex >= 0 ? ingredientIndex : ingredientStart).filter((line) => !looksLikeMetadata(line)),
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

  // A photographed ingredient page often has its method on the facing or next
  // page. Once an ingredient run is confidently found, it is safer to keep the
  // remainder than to discard half the page at an arbitrary midpoint.
  if (ingredientStart > 0) {
    return {
      title,
      descriptionLines: lines.slice(titleLineCount, ingredientIndex >= 0 ? ingredientIndex : ingredientStart).filter((line) => !looksLikeMetadata(line)),
      ingredientLines: lines.slice(ingredientStart),
      instructionLines: [],
      hasIngredientHeading: ingredientIndex >= 0,
    };
  }

  const midpoint = Math.max(2, Math.floor(lines.length / 2));
  return {
    title,
    descriptionLines: lines.slice(titleLineCount, midpoint).filter((line) => !looksLikeMetadata(line) && looksLikeProse(line)),
    ingredientLines: lines.slice(titleLineCount, midpoint),
    instructionLines: lines.slice(midpoint),
    hasIngredientHeading: false,
  };
}

function parseRecipeTitle(lines: string[]) {
  const titleLineCount = recipeTitleLineCount(lines);
  return lines.slice(0, titleLineCount).join(" ").trim().slice(0, 200) || "Imported recipe";
}

function recipeTitleLineCount(lines: string[]) {
  let count = 0;
  for (const line of lines) {
    if (
      looksLikeMetadata(line) ||
      isSectionHeading(line, ["ingredients", "ingredient", "instructions", "directions", "method", "preparation", "procedure"]) ||
      isIngredientGroupHeading(line) ||
      looksLikeIngredient(line) ||
      looksLikeProse(line)
    ) {
      break;
    }
    count += 1;
  }
  return count;
}

function parseMinutes(lines: string[], labels: string[]) {
  const labelPattern = labels.join("|");
  const compactText = lines.join(" ");
  const patterns = [
    new RegExp(`\\b(?:${labelPattern})\\s*(?:time)?\\s*[:\\-]?\\s*(\\d+)\\s*(minutes?|mins?|hours?|hrs?)?\\b(?:\\s*(?:and\\s*)?(\\d+)\\s*(?:minutes?|mins?)\\b)?`, "i"),
    new RegExp(`\\b(\\d+)\\s*(min|mins|minute|minutes|hr|hrs|hour|hours)\\s*(?:${labelPattern})\\b`, "i"),
  ];

  const match = patterns.map((pattern) => compactText.match(pattern)).find(Boolean);
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? "";
  return unit.startsWith("h") ? value * 60 + Number(match[3] ?? 0) : value;
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
  const lines = normalizeBareInstructionNumbers(normalizeOcrText(text));
  const warnings: string[] = [];

  if (lines.length < 4) {
    warnings.push("Very little text was detected. Try a brighter, closer photo.");
  }

  const { title, descriptionLines, ingredientLines, instructionLines, hasIngredientHeading } = splitRecipeLines(lines);
  const ingredients = buildGroupedIngredients(ingredientLines, hasIngredientHeading);

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
    ingredients: ingredients.length ? ingredients : [{ quantity: "", unit: "", item: "", note: "", group_label: null }],
    instructions: instructions.length ? instructions.slice(0, 80) : [{ body: "" }],
    confidence: !ingredients.length || !instructions.length ? "low" : "medium",
    warnings,
  };
}

export async function extractRecipeTextWithLocalOcr(
  imageDataUrls: string[],
  onProgress?: (progress: OcrProgress) => void
) {
  if (!imageDataUrls.length) {
    throw new Error("No recipe pages were provided for OCR.");
  }

  // Preserve each selected page exactly as supplied. Layout splitting is too
  // ambiguous for ingredient columns, centered titles, and recipe spreads.
  const ocrSections = imageDataUrls;
  let currentSection = 0;
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      const pageProgress = message.progress ?? 0;
      onProgress?.({
        status:
          ocrSections.length > 1
            ? `Reading recipe section ${currentSection + 1} of ${ocrSections.length}`
            : message.status,
        progress: Math.round(((currentSection + pageProgress) / ocrSections.length) * 100),
      });
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: "1",
    });
    const pages: string[] = [];
    for (const imageDataUrl of ocrSections) {
      const result = await worker.recognize(imageDataUrl, { rotateAuto: true }, { blocks: true });
      const text = result.data.text.trim();
      if (text) pages.push(text);
      currentSection += 1;
    }
    const text = pages.join("\n\n");
    if (!text) {
      throw new Error("No readable recipe text was found. Try a brighter, closer photo.");
    }
    return text;
  } finally {
    await worker.terminate();
  }
}

export async function importRecipeWithLocalOcr(
  imageDataUrls: string[],
  onProgress?: (progress: OcrProgress) => void
) {
  return parseRecipeText(await extractRecipeTextWithLocalOcr(imageDataUrls, onProgress));
}

export async function importRecipesWithLocalOcr(
  imageDataUrls: string[],
  onProgress?: (progress: OcrProgress) => void
) {
  if (imageDataUrls.length !== 1) {
    return [await importRecipeWithLocalOcr(imageDataUrls, onProgress)];
  }

  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      onProgress?.({ status: message.status, progress: Math.round((message.progress ?? 0) * 100) });
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: "1",
    });
    const result = await worker.recognize(imageDataUrls[0], { rotateAuto: true }, { blocks: true });
    if (!result.data.text.trim()) {
      throw new Error("No readable recipe text was found. Try a brighter, closer photo or read it with OpenAI.");
    }
    const splitColumns = splitIndependentlyTitledRecipeColumns(result.data.blocks);
    if (!splitColumns) {
      const { recipeTextFromOcrLayout } = await import("@/lib/recipeOcrLayout");
      const columnText = recipeTextFromOcrLayout(result.data.blocks);
      const recipe = parseRecipeText(columnText ?? result.data.text);
      if (columnText) {
        recipe.confidence = "low";
        recipe.warnings.push("Columns were reconstructed from the photo. Check every quantity, wrapped ingredient and step against the original.");
      }
      return [recipe];
    }

    const recipes = splitColumns.map(parseRecipeText);
    const completeRecipes = recipes.filter(
      (recipe) => recipe.ingredients.some((ingredient) => ingredient.item) && recipe.instructions.some((step) => step.body)
    );
    return completeRecipes.length === 2 ? completeRecipes : [parseRecipeText(result.data.text)];
  } finally {
    await worker.terminate();
  }
}
