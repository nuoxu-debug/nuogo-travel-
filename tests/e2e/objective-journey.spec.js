import { expect, test } from "@playwright/test";

const apiBase = "http://127.0.0.1:8788/api";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nuogo-language", "en");
    localStorage.setItem("nuogo-language-default", "zh-v4");
  });
});

async function registerTraveller(page, returnTo = "/discover/singapore") {
  const credentials = { email: `singapore-${Date.now()}@nuogo.test`, password: "Nuogo123!" };
  await page.goto(`/register?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByLabel("Full name").fill("Singapore FYP Traveller");
  await page.getByLabel("Email address").fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(new RegExp(`${returnTo.replace("/", "\\/")}$`));
  return credentials;
}

async function enterRegisteredPlanner(page) {
  const credentials = await registerTraveller(page);
  await page.goto("/planner");
  await expect(page).toHaveURL(/\/planner$/);
  return credentials;
}

async function generateManualTrip(page) {
  const credentials = await enterRegisteredPlanner(page);
  await page.getByRole("link", { name: "Choose attractions" }).click();
  await expect(page).toHaveURL(/\/discover\/singapore$/);
  await expect(page.getByRole("heading", { name: "Discover Singapore Attractions" })).toBeVisible();
  await page.getByRole("radio", { name: /Choose Attractions Myself/ }).click();
  await page.getByRole("button", { name: "Add Gardens by the Bay" }).click();
  await page.getByRole("button", { name: "Add National Gallery Singapore" }).click();
  await page.goto("/planner");
  await page.getByRole("button", { name: /Balanced/ }).click();
  await page.getByRole("checkbox", { name: /rainy-day backup/i }).check();
  const generation = page.waitForResponse(response => response.url() === `${apiBase}/trips/generate` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Generate ONE itinerary" }).click();
  const response = await generation;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON().rainyDayBackupEnabled).toBe(true);
  const result = await response.json();
  await expect(page).toHaveURL(/\/trip\/[^/]+$/, { timeout: 30_000 });
  return { ...credentials, result };
}

async function registeredToken(request) {
  const response = await request.post(`${apiBase}/auth/register`, {
    data: { name: "Singapore FYP Traveller", email: `api-${Date.now()}@nuogo.test`, password: "Nuogo123!" }
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).token;
}

test("anonymous visitors can enter the planner without creating an account", async ({ page }) => {
  await page.goto("/planner");
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.getByRole("button", { name: "Generate ONE itinerary" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("nuogo-token"))).toBeNull();
});

test("anonymous visitors browse, generate, then register to save their preview", async ({ page }, testInfo) => {
  await page.goto("/login?returnTo=%2Fdiscover%2Fsingapore", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Browse Singapore", exact: true }).click();
  await expect(page).toHaveURL(/\/discover\/singapore$/);
  await expect(page.getByRole("heading", { name: "Discover Singapore Attractions" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Let Nuogo Suggest/ })).toBeChecked();
  await expect(page.locator(".discovery-card").first()).toBeVisible();

  if (page.viewportSize().width <= 980) {
    const list = await page.locator(".discovery-list").boundingBox();
    const lastCard = await page.locator(".discovery-card").last().boundingBox();
    expect(lastCard.y + lastCard.height).toBeLessThanOrEqual(list.y + list.height + 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole("radio", { name: /Let Nuogo Suggest/ }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("public-discovery.png"), animations: "disabled" });
  await page.getByRole("link", { name: "Continue to Preferences" }).click();
  await expect(page).toHaveURL(/\/planner$/);
  expect(await page.evaluate(() => localStorage.getItem("nuogo-token"))).toBeNull();
  const generation = page.waitForResponse(response => response.url() === `${apiBase}/trips/generate` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Generate ONE itinerary" }).click();
  const generated = await generation;
  expect(generated.status()).toBe(201);
  expect(generated.request().headers()).not.toHaveProperty("authorization");
  const result = await generated.json();
  expect(result.state).toBe("FINAL_VALIDATED");
  expect(result.trip.persistenceScope).toBe("PREVIEW");
  await expect(page).toHaveURL(/\/trip\/[^/]+$/, { timeout: 30_000 });
  const previewPath = new URL(page.url()).pathname;
  await expect(page.getByRole("region", { name: "Itinerary validation summary" })).toContainText("Validated");
  await page.getByRole("button", { name: "Save to My trips" }).first().click();
  await expect(page).toHaveURL(`/login?returnTo=${encodeURIComponent(previewPath)}`);
  await page.getByLabel("Email address").fill(`missing-${Date.now()}@nuogo.test`);
  await page.getByLabel("Password", { exact: true }).fill("WrongPassword123!");
  const rejectedLogin = page.waitForResponse(response => response.url() === `${apiBase}/auth/login`);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect((await rejectedLogin).status()).toBe(401);
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await page.evaluate(id => JSON.parse(sessionStorage.getItem(`nuogo-trip-${id}`))?.persistenceScope, result.trip.id)).toBe("PREVIEW");
  await page.getByRole("link", { name: "Create account", exact: true }).last().click();
  await expect(page).toHaveURL(`/register?returnTo=${encodeURIComponent(previewPath)}`);
  await page.getByLabel("Full name").fill("Anonymous Preview Traveller");
  await page.getByLabel("Email address").fill(`preview-${Date.now()}@nuogo.test`);
  await page.getByLabel("Password", { exact: true }).fill("Nuogo123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(previewPath);
  await expect(page.getByRole("button", { name: "Save to My trips" }).first()).toBeVisible();
  const saved = page.waitForResponse(response => response.url() === `${apiBase}/trips/save-preview` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Save to My trips" }).first().click();
  expect((await saved).status()).toBe(201);
  await expect(page.getByRole("status")).toContainText("Itinerary saved to My trips.");
  await page.goto("/archive");
  await expect(page.getByRole("button", { name: "Open itinerary" })).toHaveCount(1);
});

test.describe("site-controlled time fields", () => {
  test.use({ locale: "zh-CN" });

  test("keeps dates separate from optional English times in a Chinese browser", async ({ page }, testInfo) => {
    await enterRegisteredPlanner(page);
    const arrival = page.getByRole("textbox", { name: "Arrival time (optional)", exact: true });
    const departure = page.getByRole("textbox", { name: "Departure time (optional)", exact: true });
    await expect(page.locator('input[type="date"]')).toHaveCount(2);
    await expect(arrival).toHaveAttribute("placeholder", "HH:mm");
    await expect(departure).toHaveAttribute("placeholder", "HH:mm");
    await arrival.fill("09:30");
    await arrival.press("Tab");
    await page.getByRole("button", { name: "Choose time: Arrival time (optional)" }).click();
    const picker = page.getByRole("dialog", { name: "Choose time: Arrival time (optional)" });
    await expect(picker).toBeVisible();
    await expect(picker.locator(".flatpickr-days")).toHaveCount(0);
    await picker.getByRole("spinbutton", { name: "Hour" }).fill("14");
    await picker.getByRole("spinbutton", { name: "Hour" }).press("Tab");
    await expect(arrival).toHaveValue("14:30");
    const bounds = await picker.boundingBox();
    const header = await page.locator("header.nuogo-shell").boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width);
    expect(bounds.y).toBeGreaterThanOrEqual(header.y + header.height);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize().height);
    expect(await picker.innerText()).not.toMatch(/[\u3400-\u9fff]/);
    await page.screenshot({ path: testInfo.outputPath("optional-english-times.png"), animations: "disabled" });
    await page.getByRole("button", { name: "Clear: Arrival time (optional)" }).click();
    await expect(arrival).toHaveValue("");
  });
});

test("registered MANUAL flow produces one validated Singapore workspace", async ({ page }, testInfo) => {
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  const { result } = await generateManualTrip(page);

  await expect(page.getByText(/Validated trip workspace/)).toContainText("Balanced");
  const validation = page.getByRole("region", { name: "Itinerary validation summary" });
  await expect(validation.getByText("Validated")).toBeVisible();
  await expect(validation.getByText("Within hard budget")).toBeVisible();
  await expect(validation.getByText(/Reference attractions:/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Deterministic trip budget" })).toContainText("S$");
  // Demo opening hours are unverified, so the planner must not invent a valid indoor replacement.
  expect(result.itineraryRun.rainyDayBackups).toEqual([]);
  await expect(validation).toContainText("Opening hours not verified");
  await expect(page.getByRole("region", { name: "Rainy-day contingency" })).toHaveCount(0);
  if (testInfo.project.name === "desktop-chromium") {
    await expect(page.locator(".leaflet-container")).toBeVisible();
  }
  if (testInfo.project.name === "desktop-chromium") {
    await expect(page.getByRole("link", { name: "My trips" })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Save to My trips" }).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/CNY|Beijing|Shanghai|Xi'an|BUDGET_SAVING|SUPPORTING_ONLY/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

  await page.screenshot({ path: testInfo.outputPath("singapore-workspace.png"), fullPage: true });
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
  const credentials = await generateManualTrip(page);

  await page.getByRole("button", { name: "Save to My trips" }).first().click();
  await expect(page.getByRole("status")).toContainText("Itinerary saved to My trips.");
  await page.getByRole("link", { name: "My trips" }).click();
  await expect(page.getByRole("heading", { name: "Your Singapore travel library." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open itinerary" })).toBeVisible();

  // Reload from the API after a real logout/login, with no cached itinerary to hide a persistence failure.
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/login?returnTo=%2Farchive");
  await page.getByLabel("Email address").fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/archive$/);
  await page.reload();
  await expect(page.getByRole("button", { name: "Open itinerary" })).toHaveCount(1);
  await page.getByRole("button", { name: "Open itinerary" }).click();
  const originalUrl = page.url();
  await page.evaluate(() => sessionStorage.clear());
  const loaded = page.waitForResponse(response => response.url() === `${apiBase}${new URL(originalUrl).pathname.replace("/trip/", "/trips/")}` && response.request().method() === "GET");
  await page.reload();
  expect((await loaded).status()).toBe(200);
  await expect(page.getByRole("region", { name: "Itinerary validation summary" })).toContainText("Validated");
  const regenerated = page.waitForResponse(response => response.url().endsWith("/regenerate") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Regenerate trip", exact: true }).first().click();
  expect((await regenerated).status()).toBe(201);
  await expect(page).not.toHaveURL(originalUrl, { timeout: 30_000 });
  await expect(page).toHaveURL(/\/trip\/[^/]+$/);
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
