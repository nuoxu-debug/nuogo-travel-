import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nuogo-language", "en");
    localStorage.setItem("nuogo-language-default", "zh-v4");
  });
  await page.goto("/");
});

test("presents the Singapore landing atlas without horizontal overflow", async ({ page }, testInfo) => {
  await expect(page.getByRole("heading", { name: "Let Singapore unfold at your pace." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue as Guest - enter Guest Mode" })).toHaveAttribute("href", "/login?returnTo=%2Fdiscover%2Fsingapore");
  await expect(page.getByRole("link", { name: "Start Planning" }).first()).toHaveAttribute("href", "/discover/singapore");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  await page.screenshot({ path: `.artifacts/${testInfo.project.name}-singapore-hero.png` });
});

test("reveals independent Singapore travel chapters and the carriage journey", async ({ page }, testInfo) => {
  const chapters = page.getByTestId("singapore-attraction-story");
  await chapters.scrollIntoViewIfNeeded();
  await expect(chapters.getByRole("img", { name: /Marina Bay Sands - Singapore travel chapter/i })).toBeVisible();
  await expect(chapters.getByRole("img", { name: /Little India - Singapore travel chapter/i })).toHaveCount(1);
  await chapters.screenshot({ path: `.artifacts/${testInfo.project.name}-singapore-stories.png` });

  const route = page.getByRole("img", { name: "Singapore illustrated journey map" });
  await route.scrollIntoViewIfNeeded();
  await expect(page.getByTestId("journey-carriage")).toBeVisible();
  await page.mouse.wheel(0, 750);
  await expect(route).toBeVisible();
  await route.screenshot({ path: `.artifacts/${testInfo.project.name}-singapore-journey-map.png` });
});

test("keeps the landing and planner free of runtime console errors", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.getByTestId("singapore-journey-map").scrollIntoViewIfNeeded();
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "One choice. One Singapore itinerary you can actually use." })).toBeVisible();
  expect(errors).toEqual([]);
});

test("keeps the completed SVG route visible when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const route = page.getByRole("img", { name: "Singapore illustrated journey map" });
  await route.scrollIntoViewIfNeeded();
  await expect(page.getByTestId("journey-carriage")).toBeVisible();
  await expect(route.locator(".journey-map__route-progress")).toHaveAttribute("style", /stroke-dashoffset: 0/);
});
