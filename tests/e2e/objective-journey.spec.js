import { expect, test } from "@playwright/test";

const apiBase = "http://127.0.0.1:8788/api";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nuogo-language", "en");
    localStorage.setItem("nuogo-language-default", "zh-v4");
  });
});

async function enterGuestPlanner(page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Continue as Guest - enter Guest Mode" }).click();
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page).toHaveURL(/\/discover\/singapore$/);
  await page.getByRole("link", { name: "Continue to Preferences" }).click();
  await expect(page).toHaveURL(/\/planner$/);
}

async function generateManualTrip(page) {
  await enterGuestPlanner(page);
  await page.getByRole("link", { name: "Choose attractions" }).click();
  await expect(page).toHaveURL(/\/discover\/singapore$/);
  await expect(page.getByRole("heading", { name: "Discover Singapore" })).toBeVisible();
  await page.getByRole("radio", { name: /Choose Attractions Myself/ }).click();
  await page.getByRole("button", { name: "Add Gardens by the Bay" }).click();
  await page.getByRole("button", { name: "Add National Gallery Singapore" }).click();
  await page.getByRole("link", { name: "Continue to Preferences" }).click();
  await page.getByRole("button", { name: /Balanced/ }).click();
  await page.getByRole("checkbox", { name: /rainy-day backup/i }).check();
  await page.getByRole("button", { name: "Generate ONE itinerary" }).click();
  await expect(page).toHaveURL(/\/trip\/[^/]+$/, { timeout: 30_000 });
}

async function guestToken(request) {
  const response = await request.post(`${apiBase}/auth/guest`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()).token;
}

test("Guest MANUAL flow produces one validated Singapore workspace", async ({ page }, testInfo) => {
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  await generateManualTrip(page);

  await expect(page.getByText(/Validated trip workspace/)).toContainText("Balanced");
  const validation = page.getByRole("region", { name: "Itinerary validation summary" });
  await expect(validation.getByText("Validated")).toBeVisible();
  await expect(validation.getByText("Within hard budget")).toBeVisible();
  await expect(validation.getByText(/Grounded attractions:/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Profile budget summary" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Deterministic trip budget" })).toContainText("S$");
  await expect(page.getByRole("region", { name: "Rainy-day contingency" })).toContainText("Inactive");
  await expect(page.getByRole("region", { name: "Rainy-day contingency" })).toContainText("Demo fixture");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.getByRole("link", { name: "My trips" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Choose this plan/i })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/CNY|Beijing|Shanghai|Xi'an|BUDGET_SAVING|SUPPORTING_ONLY/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

  await page.screenshot({ path: `.artifacts/${testInfo.project.name}-singapore-workspace.png`, fullPage: true });
  expect(consoleErrors).toEqual([]);
});

test("Guest AUTO flow uses the same Singapore planner and creates one run", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The AUTO contract is viewport-independent.");
  await enterGuestPlanner(page);
  await expect(page.getByText("Automatic recommendations enabled")).toBeVisible();
  await page.getByRole("button", { name: "Generate ONE itinerary" }).click();
  await expect(page).toHaveURL(/\/trip\/[^/]+$/, { timeout: 30_000 });
  await expect(page.getByRole("region", { name: "Itinerary validation summary" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Choose this plan/i })).toHaveCount(0);
});

test("a registered traveller explicitly saves and manages one guest itinerary", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One desktop persistence journey is sufficient.");
  await generateManualTrip(page);

  await page.getByRole("button", { name: "Sign in to save itinerary" }).click();
  const email = `singapore-${Date.now()}@nuogo.test`;
  await page.getByLabel("Full name").fill("Singapore FYP Traveller");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Nuogo123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/trip\/[^/]+$/);

  await page.getByRole("button", { name: "Save itinerary to my account" }).click();
  await expect(page.getByRole("status")).toContainText("Itinerary saved to your account");
  await page.getByRole("link", { name: "My trips" }).click();
  await expect(page.getByRole("heading", { name: "Your Singapore travel library." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open itinerary" })).toBeVisible();

  await page.getByRole("button", { name: "Open itinerary" }).click();
  await page.getByRole("button", { name: "Regenerate trip" }).click();
  await expect(page).toHaveURL(/\/trip\/[^/]+$/, { timeout: 30_000 });
  await page.getByRole("button", { name: "Delete trip" }).click();
  await expect(page).toHaveURL(/\/archive$/);
});

test("an impossible SGD hard budget fails without returning a run", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The API failure contract is viewport-independent.");
  const token = await guestToken(request);
  const response = await request.post(`${apiBase}/trips/generate`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      destination: "singapore",
      startDate: "2026-10-10",
      endDate: "2026-10-12",
      travellerCount: 2,
      budgetMinor: 1000,
      currency: "SGD",
      interests: ["CULTURE", "FOOD"],
      preferredSights: [],
      attractionSelectionMode: "AUTO",
      selectedAttractions: [],
      travelStyle: "BALANCED",
      rainyDayBackupEnabled: false,
      language: "en",
      consentToLlmProcessing: true
    }
  });
  const body = await response.json();

  expect(response.status()).toBe(422);
  expect(body.error.code).toBe("GENERATION_CONSTRAINTS_UNSATISFIED");
  expect(body).not.toHaveProperty("itineraryRun");
});
