const FRACTIONS: Record<string, number> = {
  "¼": .25, "½": .5, "¾": .75, "⅓": 1 / 3, "⅔": 2 / 3,
  "⅛": .125, "⅜": .375, "⅝": .625, "⅞": .875,
};

function parseAmount(value: string): number | null {
  const normalized = value.replace(/([0-9])([¼½¾⅓⅔⅛⅜⅝⅞])/g, "$1 $2").trim();
  const parts = normalized.split(/\s+/);
  if (parts.length > 2) return null;
  let total = 0;
  for (const part of parts) {
    const fraction = FRACTIONS[part];
    const match = part.match(/^(\d+)\/(\d+)$/);
    const number = fraction ?? (match ? Number(match[1]) / Number(match[2]) : Number(part));
    if (!Number.isFinite(number)) return null;
    total += number;
  }
  return total > 0 ? total : null;
}

const VOLUME: Record<string, number> = {
  tsp: 4.92892, teaspoon: 4.92892, teaspoons: 4.92892,
  tbsp: 14.7868, tablespoon: 14.7868, tablespoons: 14.7868,
  "fl oz": 29.5735, "fluid ounce": 29.5735, "fluid ounces": 29.5735,
  cup: 236.588, cups: 236.588, pint: 473.176, pints: 473.176,
  quart: 946.353, quarts: 946.353, gallon: 3785.41, gallons: 3785.41,
};
const WEIGHT: Record<string, number> = {
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
};

function rounded(value: number): string {
  const step = value < 10 ? .1 : value < 100 ? 1 : 5;
  return String(Math.round(value / step) * step);
}

export function displayIngredientAmount(quantity: string | null, unit: string | null, metric: boolean) {
  if (!metric || !quantity || !unit) return { quantity, unit };
  const amount = parseAmount(quantity);
  const key = unit.toLowerCase().trim().replace(/\.$/, "");
  const factor = VOLUME[key] ?? WEIGHT[key];
  if (amount === null || factor === undefined) return { quantity, unit };
  const converted = amount * factor;
  const volume = key in VOLUME;
  return converted >= 1000
    ? { quantity: rounded(converted / 1000), unit: volume ? "L" : "kg" }
    : { quantity: rounded(converted), unit: volume ? "mL" : "g" };
}
