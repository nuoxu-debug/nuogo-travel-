import { chromium } from "playwright-core";
import { demoTrip } from "../client/tests/fixtures.js";

const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const consoleErrors = [];

async function preparePage(viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  return page;
}

async function revealPage(page) {
  await page.evaluate(async () => {
    const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
    for (let top = 0; top < document.documentElement.scrollHeight; top += Math.max(320, window.innerHeight * 0.65)) {
      window.scrollTo({ top, behavior: "instant" });
      await wait(120);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForTimeout(500);
}

const desktop = await preparePage({ width: 1440, height: 1000 });
await revealPage(desktop);
await desktop.screenshot({
  path: "artifacts/nuogo-redesign-desktop.png",
  fullPage: true
});

const imageFailures = await desktop.locator("img").evaluateAll((images) => images
  .filter((image) => image.complete && image.naturalWidth === 0)
  .map((image) => image.currentSrc || image.src));

const mobile = await preparePage({ width: 390, height: 844 });
await revealPage(mobile);
await mobile.screenshot({
  path: "artifacts/nuogo-redesign-mobile.png",
  fullPage: true
});

const login = await preparePage({ width: 1440, height: 960 });
await login.evaluate(() => localStorage.setItem("nuogo-language", "en"));
await login.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
await login.screenshot({
  path: "artifacts/nuogo-guest-login.png",
  fullPage: true
});
await login.getByRole("button", { name: "Continue as guest" }).click();
await login.getByText("Travel brief").waitFor();

const workspace = await preparePage({ width: 1600, height: 1000 });
await workspace.evaluate((trip) => {
  window.sessionStorage.setItem("nuogo-trip-trip-1", JSON.stringify(trip));
}, demoTrip());
await workspace.goto("http://localhost:5173/trip/trip-1", { waitUntil: "networkidle" });
await workspace.waitForSelector(".leaflet-tile-loaded", { timeout: 15000 });
await revealPage(workspace);
await workspace.screenshot({
  path: "artifacts/nuogo-redesign-workspace.png",
  fullPage: true
});

const report = {
  imageFailures,
  consoleErrors,
  mapTiles: await workspace.locator(".leaflet-tile-loaded").count(),
  desktopOverflow: await desktop.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  mobileOverflow: await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  workspaceOverflow: await workspace.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  ,
  guestRedirect: login.url()
};

console.log(JSON.stringify(report, null, 2));
await browser.close();
