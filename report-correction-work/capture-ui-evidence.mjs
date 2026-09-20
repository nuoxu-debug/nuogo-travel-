import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = "http://127.0.0.1:5173";
const evidenceDir = "C:/Users/G16/Downloads/Nuogo_Final_Report_Evidence";
const viewport = { width: 1920, height: 1080 };

await mkdir(evidenceDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));

async function setLanguage(language) {
  await page.evaluate((value) => {
    localStorage.setItem("nuogo-language", value);
    localStorage.setItem("nuogo-language-default", "zh-v4");
  }, language);
  await page.reload({ waitUntil: "networkidle" });
}

async function continueAsGuest() {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  if (await page.getByRole("button", { name: /访客身份继续|Continue as guest/ }).isVisible()) {
    await page.getByRole("button", { name: /访客身份继续|Continue as guest/ }).click();
  }
  await page.waitForURL(/\/planner(?:[?#].*)?$/);
}

async function capture(name) {
  await page.screenshot({ path: `${evidenceDir}/${name}`, fullPage: false });
}

// Chinese is the documented default. Clear prior state to prove the default UI.
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await continueAsGuest();

// Figure 3.15: destination introduction, cards, and grounded discovery map.
await page.goto(`${baseUrl}/discover/beijing`, { waitUntil: "networkidle" });
await page.locator(".leaflet-container").waitFor({ state: "visible" });
await page.getByRole("button", { name: /^(加入|Add )/ }).first().waitFor({ state: "visible" });
await page.locator(".leaflet-container").scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
await capture("Figure_3_15_Destination_Discovery.png");

// Select four visible grounded attractions before returning to the planner.
const addButtons = page.getByRole("button", { name: /^(加入|Add )/ });
for (let index = 0; index < 4; index += 1) {
  await addButtons.first().click();
}
await page.getByText(/已选择 4 个景点|4 attractions selected/).waitFor();
await page.getByRole("link", { name: /继续规划|Continue planning/ }).click();
await page.waitForURL(/\/planner(?:[?#].*)?$/);

// Figure 3.16: mode, dates, party, budget, one style, and optional contingency.
await page.locator('input[type="date"]').nth(0).fill("2026-10-10");
await page.locator('input[type="date"]').nth(1).fill("2026-10-12");
await page.locator('input[type="datetime-local"]').nth(0).fill("2026-10-10T08:00");
await page.locator('input[type="datetime-local"]').nth(1).fill("2026-10-12T20:00");
await page.getByRole("slider", { name: /总预算|Total budget/ }).fill("6000");
await page.getByRole("button", { name: /均衡|Balanced/ }).click();
const rainy = page.locator('form input[type="checkbox"]').first();
if (!(await rainy.isChecked())) await rainy.check();
await page.locator("form fieldset").nth(0).scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({ path: `${evidenceDir}/Figure_3_16A_Route_Dates_Budget.png`, fullPage: false });
await page.locator("form fieldset").nth(2).scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({ path: `${evidenceDir}/Figure_3_16B_Manual_Style_Backup.png`, fullPage: false });

// Figure 3.17: genuine role-protected supporting maintenance surface.
await context.clearCookies();
await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
await page.getByLabel(/电子邮箱|Email address/).fill("admin@nuogo.test");
await page.locator('input[type="password"]').fill("DemoAdmin1234");
await page.locator("form").getByRole("button", { name: /^(登录|Sign in)$/ }).click();
await page.waitForURL(/\/planner(?:[?#].*)?$/);
await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: /系统管理|Administration/ }).waitFor();
await page.getByRole("tab", { name: /费用参考|Cost references/ }).click();
await page.getByRole("row").filter({ hasText: /餐饮|Food and beverages/ }).first().waitFor();
await page.waitForTimeout(500);
await capture("Figure_3_17_Admin_Maintenance.png");

// Figure 3.18: English persistence demonstrated on a substantive preference view.
await setLanguage("en");
await page.goto(`${baseUrl}/planner`, { waitUntil: "networkidle" });
await page.reload({ waitUntil: "networkidle" });
await page.locator("form fieldset").nth(2).scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await capture("Figure_3_18_English_Localization.png");

console.log(JSON.stringify({ evidenceDir, url: page.url(), language: await page.evaluate(() => localStorage.getItem("nuogo-language")), errors }, null, 2));
await browser.close();
