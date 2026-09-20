import { createCanvas, loadImage } from "@napi-rs/canvas";
import { writeFile } from "node:fs/promises";

const root = "C:/Users/G16/Downloads/Nuogo_Final_Report_Evidence";
const upper = await loadImage(`${root}/Figure_3_16A_Route_Dates_Budget.png`);
const lower = await loadImage(`${root}/Figure_3_16B_Manual_Style_Backup.png`);

const crop = { x: 240, width: 1028 };
const panels = [
  { image: upper, y: 68, height: 585, label: "A. Route, dates, travellers and hard total budget" },
  { image: lower, y: 68, height: 720, label: "B. MANUAL attraction preferences, one Travel Style and optional Rainy-Day Backup" }
];
const labelHeight = 44;
const gap = 16;
const height = panels.reduce((sum, panel) => sum + labelHeight + panel.height, 0) + gap;
const canvas = createCanvas(crop.width, height);
const context = canvas.getContext("2d");
context.fillStyle = "#ffffff";
context.fillRect(0, 0, canvas.width, canvas.height);

let top = 0;
for (const [index, panel] of panels.entries()) {
  context.fillStyle = "#13281f";
  context.fillRect(0, top, crop.width, labelHeight);
  context.fillStyle = "#ffffff";
  context.font = "600 20px Arial";
  context.fillText(panel.label, 18, top + 29);
  top += labelHeight;
  context.drawImage(panel.image, crop.x, panel.y, crop.width, panel.height, 0, top, crop.width, panel.height);
  top += panel.height;
  if (index === 0) {
    context.fillStyle = "#d8dedb";
    context.fillRect(0, top, crop.width, gap);
    top += gap;
  }
}

await writeFile(`${root}/Figure_3_16_Preferences_TravelStyle.png`, canvas.toBuffer("image/png"));
console.log(JSON.stringify({ width: canvas.width, height: canvas.height }));
