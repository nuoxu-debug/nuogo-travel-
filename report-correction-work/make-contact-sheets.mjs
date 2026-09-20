import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const root = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(root, "pdf-pages");
const groups = [[43, 45, 62, 74, 79, 84], [87, 93, 94, 95, 97]];

for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
  const pages = groups[groupIndex];
  const canvas = createCanvas(1320, 1820);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#dfe4e8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pages.length; index += 1) {
    const pageNumber = pages[index];
    const image = await loadImage(path.join(dir, `page-${pageNumber}.png`));
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 20 + column * 435;
    const y = 55 + row * 870;
    const width = 400;
    const height = Math.round(image.height * (width / image.width));
    ctx.fillStyle = "#111827";
    ctx.font = "bold 22px Arial";
    ctx.fillText(`Page ${pageNumber}`, x, y - 14);
    ctx.drawImage(image, x, y, width, height);
  }
  await fs.writeFile(path.join(root, `contact-${groupIndex + 1}.png`), canvas.toBuffer("image/png"));
}
