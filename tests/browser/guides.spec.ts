import { test, expect } from "@playwright/test";
import { guides } from "../../src/lib/guides/editorial";

const oldSlugs = ["how-to-share-your-home-cooked-book", "how-to-change-a-recipe-photo-with-pexels", "how-to-create-a-digital-family-cookbook", "how-to-preserve-family-recipes", "how-to-organize-recipes-into-a-personal-cookbook", "how-to-turn-old-recipe-cards-into-a-digital-cookbook", "how-to-share-family-recipes", "how-to-organize-saved-recipes", "how-to-create-a-cookbook-as-a-family-gift", "how-to-digitize-a-family-recipe-collection", "how-to-build-your-own-recipe-book-online", "how-to-preserve-handwritten-family-recipes", "how-to-set-up-your-first-home-cooked-book", "how-to-add-your-first-recipe-to-home-cooked", "how-to-plan-meals-and-build-a-grocery-list-in-home-cooked"];
const selected = ["thanksgiving-side-dishes", "holiday-recipe-planning", "how-to-preserve-handwritten-family-recipes", "how-to-create-a-digital-family-cookbook"];

test("registry, index and sitemap contain unique canonical guide destinations", async ({ page, request }) => {
  const normalized = guides.map(({ slug }) => decodeURIComponent(slug).normalize("NFC").toLowerCase().replace(/\/+$/, ""));
  expect(new Set(normalized).size).toBe(guides.length);
  expect(guides.map(({ slug }) => slug)).toEqual([...oldSlugs, "thanksgiving-side-dishes", "holiday-recipe-planning"]);
  expect(new Set(guides.map((g) => JSON.stringify(g.sections))).size).toBe(guides.length);
  await page.goto("/guides");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  expect(new Set(locations).size).toBe(locations.length);
  for (const { slug } of guides) {
    const path = `/guides/${slug}`;
    // Responsive navigation has separate mobile and desktop renderings.
    expect(await page.locator(`a[href="${path}"]`).count()).toBe(2);
    expect(locations.filter((location) => location === path)).toHaveLength(1);
  }
});

for (const slug of selected) test(`${slug} keeps its canonical and campaign CTA`, async ({ page }) => {
  const path = `/guides/${slug}`;
  await page.goto(`${path}?utm_source=pinterest&utm_medium=organic_social&utm_campaign=holiday&utm_content=pin`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  await expect(page.getByRole("link", { name: "All guides" })).toHaveAttribute("href", "/guides");
  const cta = page.getByRole("link", { name: "Keep your family recipes together" });
  await expect(cta).toHaveAttribute("href", /utm_source=pinterest/);
  await expect(cta).toHaveAttribute("href", /utm_content=pin/);
  await cta.click();
  await expect(page).toHaveURL(/\/sign-in\?.*utm_source=pinterest/);
});


test("editorial bodies do not duplicate the selected destinations", async () => {
  const shingles = (text: string) => {
    const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    return new Set(words.slice(0, -4).map((_, i) => words.slice(i, i + 5).join(" ")));
  };
  const bodies = guides.map((g) => ({ slug: g.slug, grams: shingles(g.sections.flatMap((section) => [...section.paragraphs, ...(section.bullets ?? [])]).join(" ")) }));
  for (const a of bodies.filter((body) => selected.includes(body.slug))) for (const b of bodies) {
    if (a.slug === b.slug) continue;
    const common = [...a.grams].filter((gram) => b.grams.has(gram)).length;
    expect(common / Math.min(a.grams.size, b.grams.size), `${a.slug} and ${b.slug}`).toBeLessThan(0.25);
  }
});

test("guide routes do not create case or alternate-slug articles", async ({ request }) => {
  for (const path of ["/guides/THANKSGIVING-SIDE-DISHES", "/guides/preserve-handwritten-family-recipes", "/guides/organize-family-recipes-digital-cookbook"]) {
    expect((await request.get(path)).status()).toBe(404);
  }
  const trailing = await request.get("/guides/how-to-preserve-handwritten-family-recipes/", { maxRedirects: 0 });
  expect(trailing.status()).toBe(308);
  expect(trailing.headers().location).toContain("/guides/how-to-preserve-handwritten-family-recipes");
});

test("Thanksgiving guide presents a usable portions table and planning sections", async ({ page }) => {
  await page.goto("/guides/thanksgiving-side-dishes");
  const table = page.getByRole("table", { name: "Approximate amount of one side at ½ cup per adult" });
  await expect(table).toBeVisible();
  for (const [people, amount] of [["4", "2 cups"], ["6", "3 cups"], ["8", "4 cups"], ["10", "5 cups"], ["12", "6 cups"]]) {
    await expect(table.getByRole("row", { name: `${people} ${amount}` })).toBeVisible();
  }
  for (const heading of ["A balanced menu to make your own", "A worked example for a 5 p.m. meal", "A sides preparation timeline", "A quick host checklist"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
