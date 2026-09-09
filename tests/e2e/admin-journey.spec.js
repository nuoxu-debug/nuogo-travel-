import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nuogo-language", "en");
    localStorage.setItem("nuogo-language-default", "zh-v4");
  });
});

test("administrator updates cost evidence used by the next generated trip", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One shared demo administrator journey is sufficient.");

  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@nuogo.test");
  await page.getByLabel("Password", { exact: true }).fill("NuogoAdmin123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/planner$/);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "System Administrator" })).toBeVisible();
  await page.getByRole("tab", { name: "Cost references" }).click();

  const foodRows = page.getByRole("row").filter({ hasText: "Food" });
  await expect(foodRows).toHaveCount(3);
  const balancedFoodRow = foodRows.nth(1);
  await balancedFoodRow.getByRole("button", { name: /Edit / }).click();
  const sourceName = page.getByRole("textbox", { name: "Source name" });
  await sourceName.fill("E2E reviewed balanced meal evidence");
  await page.getByRole("button", { name: "Save cost reference" }).click();
  await expect(balancedFoodRow).toContainText("E2E reviewed balanced meal evidence");

  await page.goto("/planner");
  await page.getByRole("button", { name: "Generate ONE itinerary" }).click();
  await expect(page.getByText(/Validated trip workspace/)).toBeVisible({ timeout: 30_000 });

  const tripId = new URL(page.url()).pathname.split("/").at(-1);
  const token = await page.evaluate(() => localStorage.getItem("nuogo-token"));
  const tripResponse = await request.get(`http://127.0.0.1:8788/api/trips/${tripId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(tripResponse.ok()).toBeTruthy();
  expect(JSON.stringify(await tripResponse.json())).toContain("E2E reviewed balanced meal evidence");
});
