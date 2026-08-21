import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nuogo-language", "en");
    localStorage.setItem("nuogo-language-default", "en-v3");
  });
});

test("account registration, logout, login, and protected API access work end to end", async ({ page, request }, testInfo) => {
  const email = `objective-${testInfo.project.name}-${Date.now()}@nuogo.test`;
  const password = "Nuogo123!";

  const unauthenticated = await request.get("http://127.0.0.1:8788/api/trips");
  expect(unauthenticated.status()).toBe(401);

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Objective Student");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/planner$/);

  const signOut = page.getByRole("button", { name: "Sign out" });
  if (!await signOut.isVisible()) await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("nuogo-token"))).toBeNull();

  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/planner$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("nuogo-token"))).not.toBeNull();
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

  await page.getByRole("button", { name: "Edit preferences" }).click();
  await expect(page.getByRole("status")).toContainText("INVALIDATED");
  await page.getByRole("button", { name: "Revalidate itinerary" }).click();
  await expect(page.getByRole("heading", { name: "Three travel profiles. One hard budget." })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Choose this plan" }).first().click();
  await expect(page).toHaveURL(/\/trip\/[^/]+$/);
  await page.getByRole("button", { name: "Delete trip" }).click();
  await expect(page).toHaveURL(/\/archive$/);
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

test("five-day comparison exposes dense and genuinely different spending profiles", async ({ page }, testInfo) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();

  await page.getByLabel("Start date").fill("2026-10-10");
  await page.getByLabel("End date").fill("2026-10-14");
  await page.getByLabel("Arrival date and time").fill("2026-10-10T08:00");
  await page.getByLabel("Departure date and time").fill("2026-10-14T20:00");
  await page.getByRole("slider", { name: "Total budget" }).fill("20000");
  await expect(page.getByRole("status", { name: "Total budget" })).toHaveText("CNY 20,000");
  await page.getByLabel("Preferred sights (optional, comma separated)").fill("Forbidden City");
  await page.getByRole("button", { name: "Generate 3 validated plans" }).click();

  await expect(page.getByRole("heading", { name: "Three travel profiles. One hard budget." })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("region", { name: "Plan comparison overview" })).toBeVisible();
  await expect(page.getByText("Budget stay", { exact: true })).toBeVisible();
  await expect(page.getByText("Comfort stay", { exact: true })).toBeVisible();

  const cards = page.locator("article.plan-column");
  await expect(cards).toHaveCount(3);
  const totals = await page.locator('[data-testid^="plan-total-"]').evaluateAll((nodes) =>
    nodes.map((node) => Number(node.textContent.replace(/[^0-9.]/g, "")))
  );
  expect(new Set(totals).size).toBe(3);
  expect(totals.every((total) => total > 0 && total <= 20_000)).toBeTruthy();

  for (const card of await cards.all()) {
    await expect(card.getByText(/15 events/)).toBeVisible();
    const dayTabs = card.getByRole("tab");
    await expect(dayTabs).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) {
      await dayTabs.nth(index).click();
      await expect(card.getByText(/2 activities/)).toBeVisible();
      await expect(card.getByText(/1 meals/)).toBeVisible();
    }
  }

  await page.screenshot({
    path: `.artifacts/${testInfo.project.name}-five-day-comparison.png`,
    fullPage: true
  });
});
