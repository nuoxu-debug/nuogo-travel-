import fs from "node:fs/promises";
import path from "node:path";
import { createCanvas, DOMMatrix, ImageData, Path2D, loadImage } from "@napi-rs/canvas";

globalThis.DOMMatrix = DOMMatrix;
globalThis.ImageData = ImageData;
globalThis.Path2D = Path2D;

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const pdfPath = "C:/Users/G16/Downloads/Nuogo_SUBMISSION_READY_reference_check.pdf";
const outputDir = "C:/Users/G16/OneDrive/桌面/FYP/report-correction-work/submission-ready-pages";
await fs.mkdir(outputDir, { recursive: true });

const data = new Uint8Array(await fs.readFile(pdfPath));
const document = await pdfjs.getDocument({ data, disableWorker: true, useSystemFonts: true }).promise;
const suspicious = [];
const textPages = [];
let minimum = { page: 0, ratio: 1 };
let tablePage = null;
let referencesPage = null;
let tableSourceNotePage = null;

for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
  const page = await document.getPage(pageNumber);
  const text = (await page.getTextContent()).items.map((item) => item.str).join(" ");
  const compactText = text.replace(/\s+/g, "").toLowerCase();
  if (compactText.includes("table3.11preparedbudgetreferencedataset")) tablePage = pageNumber;
  if (compactText.includes("references") && compactText.includes("academicliterature")) referencesPage = pageNumber;
  if (compactText.includes("sourcenote:thevaluesaremaintainedplanningreferences")) tableSourceNotePage = pageNumber;
  textPages.push({ page: pageNumber, length: text.trim().length });

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
  if (ratio < 0.002) suspicious.push({ page: pageNumber, ratio, textLength: text.trim().length });
}

const pagesToRender = [...new Set([tablePage, tableSourceNotePage, referencesPage, document.numPages - 3, document.numPages - 2, document.numPages - 1, document.numPages].filter(Boolean))];
const rendered = [];
for (const pageNumber of pagesToRender) {
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.25 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;
  const file = path.join(outputDir, `page-${pageNumber}.png`);
  await fs.writeFile(file, canvas.toBuffer("image/png"));
  rendered.push(file);
}

const images = await Promise.all(rendered.map((file) => loadImage(file)));
const cellWidth = Math.max(...images.map((image) => image.width));
const cellHeight = Math.max(...images.map((image) => image.height));
const columns = 2;
const rows = Math.ceil(images.length / columns);
const contact = createCanvas(cellWidth * columns, cellHeight * rows);
const contactContext = contact.getContext("2d");
contactContext.fillStyle = "#ffffff";
contactContext.fillRect(0, 0, contact.width, contact.height);
for (let index = 0; index < images.length; index += 1) {
  contactContext.drawImage(images[index], (index % columns) * cellWidth, Math.floor(index / columns) * cellHeight);
}
const contactSheet = path.join(outputDir, "contact-sheet.png");
await fs.writeFile(contactSheet, contact.toBuffer("image/png"));

console.log(JSON.stringify({
  pages: document.numPages,
  tablePage,
  tableSourceNotePage,
  referencesPage,
  suspicious,
  minimum,
  finalTextLengths: textPages.slice(-8),
  rendered,
  contactSheet,
}, null, 2));
