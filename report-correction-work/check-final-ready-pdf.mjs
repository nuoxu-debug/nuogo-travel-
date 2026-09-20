import fs from "node:fs/promises";
import path from "node:path";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const pdfPath = path.join(process.env.LOCALAPPDATA, "Temp", "Nuogo_FYP_Final_Report_Chapter1-3_FINAL_READY.pdf");
const data = new Uint8Array(await fs.readFile(pdfPath));
const document = await pdfjs.getDocument({ data, disableWorker: true, useSystemFonts: true }).promise;
const suspicious = [];
let minimum = { page: 0, ratio: 1 };

for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 0.28 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let ink = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset] < 245 || pixels[offset + 1] < 245 || pixels[offset + 2] < 245) ink += 1;
  }
  const ratio = ink / (pixels.length / 4);
  if (ratio < minimum.ratio) minimum = { page: pageNumber, ratio };
  if (ratio < 0.002) suspicious.push({ page: pageNumber, ratio });
}

console.log(JSON.stringify({ pages: document.numPages, suspicious, minimum }, null, 2));
