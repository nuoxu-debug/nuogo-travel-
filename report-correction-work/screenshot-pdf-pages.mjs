import { chromium } from "../.worktrees/report-aligned-nuogo/node_modules/playwright/index.mjs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pdf = path.join(process.env.LOCALAPPDATA, "Temp", "Nuogo_FYP_Final_Report_Chapter1-3_FINAL_ALIGNED.pdf");
const output = path.join(path.dirname(fileURLToPath(import.meta.url)), "pdf-pages");
await mkdir(output, { recursive: true });
const pages = [43, 45, 62, 75, 80, 85, 88, 94, 95, 96, 98];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 1 });
  for (const number of pages) {
    await page.goto(`${pathToFileURL(pdf).href}#page=${number}&zoom=page-width`, { waitUntil: "load" });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(output, `page-${number}.png`), fullPage: false });
  }
} finally {
  await browser.close();
}
console.log(output);
