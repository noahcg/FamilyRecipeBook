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

function formatFraction(value: number): string {
  const whole = Math.floor(value);
  const numerator = Math.round((value - whole) * 16);
  if (numerator === 16) return String(whole + 1);
  if (!numerator) return String(whole);
  const divisor = (a: number, b: number): number => b ? divisor(b, a % b) : a;
  const fraction = `${numerator / divisor(numerator, 16)}/${16 / divisor(numerator, 16)}`;
  return whole ? `${whole} ${fraction}` : fraction;
}

const VOLUME: Record<string, number> = {
  tsp: 5, teaspoon: 5, teaspoons: 5,
  tbsp: 14.7868, tablespoon: 14.7868, tablespoons: 14.7868,
  "fl oz": 29.5735, "fluid ounce": 29.5735, "fluid ounces": 29.5735,
  cup: 236.588, cups: 236.588, pint: 473.176, pints: 473.176,
  quart: 946.353, quarts: 946.353, gallon: 3785.41, gallons: 3785.41,
};
const WEIGHT: Record<string, number> = {
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
};
const METRIC_VOLUME: Record<string, number> = { ml: 1, milliliter: 1, milliliters: 1, millilitre: 1, millilitres: 1, l: 1000, liter: 1000, liters: 1000, litre: 1000, litres: 1000 };
const METRIC_WEIGHT: Record<string, number> = { g: 1, gram: 1, grams: 1, kg: 1000, kilogram: 1000, kilograms: 1000 };

function rounded(value: number): string {
  const step = value < 5 ? .05 : value < 10 ? .1 : value < 100 ? 1 : 5;
  return (Math.round(value / step) * step).toFixed(step === .05 ? 2 : step === .1 ? 1 : 0).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

export function displayIngredientAmount(quantity: string | null, unit: string | null, metric: boolean): { quantity: string | null; unit: string | null } {
  if (!quantity || !unit) return { quantity, unit };
  const range = quantity.trim().match(/^(.+?)\s*(?:–|—|-|\s+to\s+)\s*(.+)$/i);
  if (range) {
    const start = displayIngredientAmount(range[1], unit, metric);
    const end = displayIngredientAmount(range[2], unit, metric);
    if (start.unit === end.unit) return { quantity: `${start.quantity}–${end.quantity}`, unit: start.unit };
    return { quantity: `${start.quantity} ${start.unit}–${end.quantity} ${end.unit}`, unit: null };
  }
  const amount = parseAmount(quantity);
  const key = unit.toLowerCase().trim().replace(/\.$/, "");
  const factor = metric ? VOLUME[key] ?? WEIGHT[key] : METRIC_VOLUME[key] ?? METRIC_WEIGHT[key];
  if (amount === null || factor === undefined) return { quantity, unit };
  const converted = amount * factor;
  const volume = metric ? key in VOLUME : key in METRIC_VOLUME;
  if (metric) return converted >= 1000
    ? { quantity: rounded(converted / 1000), unit: volume ? "L" : "kg" }
    : { quantity: rounded(converted), unit: volume ? "mL" : "g" };
  if (volume) {
    if (converted < 15) return { quantity: formatFraction(converted / VOLUME.tsp), unit: "tsp" };
    if (converted < 60) return { quantity: formatFraction(converted / VOLUME.tbsp), unit: "tbsp" };
    const cups = converted / VOLUME.cup;
    const cupAmount = formatFraction(cups);
    return cups >= .25
      ? { quantity: cupAmount, unit: cupAmount === "1" ? "cup" : "cups" }
      : { quantity: formatFraction(converted / VOLUME.tbsp), unit: "tbsp" };
  }
  if (converted < 15) return { quantity, unit };
  const ounces = converted / WEIGHT.oz;
  return ounces >= 16
    ? { quantity: formatFraction(converted / WEIGHT.lb), unit: "lb" }
    : { quantity: formatFraction(ounces), unit: "oz" };
}

// Convert explicit Fahrenheit temperatures in recipe prose for display only.
// Oven settings are conventionally shown to the nearest 5 °C.
export function displayRecipeTemperatures(text: string, metric: boolean): string {
  if (!metric) return text.replace(/\b(\d{2,3})\s*(°\s*C|degrees?\s*(?:C|Celsius)|Celsius|C)\b/gi, (match, value: string) => {
    const celsius = Number(value);
    if (celsius < 50 || celsius > 300) return match;
    return `${Math.round((celsius * 9 / 5 + 32) / 25) * 25}°F`;
  });
  return text.replace(/\b(\d{2,3})\s*(°\s*F|degrees?\s*(?:F|Fahrenheit)|Fahrenheit|F)\b/gi, (match, value: string) => {
    const fahrenheit = Number(value);
    if (fahrenheit < 100 || fahrenheit > 600) return match;
    return `${Math.round(((fahrenheit - 32) * 5 / 9) / 5) * 5}°C`;
  });
}
