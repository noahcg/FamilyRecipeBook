type Box = { x0: number; y0: number; x1: number; y1: number };
type Word = { text: string; bbox: Box; confidence: number };
type Block = { paragraphs: { lines: { words: Word[] }[] }[] };

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function readingLines(words: Word[], lineHeight: number) {
  const rows: { center: number; words: Word[] }[] = [];
  for (const word of [...words].sort((a, b) => (a.bbox.y0 + a.bbox.y1) - (b.bbox.y0 + b.bbox.y1))) {
    const center = (word.bbox.y0 + word.bbox.y1) / 2;
    const row = rows.at(-1);
    if (row && Math.abs(center - row.center) < lineHeight * 0.65) {
      row.words.push(word);
      row.center = median(row.words.map((item) => (item.bbox.y0 + item.bbox.y1) / 2));
    } else rows.push({ center, words: [word] });
  }
  return rows.map((row) => row.words.sort((a, b) => a.bbox.x0 - b.bbox.x0).map((word) => word.text).join(" ")).join("\n");
}

/** Recover a single recipe's side-by-side columns only with strong spatial
 * evidence: a vertical sequence of step numbers and a separate ingredient list.
 * The boundary may slope on a photographed, curved cookbook page.
 */
export function recipeTextFromOcrLayout(blocks: Block[] | null): string | null {
  const words = blocks?.flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words)))
    .filter((word) => word.text.trim() && word.bbox.x1 > word.bbox.x0 && word.bbox.y1 > word.bbox.y0) ?? [];
  if (words.length < 40) return null;
  const lineHeight = median(words.filter((word) => word.confidence > 60).map((word) => word.bbox.y1 - word.bbox.y0));
  if (!lineHeight) return null;
  const left = Math.min(...words.map((word) => word.bbox.x0));
  const right = Math.max(...words.map((word) => word.bbox.x1));
  const width = right - left;
  const markers = words.filter((word) => /^\d{1,2}[.)]?$/.test(word.text) && word.confidence >= 50
    && word.bbox.x0 > left + width * 0.25 && word.bbox.x0 < left + width * 0.7).slice(0, 200)
    .filter((word) => {
      const following = words.filter((candidate) => candidate.bbox.x0 > word.bbox.x1
        && Math.abs(candidate.bbox.y0 - word.bbox.y0) < lineHeight)
        .sort((a, b) => a.bbox.x0 - b.bbox.x0)[0];
      return !/^(?:to|minutes?|mins?|hours?|hrs?|seconds?|degrees?|°[CF])\b/i.test(following?.text ?? "");
    });
  let best: { slope: number; intercept: number; top: number; markers: Word[] } | null = null;
  for (const first of markers.filter((word) => /^1[.)]?$/.test(word.text))) {
    for (const last of markers.filter((word) => parseInt(word.text, 10) >= 4)) {
      const dy = last.bbox.y0 - first.bbox.y0;
      if (dy < lineHeight * 10) continue;
      const slope = (last.bbox.x0 - first.bbox.x0) / dy;
      if (Math.abs(slope) > 0.35) continue;
      const intercept = first.bbox.x0 - slope * first.bbox.y0;
      const aligned = markers.filter((word) => word.bbox.y0 >= first.bbox.y0
        && Math.abs(word.bbox.x0 - (slope * word.bbox.y0 + intercept)) < lineHeight)
        .sort((a, b) => a.bbox.y0 - b.bbox.y0);
      let number = 0;
      const accepted: Word[] = [];
      for (const word of aligned) {
        const next = parseInt(word.text, 10);
        if (next > number && next <= number + 3) { accepted.push(word); number = next; }
      }
      if (accepted.length >= 4 && (!best || accepted.length > best.markers.length)) best = { slope, intercept, top: first.bbox.y0 - lineHeight, markers: accepted };
    }
  }
  if (!best) return null;
  const boundary = best;
  const header = words.filter((word) => word.bbox.y1 < boundary.top && word.confidence >= 30);
  const body = words.filter((word) => word.bbox.y1 >= boundary.top);
  const ingredients = body.filter((word) => word.bbox.x0 < boundary.slope * word.bbox.y0 + boundary.intercept - lineHeight);
  const ingredientWords = new Set(ingredients);
  const instructions = body.filter((word) => !ingredientWords.has(word));
  // Do not reinterpret a single-column numbered ingredient list as a method.
  if (ingredients.filter((word) => /^(?:cups?|teaspoons?|tablespoons?|ounces?|grams?|tsp|tbsp|kg|ml)$/i.test(word.text)).length < 3) return null;
  const stepMarkers = boundary.markers
    .filter((word, index, all) => index === 0 || word.bbox.y0 - all[index - 1].bbox.y0 > lineHeight * 2);
  const markerWords = new Set(stepMarkers);
  const steps = stepMarkers.map((marker, index) => {
    const top = marker.bbox.y0 - lineHeight * 0.6;
    const bottom = stepMarkers[index + 1] ? stepMarkers[index + 1].bbox.y0 - lineHeight * 0.6 : Infinity;
    const stepWords = instructions.filter((word) => !markerWords.has(word)
      && (word.bbox.y0 + word.bbox.y1) / 2 >= top && (word.bbox.y0 + word.bbox.y1) / 2 < bottom);
    return `${index + 1}. ${readingLines(stepWords, lineHeight)}`;
  });
  return `${readingLines(header, lineHeight)}\nIngredients\n${readingLines(ingredients, lineHeight)}\nInstructions\n${steps.join("\n")}`;
}
