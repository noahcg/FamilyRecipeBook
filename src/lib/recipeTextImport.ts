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
