import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const pdfPath = path.join(process.env.LOCALAPPDATA, "Temp", "Nuogo_FYP_Final_Report_Chapter1-3_FINAL_READY.pdf");
const output = path.join(path.dirname(fileURLToPath(import.meta.url)), "final-ready-pages");
await fs.mkdir(output, { recursive: true });

const data = new Uint8Array(await fs.readFile(pdfPath));
const document = await pdfjs.getDocument({ data, disableWorker: true, useSystemFonts: true }).promise;
const pages = [84, 93, 94, 95, 96, 97, 98, 99, 100, 101];
const found = [];

for (const pageNumber of pages) {
  const page = await document.getPage(pageNumber);
  const text = (await page.getTextContent()).items.map((item) => item.str).join(" ");
  found.push({ page: pageNumber, textPreview: text.slice(0, 120) });
  const viewport = page.getViewport({ scale: 1.35 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;
  await fs.writeFile(path.join(output, `page-${pageNumber}.png`), canvas.toBuffer("image/png"));
}

console.log(JSON.stringify({ pages: document.numPages, found, output }, null, 2));
