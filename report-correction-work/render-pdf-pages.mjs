import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const root = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.join(process.env.LOCALAPPDATA, "Temp", "Nuogo_FYP_Final_Report_Chapter1-3_FINAL_ALIGNED.pdf");
const output = path.join(root, "pdf-pages");
const pages = [43, 45, 62, 74, 79, 84, 87, 93, 94, 95, 97];
await fs.mkdir(output, { recursive: true });

const data = new Uint8Array(await fs.readFile(pdfPath));
const document = await pdfjs.getDocument({ data, disableWorker: true, useSystemFonts: true }).promise;
for (const pageNumber of pages) {
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.45 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;
  await fs.writeFile(path.join(output, `page-${pageNumber}.png`), canvas.toBuffer("image/png"));
}

console.log(`Rendered ${pages.length}/${document.numPages} pages to ${output}`);
