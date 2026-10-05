import { test, expect } from "@playwright/test";
import { guides } from "../../src/lib/guides/editorial";

// Each route gets its own document: unloading a page during Link prefetch can
// surface WebKit's canceled-fetch access-control error as a pageerror.
for (const path of ["/", "/pricing", "/our-story", "/privacy", "/terms", "/guides", "/sign-in", ...guides.map(({ slug }) => `/guides/${slug}`)]) {
  test(`public page ${path} renders without crashes or horizontal overflow`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), path).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("mobile public navigation stays above scrolled page content", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-webkit");
  for (const path of ["/", "/our-story", "/pricing", "/guides", `/guides/${guides[0].slug}`]) {
    await page.goto(path);
    const nav = page.getByRole("navigation", { name: "Mobile public navigation" });
    await expect(nav).toBeVisible();
    await expect.poll(() => nav.evaluate((element) => element.parentElement === document.body)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));
    for (const link of await nav.getByRole("link").all()) {
      const box = await link.boundingBox();
      expect(box, `${path}: nav link has a visible hit area`).not.toBeNull();
      const topmostIsNav = await page.evaluate(({ x, y }) => Boolean(
        document.elementFromPoint(x, y)?.closest('nav[aria-label="Mobile public navigation"]'),
      ), { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
      expect(topmostIsNav, `${path}: ${await link.getAttribute("aria-label")} remains above content`).toBe(true);
    }
  }
});

test("sign-in validates email without sending a request", async ({ page }) => {
  await page.goto("/sign-in");
  const requests: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST") requests.push(request.url()); });
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
  expect(requests).toEqual([]);
});

test("private pages redirect anonymous visitors to sign-in", async ({ page }) => {
  for (const path of ["/app", "/app/recipes", "/app/settings", "/app/admin"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
    await expect(page.getByLabel("Email address")).toBeVisible();
  }
});

test("production hides development surfaces and rejects unauthenticated billing", async ({ request }) => {
  for (const path of ["/dev/otp?email=smoke@example.invalid", "/dev/ui", "/dev/email-preview/sign-in-code"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  for (const path of ["/api/billing/checkout", "/api/billing/portal"]) {
    expect((await request.post(path)).status(), path).toBe(401);
  }
  expect((await request.post("/api/billing/webhook", { data: "{}" })).status()).toBe(400);
});

test("private media denies anonymous access without cacheable responses", async ({ request }) => {
  for (const path of [
    "/api/media/recipe-images/00000000-0000-4000-8000-000000000001/photo.jpg",
    "/api/media/book-covers/00000000-0000-4000-8000-000000000001/cover.jpg",
    "/api/media/recipe-originals/00000000-0000-4000-8000-000000000001/original.pdf",
    "/api/media/recipe-images/photo.jpg?share=invalid",
    "/api/media/book-covers/cover.jpg?share=00000000-0000-4000-8000-000000000001",
    "/api/media/unsupported/photo.jpg",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    expect(response.headers()["cache-control"], path).toContain("no-store");
    expect(response.headers()["vary"], path).toContain("Cookie");
    expect(response.headers()["x-content-type-options"], path).toBe("nosniff");
  }
});

test("shared image optimizer rejects private media and remote storage URLs", async ({ request }) => {
  for (const url of [
    "/api/media/recipe-images/photo.jpg",
    "/api/media/recipe-images/photo.jpg?share=00000000-0000-4000-8000-000000000001",
    "/api/media/recipe-originals/recipe/original.pdf",
    "https://smoke-fixture.supabase.co/storage/v1/object/public/recipe-images/photo.jpg",
  ]) {
    const response = await request.get(`/_next/image?${new URLSearchParams({ url, w: "640", q: "75" })}`);
    expect(response.status(), url).toBe(400);
  }
});
