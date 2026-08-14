import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nuogo-language", "en");
    localStorage.setItem("nuogo-language-default", "en-v3");
  });
});

test("guest can generate, compare, select, and manage a validated trip", async ({ page, request }, testInfo) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page).toHaveURL(/\/planner$/);

  await page.getByRole("button", { name: "Generate 3 validated plans" }).click();
  await expect(page.getByRole("heading", { name: "Three travel profiles. One hard budget." })).toBeVisible({ timeout: 30_000 });

  const planButtons = page.getByRole("button", { name: "Choose this plan" });
  await expect(planButtons).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Budget-saving", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Balanced", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comfort-focused", exact: true })).toBeVisible();
  await expect(page.getByText("hard budget CNY 5,000", { exact: false })).toHaveCount(3);

  const totals = await page.getByText(/^CNY [\d,.]+$/).evaluateAll((nodes) =>
    nodes.map((node) => Number(node.textContent.replace(/[^\d.]/g, ""))).filter(Number.isFinite)
  );
  expect(totals.some((total) => total > 0 && total <= 5000)).toBeTruthy();

  await planButtons.nth(1).click();
  await expect(page).toHaveURL(/\/trip\/[^/]+$/);
  const tripId = new URL(page.url()).pathname.split("/").at(-1);
  await expect(page.getByText(/Validated trip workspace/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Deterministic trip budget" })).toBeVisible();
  await expect(page.getByRole("region", { name: /Day 1 continuous itinerary/ })).toContainText("Start");
  await expect(page.getByRole("region", { name: /Day 1 continuous itinerary/ })).toContainText("End");
  await expect(page.locator(".leaflet-container")).toBeVisible();

  const mapBox = await page.locator(".leaflet-container").boundingBox();
  expect(mapBox.height).toBeGreaterThan(180);
  expect(mapBox.height).toBeLessThan(500);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

  await page.getByRole("button", { name: "Privacy and AI" }).click();
  await expect(page.getByRole("dialog", { name: "Privacy and AI settings" })).toBeVisible();
  await page.getByRole("button", { name: "Close privacy settings" }).click();

  page.once("dialog", (dialog) => dialog.accept("Objective journey proof"));
  await page.getByRole("button", { name: "Rename trip" }).click();
  await expect(page.getByRole("heading", { name: "Objective journey proof" })).toBeVisible();

  const secondGuest = await request.post("http://127.0.0.1:8788/api/auth/guest");
  expect(secondGuest.ok()).toBeTruthy();
  const { token } = await secondGuest.json();
  const forbiddenRead = await request.get(`http://127.0.0.1:8788/api/trips/${tripId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(forbiddenRead.status()).toBe(403);

  await page.screenshot({
    path: `.artifacts/${testInfo.project.name}-objective-workspace.png`,
    fullPage: true
  });
  expect(consoleErrors).toEqual([]);
});

test("validated workspace respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.getByRole("button", { name: "Generate 3 validated plans" }).click();
  await expect(page.getByRole("button", { name: "Choose this plan" }).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Choose this plan" }).first().click();
  await expect(page.getByText(/Validated trip workspace/)).toBeVisible();
  await expect(page.locator(".animate-spin")).toHaveCount(0);
});
