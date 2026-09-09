import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nuogo-language", "en");
    localStorage.setItem("nuogo-language-default", "zh-v4");
  });
});

test("the shared shell has no horizontal overflow at Phase 1 viewports", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 900 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

    if (viewport.width < 1024) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    } else {
      await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    }
  }
});

test("the shell presents guest, registered, and administrator modes with friendly labels", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Account-mode verification is viewport-independent.");

  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page.getByTestId("user-mode-badge")).toHaveText("Guest Mode");

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Nuogo Registered Traveller");
  await page.getByLabel("Email address").fill(`phase-one-${Date.now()}@nuogo.test`);
  await page.getByLabel("Password", { exact: true }).fill("Nuogo123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("user-mode-badge")).toHaveText("Registered User");

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@nuogo.test");
  await page.locator('input[type="password"]').fill("NuogoAdmin123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("user-mode-badge")).toHaveText("System Administrator");
});
