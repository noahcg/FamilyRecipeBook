const UNICODE_FRACTIONS: Record<string, string> = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅐": "1/7",
  "⅑": "1/9",
  "⅒": "1/10",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

function normalizeQuantityText(value: string) {
  return value
    .replace(/[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (fraction) => ` ${UNICODE_FRACTIONS[fraction]} `)
    .replace(/\s+/g, " ")
    .trim();
}

function parseSingleQuantity(value: string) {
  const normalized = normalizeQuantityText(value);
  const mixed = normalized.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    if (denominator > 0) return whole + numerator / denominator;
  }

  const fraction = normalized.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    if (denominator > 0) return numerator / denominator;
  }

  const decimal = Number(normalized);
  return Number.isFinite(decimal) ? decimal : null;
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

function formatScaledNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";

  const roundedInteger = Math.round(value);
  if (Math.abs(value - roundedInteger) < 0.01) return String(roundedInteger);

  const whole = Math.floor(value);
  const remainder = value - whole;
  const denominator = 16;
  const numerator = Math.round(remainder * denominator);

  if (numerator === 0) return String(whole);
  if (numerator === denominator) return String(whole + 1);

  const divisor = gcd(numerator, denominator);
  const fraction = `${numerator / divisor}/${denominator / divisor}`;

  if (whole > 0) return `${whole} ${fraction}`;
  return fraction;
}

function scaleSingleQuantity(value: string, factor: number) {
  const parsed = parseSingleQuantity(value);
  if (parsed == null) return null;
  return formatScaledNumber(parsed * factor);
}

export function scaleIngredientQuantity(quantity: string | null, factor: number) {
  if (!quantity || !Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 0.001) {
    return quantity;
  }

  const normalized = normalizeQuantityText(quantity);
  const range = normalized.match(/^(.+?)\s*(?:-|–|—|\bto\b)\s*(.+)$/i);
  if (range) {
    const start = scaleSingleQuantity(range[1].trim(), factor);
    const end = scaleSingleQuantity(range[2].trim(), factor);
    if (start && end) return `${start}-${end}`;
  }

  return scaleSingleQuantity(normalized, factor) ?? quantity;
}
