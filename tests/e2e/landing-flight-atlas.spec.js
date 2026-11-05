import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nuogo-language", "en");
    localStorage.setItem("nuogo-language-default", "zh-v4");
  });
  await page.goto("/");
});

test("presents global travel photos and the Singapore pilot without horizontal overflow", async ({ page }, testInfo) => {
  await expect(page.getByRole("heading", { name: "Let Singapore unfold at your pace." })).toBeVisible();
  const collage = page.locator(".atlas-hero__destination-collage");
  await expect(collage.locator("figcaption")).toHaveText(["Paris, France", "Mount Fuji, Japan", "Great Wall, China", "New York, USA"]);
  await expect.poll(() => collage.locator("img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  await expect(page.getByRole("heading", { name: "Gardens by the Bay", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chinatown", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kampong Glam", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start Planning" }).first()).toHaveAttribute("href", "/discover/singapore");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath("singapore-hero.png") });
});

test("reveals independent Singapore travel chapters and the carriage journey", async ({ page }, testInfo) => {
  const chapters = page.getByTestId("singapore-attraction-story");
  await chapters.scrollIntoViewIfNeeded();
  await expect(chapters.getByRole("img", { name: /Gardens by the Bay - Singapore travel chapter/i })).toBeVisible();
  await expect(chapters.getByRole("img", { name: /Little India - Singapore travel chapter/i })).toHaveCount(1);
  await chapters.screenshot({ path: testInfo.outputPath("singapore-stories.png") });

  const route = page.getByRole("img", { name: "Singapore MRT network map" });
  await route.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 750);
  await expect(route).toBeVisible();
  await route.screenshot({ path: testInfo.outputPath("singapore-journey-map.png") });
});

test("keeps the landing and planner free of runtime console errors", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.getByTestId("singapore-journey-map").scrollIntoViewIfNeeded();
  await page.goto("/planner");
  await expect(page.getByRole("button", { name: "Generate ONE itinerary" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("keeps the Singapore route reference visible when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const route = page.getByRole("img", { name: "Singapore MRT network map" });
  await route.scrollIntoViewIfNeeded();
  await expect(route).toBeVisible();
});
