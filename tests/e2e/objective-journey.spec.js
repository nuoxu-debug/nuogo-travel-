import { expect, test } from "@playwright/test";

const apiBase = "http://127.0.0.1:8788/api";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nuogo-language", "en");
    localStorage.setItem("nuogo-language-default", "zh-v4");
  });
});

async function registerTraveller(page, returnTo = "/discover/singapore") {
  await page.goto(`/register?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel("Full name").fill("Singapore FYP Traveller");
  await page.getByLabel("Email address").fill(`singapore-${Date.now()}@nuogo.test`);
  await page.getByLabel("Password", { exact: true }).fill("Nuogo123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(new RegExp(`${returnTo.replace("/", "\\/")}$`));
}

async function enterRegisteredPlanner(page) {
  await registerTraveller(page);
  await page.goto("/planner");
  await expect(page).toHaveURL(/\/planner$/);
}

async function generateManualTrip(page) {
  await enterRegisteredPlanner(page);
  await page.getByRole("link", { name: "Choose attractions" }).click();
  await expect(page).toHaveURL(/\/discover\/singapore$/);
  await expect(page.getByRole("heading", { name: "Discover Destinations" })).toBeVisible();
  await page.getByRole("radio", { name: /Choose Attractions Myself/ }).click();
  await page.getByRole("button", { name: "Add Gardens by the Bay" }).click();
  await page.getByRole("button", { name: "Add National Gallery Singapore" }).click();
  await page.goto("/planner");
  await page.getByRole("button", { name: /Balanced/ }).click();
  await page.getByRole("checkbox", { name: /rainy-day backup/i }).check();
  await page.getByRole("button", { name: "Generate ONE itinerary" }).click();
  await expect(page).toHaveURL(/\/trip\/[^/]+$/, { timeout: 30_000 });
}

async function registeredToken(request) {
  const response = await request.post(`${apiBase}/auth/register`, {
    data: { name: "Singapore FYP Traveller", email: `api-${Date.now()}@nuogo.test`, password: "Nuogo123!" }
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).token;
}

test("guest cannot enter planner workspace", async ({ page }) => {
  await page.goto("/planner");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fplanner$/);
});

test("registered MANUAL flow produces one validated Singapore workspace", async ({ page }, testInfo) => {
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  await generateManualTrip(page);

  await expect(page.getByText(/Validated trip workspace/)).toContainText("Balanced");
  const validation = page.getByRole("region", { name: "Itinerary validation summary" });
  await expect(validation.getByText("Validated")).toBeVisible();
  await expect(validation.getByText("Within hard budget")).toBeVisible();
  await expect(validation.getByText(/Grounded attractions:/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Deterministic trip budget" })).toContainText("S$");
  await expect(page.getByRole("region", { name: "Rainy-day contingency" })).toContainText("Inactive");
  await expect(page.getByRole("region", { name: "Rainy-day contingency" })).toContainText("Demo fixture");
  if (testInfo.project.name === "desktop-chromium") {
    await expect(page.locator(".leaflet-container")).toBeVisible();
  }
  if (testInfo.project.name === "desktop-chromium") {
    await expect(page.getByRole("link", { name: "My trips" })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Save to My trips" }).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/CNY|Beijing|Shanghai|Xi'an|BUDGET_SAVING|SUPPORTING_ONLY/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

  await page.screenshot({ path: `.artifacts/${testInfo.project.name}-singapore-workspace.png`, fullPage: true });
  expect(consoleErrors).toEqual([]);
});

test("registered AUTO flow uses the same Singapore planner and creates one run", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The AUTO contract is viewport-independent.");
  await enterRegisteredPlanner(page);
  await expect(page.getByText("Automatic recommendations enabled")).toBeVisible();
  await page.getByRole("button", { name: "Generate ONE itinerary" }).click();
  await expect(page).toHaveURL(/\/trip\/[^/]+$/, { timeout: 30_000 });
  await expect(page.getByRole("region", { name: "Itinerary validation summary" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save to My trips" }).first()).toBeVisible();
});

test("a registered traveller saves and manages one itinerary", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One desktop persistence journey is sufficient.");
  await generateManualTrip(page);

  await page.getByRole("button", { name: "Save to My trips" }).first().click();
  await expect(page.getByRole("status")).toContainText("Itinerary saved to My trips.");
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
  const token = await registeredToken(request);
  const response = await request.post(`${apiBase}/trips/generate`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      destination: "singapore",
      departurePoint: "Changi Airport",
      arrivalPoint: "Hotel in Singapore",
      startDate: "2026-10-10",
      endDate: "2026-10-12",
      travellerCount: 2,
      budgetMinor: 6000,
      currency: "SGD",
      interests: ["CULTURE", "FOOD"],
      preferredSights: [],
      transportPreferenceMode: "AUTO_CHEAPEST",
      preferredTransportModes: [],
      attractionSelectionMode: "AUTO",
      selectedAttractions: [],
      travelStyle: "BALANCED",
      dailyAttractionTarget: 12,
      rainyDayBackupEnabled: false,
      otherPreferences: "",
      language: "en",
      consentToLlmProcessing: true
    }
  });
  const body = await response.json();

  expect(response.status()).toBe(422);
  expect(body.error.code).toBe("GENERATION_CONSTRAINTS_UNSATISFIED");
  expect(body).not.toHaveProperty("itineraryRun");
});
