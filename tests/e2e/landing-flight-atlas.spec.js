import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {
    name: /Plan the whole journey, not just the destination/i
  })).toBeVisible();
});

test("renders a detailed China hero without horizontal page overflow", async ({ page }, testInfo) => {
  const heroImage = page.locator(".flight-hero-media img");
  await expect(heroImage).toBeVisible();
  await expect.poll(() => heroImage.evaluate((image) => image.complete && image.naturalWidth > 1000))
    .toBe(true);

  const pixelSummary = await heroImage.evaluate((image) => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 36;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

    const colours = new Set();
    let nonTransparent = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const colour = `${pixels[index]},${pixels[index + 1]},${pixels[index + 2]},${pixels[index + 3]}`;
      colours.add(colour);
      if (pixels[index + 3] > 0) nonTransparent += 1;
    }
    return { uniqueColours: colours.size, nonTransparent };
  });

  expect(pixelSummary.uniqueColours).toBeGreaterThan(12);
  expect(pixelSummary.nonTransparent).toBeGreaterThan(100);

  const hasOverflow = await page.evaluate(() => (
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  ));
  expect(hasOverflow).toBe(false);

  await page.screenshot({
    path: `.artifacts/${testInfo.project.name}-flight-atlas.png`
  });
});

test("moves through the pinned strategy journey on desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop-only pinned journey.");

  const stage = page.locator(".strategy-stage");
  await stage.scrollIntoViewIfNeeded();
  const startTransform = await page.locator(".strategy-track").evaluate((element) => (
    getComputedStyle(element).transform
  ));

  await page.evaluate(() => window.scrollBy(0, 1250));
  await page.waitForTimeout(450);

  const progressedTransform = await page.locator(".strategy-track").evaluate((element) => (
    getComputedStyle(element).transform
  ));
  expect(progressedTransform).not.toBe(startTransform);
  await expect(page.getByRole("heading", { name: "Comfort-Focused" })).toBeVisible();
});

test("advances the generic Living Atlas route while scrolling", async ({ page }, testInfo) => {
  await expect(page.getByText("Kuala Lumpur")).toHaveCount(0);
  await expect(page.getByText("Beijing")).toHaveCount(0);
  await expect(page.getByText("Shanghai")).toHaveCount(0);
  await expect(page.getByText("Xi'an")).toHaveCount(0);

  const map = page.getByRole("img", { name: "Animated journey across China" });
  const atlas = page.getByTestId("living-atlas");
  const mapTop = await page.locator(".journey-map-section").evaluate((element) => (
    element.getBoundingClientRect().top + window.scrollY
  ));
  await page.evaluate((top) => window.scrollTo(0, top + 650), mapTop);
  await expect(atlas).toHaveAttribute("data-scene-state", "ready");
  const initialProgress = Number(await page.getByRole("progressbar", { name: "Journey progress" }).getAttribute("value"));

  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(300);

  const progressedProgress = Number(await page.getByRole("progressbar", { name: "Journey progress" }).getAttribute("value"));
  expect(progressedProgress).toBeGreaterThan(initialProgress);
  await expect(atlas.locator("canvas.living-atlas-webgl")).toHaveCount(1);
  await expect(atlas.getByText("Stop 01")).toBeVisible();
  expect(await atlas.locator(".living-atlas-fallback").evaluate((element) => (
    Number.parseFloat(getComputedStyle(element).opacity)
  ))).toBeGreaterThanOrEqual(0.9);
  expect(await atlas.locator(".living-atlas-fallback img").evaluate((element) => (
    Number.parseFloat(getComputedStyle(element).opacity)
  ))).toBeLessThanOrEqual(0.1);
  if (testInfo.project.name === "mobile-chromium") {
    const headingSize = Number.parseFloat(await page.locator(".journey-map-heading h2").evaluate((element) => (
      getComputedStyle(element).fontSize
    )));
    expect(headingSize).toBeLessThanOrEqual(56);
  }
  await expect(map).toBeInViewport();
  await page.screenshot({ path: `.artifacts/${testInfo.project.name}-living-atlas-midpoint.png` });
});
