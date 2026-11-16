import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
// Next bundles fontkit for its local-font support; it can read the licensed
// WOFF2 asset that ImageResponse itself cannot load.
type Font = { unitsPerEm: number; layout(text: string): { advanceWidth: number; glyphs: { path: { toSVG(): string } }[]; positions: { xAdvance: number; xOffset: number; yOffset: number }[] } };
// Keep Next's compiled fontkit external: bundling its internal module loader breaks it.
const loadFontkit = () => {
  const nodeRequire = eval("require") as NodeRequire;
  return nodeRequire("next/dist/compiled/@next/font/dist/fontkit").default as (data: Buffer) => Font;
};

export async function shareCardTitle(title: string): Promise<{ src: string; height: number }> {
  const font = loadFontkit()(await readFile(path.join(process.cwd(), "src/assets/fonts/fraunces.woff2")));
  const size = title.length > 65 ? 42 : title.length > 40 ? 50 : 64;
  const scale = size / font.unitsPerEm;
  const maxWidth = 640;
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    let remaining = word;
    while (remaining) {
      const next = line ? `${line} ${remaining}` : remaining;
      if (font.layout(next).advanceWidth * scale <= maxWidth) { line = next; break; }
      if (line) { lines.push(line); line = ""; continue; }
      const characters = Array.from(remaining);
      let count = 1;
      while (count < characters.length && font.layout(characters.slice(0, count + 1).join("")).advanceWidth * scale <= maxWidth) count++;
      lines.push(characters.slice(0, count).join(""));
      remaining = characters.slice(count).join("");
    }
  }
  if (line) lines.push(line);
  const height = Math.max(size * 1.2, lines.length * size * 1.2);
  const paths: string[] = [];
  lines.forEach((text, index) => {
    const run = font.layout(text);
    let x = 0;
    run.glyphs.forEach((glyph: { path: { toSVG(): string } }, i: number) => {
      const position = run.positions[i];
      paths.push(`<path d="${glyph.path.toSVG()}" transform="translate(${(x + position.xOffset) * scale} ${(index * size * 1.2) + size - position.yOffset * scale}) scale(${scale} ${-scale})"/>`);
      x += position.xAdvance;
    });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxWidth}" height="${Math.ceil(height)}"><g fill="white">${paths.join("")}</g></svg>`;
  const image = await sharp(Buffer.from(svg)).png().toBuffer();
  return { src: `data:image/png;base64,${image.toString("base64")}`, height: Math.ceil(height) };
}
