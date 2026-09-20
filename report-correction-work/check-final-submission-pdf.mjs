import fs from "node:fs/promises";
import path from "node:path";
import { createCanvas, DOMMatrix, ImageData, Path2D, loadImage } from "@napi-rs/canvas";

globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const pdfPath = "C:/Users/G16/Downloads/Nuogo_FINAL_SUBMISSION_citation_check.pdf";
const outputDir = "C:/Users/G16/OneDrive/桌面/FYP/report-correction-work/final-submission-pages";
await fs.mkdir(outputDir, { recursive: true });

const data = new Uint8Array(await fs.readFile(pdfPath));
const document = await pdfjs.getDocument({ data, disableWorker: true, useSystemFonts: true }).promise;
let revisedPage = null;
let referencesPage = null;
const suspicious = [];

for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
  const page = await document.getPage(pageNumber);
  const text = (await page.getTextContent()).items.map((item) => item.str).join(" ");
  const compact = text.replace(/\s+/g, "").toLowerCase();
  if (compact.includes("fluentllmoutputdoesnotnecessarilyrepresentafeasibleorfullysupportedtravelplan")) revisedPage = pageNumber;
  if (compact.includes("references") && compact.includes("academicliterature")) referencesPage = pageNumber;

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
  if (ratio < 0.002) suspicious.push({ page: pageNumber, ratio });
}

const pagesToRender = [...new Set([revisedPage, referencesPage, document.numPages].filter(Boolean))];
const files = [];
for (const pageNumber of pagesToRender) {
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.25 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  const file = path.join(outputDir, `page-${pageNumber}.png`);
  await fs.writeFile(file, canvas.toBuffer("image/png"));
  files.push(file);
}

const images = await Promise.all(files.map((file) => loadImage(file)));
const width = Math.max(...images.map((image) => image.width));
const height = Math.max(...images.map((image) => image.height));
const contact = createCanvas(width * images.length, height);
const context = contact.getContext("2d");
context.fillStyle = "white";
context.fillRect(0, 0, contact.width, contact.height);
images.forEach((image, index) => context.drawImage(image, index * width, 0));
const contactSheet = path.join(outputDir, "contact-sheet.png");
await fs.writeFile(contactSheet, contact.toBuffer("image/png"));

console.log(JSON.stringify({ pages: document.numPages, revisedPage, referencesPage, suspicious, files, contactSheet }, null, 2));
