import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
const guestButton = page.getByRole("button", { name: /访客身份继续|Continue as guest/ });
await guestButton.click();
await page.getByText(/旅行需求|Travel brief/).waitFor();

const generated = await page.evaluate(async () => {
  const token = localStorage.getItem("nuogo-token");
  const response = await fetch("/api/trips/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      destination: "huangshan",
      departureCity: "shanghai",
      days: 2,
      totalBudget: 4800,
      interests: ["natural_scenery", "historical_relics"],
      groupType: "student_group",
      accommodation: "budget_hotel",
      language: "zh",
      startDate: "2026-08-10"
    })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Generation failed");
  sessionStorage.setItem(`nuogo-trip-${body.trip.id}`, JSON.stringify({
    ...body.trip,
    variants: body.variants
  }));
  return body;
});

await page.goto(`http://localhost:5173/compare/${generated.trip.id}`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /选择此方案|Choose this plan/ }).first().click();
await page.getByText("Trip workspace").waitFor();
await page.screenshot({
  path: "artifacts/nuogo-package-selection-fixed.png",
  fullPage: true
});

console.log(JSON.stringify({
  packageCount: generated.variants.length,
  selectedVariantId: generated.variants[0].id,
  finalUrl: page.url(),
  consoleErrors
}, null, 2));

await browser.close();
