// Captures the onboarding-guide hero screenshots from the dev harness at
// /dev/guide-shot. Each hero shows the destination screen a user reaches after
// tapping the highlighted control. The harness renders each destination inside
// a fixed 16:10 #shot-frame, which we screenshot directly.
//
// Usage (dev server must be running):
//   node scripts/capture-guides.mjs            # http://localhost:3000
//   BASE_URL=http://localhost:3001 node scripts/capture-guides.mjs
//
// Re-run whenever the destination screens change, then commit the updated
// optimized WebP files in public/guides.

import { chromium } from "playwright";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Final hero width in CSS px (displayed ~360px, so this is comfortably retina).
const OUTPUT_WIDTH = 1280;
const WEBP_QUALITY = 80;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "guides");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

// name = output file; screen = which destination the harness renders.
const SHOTS = [
  { name: "welcome-home", screen: "app-home" },
  { name: "invite-members-1", screen: "members" },
  { name: "invite-members-2", screen: "add-member" },
  { name: "nav-orientation-1", screen: "bookshelf" },
  { name: "plan-and-shop-1", screen: "meal-plan" },
  { name: "plan-and-shop-2", screen: "groceries" },
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1100, height: 760 },
    deviceScaleFactor: 2,
  });

  for (const { name, screen } of SHOTS) {
    await page.goto(`${BASE_URL}/dev/guide-shot?screen=${screen}`, {
      waitUntil: "networkidle",
    });
    const frame = page.locator("#shot-frame");
    await frame.waitFor({ state: "visible", timeout: 15000 });
    // Let webfonts settle so headings render in Playfair, not a fallback.
    await page.waitForTimeout(700);
    const png = await frame.screenshot();
    await sharp(png)
      .resize({ width: OUTPUT_WIDTH })
      .webp({ quality: WEBP_QUALITY })
      .toFile(join(OUT_DIR, `${name}.webp`));
    console.log(`✓ ${name}.webp  (${screen})`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
