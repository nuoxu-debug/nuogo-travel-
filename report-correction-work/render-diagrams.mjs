import { chromium } from "../.worktrees/report-aligned-nuogo/node_modules/playwright/index.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, "diagrams");
await mkdir(output, { recursive: true });

const palette = {
  ink: "#17212b",
  line: "#52616f",
  blue: "#2764a5",
  blueSoft: "#eaf2fb",
  green: "#237a66",
  greenSoft: "#e8f5f1",
  amber: "#9a6700",
  amberSoft: "#fff4d6",
  red: "#a23a3a",
  redSoft: "#fbecec",
  gray: "#f5f7f8",
  white: "#ffffff"
};

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

function lines(text, x, y, { size = 27, weight = 500, anchor = "middle", color = palette.ink, lineHeight = 34 } = {}) {
  const parts = Array.isArray(text) ? text : String(text).split("\n");
  const startY = y - ((parts.length - 1) * lineHeight) / 2;
  return `<text x="${x}" y="${startY}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${color}">${parts.map((part, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${esc(part)}</tspan>`).join("")}</text>`;
}

function box(x, y, w, h, text, { fill = palette.white, stroke = palette.line, radius = 12, size = 27, weight = 600, color = palette.ink } = {}) {
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>${lines(text, x + w / 2, y + h / 2 + 8, { size, weight, color })}</g>`;
}

function arrow(x1, y1, x2, y2, { color = palette.line, dashed = false, width = 3 } = {}) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dashed ? 'stroke-dasharray="10 8"' : ""} marker-end="url(#arrow)"/>`;
}

function connector(pathData, { color = palette.line, dashed = false, width = 3, end = true } = {}) {
  return `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="${width}" ${dashed ? 'stroke-dasharray="10 8"' : ""} ${end ? 'marker-end="url(#arrow)"' : ""}/>`;
}

function base(width, height, title, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="${palette.line}"/></marker></defs>
  <rect width="100%" height="100%" fill="white"/>
  ${lines(title, 60, 62, { anchor: "start", size: 34, weight: 700 })}
  <line x1="60" y1="94" x2="${width - 60}" y2="94" stroke="#c9d1d8" stroke-width="2"/>
  ${content}
  </svg>`;
}

const figures = {};

figures.figure2_1 = base(1600, 900, "Nuogo Conceptual Framework", `
  ${box(70, 155, 300, 120, "User Requirements", { fill: palette.blueSoft, stroke: palette.blue })}
  ${box(70, 355, 300, 120, "Grounded Attraction\nData", { fill: palette.greenSoft, stroke: palette.green })}
  ${connector("M370 215 C430 215 430 310 485 310")}
  ${connector("M370 415 C430 415 430 310 485 310")}
  ${box(485, 245, 320, 130, "MANUAL / AUTO\nPreference Resolution", { fill: palette.gray })}
  ${arrow(805, 310, 895, 310)}
  ${box(895, 245, 310, 130, "Select ONE\nTravel Style", { fill: palette.amberSoft, stroke: palette.amber })}
  ${arrow(1205, 310, 1295, 310)}
  ${box(1295, 245, 245, 130, "LLM-Assisted\nDrafting", { fill: palette.blueSoft, stroke: palette.blue })}
  ${arrow(1417, 375, 1417, 490)}
  ${box(1230, 490, 310, 120, "Deterministic\nValidation", { fill: palette.gray })}
  ${arrow(1230, 550, 1135, 550)}
  ${box(835, 490, 300, 120, "Hard Budget\nValidation", { fill: palette.redSoft, stroke: palette.red })}
  ${arrow(835, 550, 740, 550)}
  ${box(415, 490, 325, 120, "Optional Rainy-Day\nContingency", { fill: palette.blueSoft, stroke: palette.blue })}
  ${arrow(577, 610, 577, 680)}
  ${box(415, 680, 325, 120, "Backup Feasibility /\nBudget Recheck", { fill: palette.greenSoft, stroke: palette.green })}
  ${arrow(740, 740, 860, 740)}
  ${box(860, 680, 430, 120, "ONE Validated Itinerary\nand Workspace", { fill: palette.greenSoft, stroke: palette.green })}
  ${lines("Grounded facts and deterministic controls remain outside unrestricted LLM authority.", 800, 850, { size: 23, weight: 400, color: palette.line })}
`);

figures.figure3_1 = base(1600, 900, "Hybrid Agile-Waterfall Methodology", `
  ${lines("Structured academic stages", 70, 145, { anchor: "start", size: 26, weight: 700, color: palette.blue })}
  ${box(70, 180, 235, 110, "Planning", { fill: palette.blueSoft, stroke: palette.blue })}
  ${arrow(305, 235, 350, 235)}
  ${box(350, 180, 235, 110, "Requirements", { fill: palette.blueSoft, stroke: palette.blue })}
  ${arrow(585, 235, 630, 235)}
  ${box(630, 180, 235, 110, "System Design", { fill: palette.blueSoft, stroke: palette.blue })}
  ${arrow(865, 235, 910, 235)}
  ${box(910, 180, 235, 110, "Prototype", { fill: palette.blueSoft, stroke: palette.blue })}
  ${arrow(1145, 235, 1190, 235)}
  ${box(1190, 180, 335, 110, "Documentation Baseline", { fill: palette.blueSoft, stroke: palette.blue })}
  ${lines("Iterative implementation and verification", 70, 385, { anchor: "start", size: 26, weight: 700, color: palette.green })}
  ${box(130, 430, 245, 100, "Sprint 1\nCore / Security / UI", { fill: palette.greenSoft, stroke: palette.green, size: 23 })}
  ${arrow(375, 480, 480, 480)}
  ${box(480, 430, 280, 100, "Sprint 2\nPlanning / LLM / Budget", { fill: palette.greenSoft, stroke: palette.green, size: 23 })}
  ${arrow(760, 480, 865, 480)}
  ${box(865, 430, 330, 100, "Sprint 3\nGrounding / Discovery / Backup", { fill: palette.greenSoft, stroke: palette.green, size: 23 })}
  ${arrow(1195, 480, 1300, 480)}
  ${box(1300, 430, 220, 100, "Integration\nand Testing", { fill: palette.greenSoft, stroke: palette.green, size: 23 })}
  ${connector("M1410 530 C1410 640 1040 660 820 660 C560 660 280 640 250 530", { color: palette.green })}
  ${lines("Plan  →  Design  →  Develop  →  Test  →  Review", 820, 650, { size: 25, weight: 700, color: palette.green })}
  ${box(245, 735, 1110, 90, "Supporting maintenance: supported destinations, POIs, and cost-reference records", { fill: palette.gray, stroke: "#9aa6b2", size: 25 })}
`);

figures.figure3_8 = base(1600, 900, "Nuogo Simplified System Architecture", `
  ${box(80, 150, 1440, 105, "Presentation Layer  |  React + Vite\nAuthentication • Discovery • Preferences • ONE Travel Style • ONE Workspace", { fill: palette.blueSoft, stroke: palette.blue, size: 24 })}
  ${arrow(800, 255, 800, 315)}
  ${box(80, 315, 1440, 125, "Application and Security Layer  |  Node.js + Express\nAuthentication • Authorization • Input Validation • Prompt Screening • Localization", { fill: palette.gray, size: 24 })}
  ${arrow(800, 440, 800, 500)}
  ${box(80, 500, 1440, 145, "Planning Services\nAttraction Grounding • MANUAL/AUTO Resolution • LLM Drafting • Deterministic Validation\nHard-Budget Calculation • Optional Inactive Rainy-Day Contingency • Provenance", { fill: palette.greenSoft, stroke: palette.green, size: 23 })}
  ${box(80, 720, 420, 105, "MySQL Persistence\nUsers • Trips • Runs • Legs • Provenance\nValidation / Repairs • Cost References", { fill: palette.amberSoft, stroke: palette.amber, size: 21 })}
  ${box(590, 720, 420, 105, "Supporting Maintenance\nDestinations • POIs • Cost References", { fill: palette.gray, size: 22 })}
  ${box(1100, 720, 200, 105, "OpenTripMap\nGrounded POIs", { fill: palette.blueSoft, stroke: palette.blue, size: 22 })}
  ${box(1340, 720, 180, 105, "OpenRouter\nDeepSeek V3.1", { fill: palette.blueSoft, stroke: palette.blue, size: 21 })}
  ${arrow(290, 720, 430, 645)}${arrow(800, 720, 800, 645)}${arrow(1200, 720, 1130, 645)}${arrow(1430, 720, 1350, 645)}
`);

function entity(x, y, w, title, fields, { fill = palette.white, stroke = palette.line, titleSize = 25 } = {}) {
  const rowHeight = 31;
  const h = 54 + fields.length * rowHeight;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/><rect x="${x}" y="${y}" width="${w}" height="52" rx="8" fill="${stroke}"/><rect x="${x}" y="${y + 42}" width="${w}" height="10" fill="${stroke}"/>${lines(title, x + 16, y + 34, { anchor: "start", size: titleSize, weight: 700, color: palette.white })}${fields.map((field, index) => lines(field, x + 16, y + 78 + index * rowHeight, { anchor: "start", size: 19, weight: index === 0 ? 600 : 400 })).join("")}</g>`;
}

figures.figure3_10 = base(1800, 1000, "Nuogo Logical Entity Relationship Diagram", `
  ${entity(50, 150, 270, "USER", ["PK user_id", "email / password_hash", "role / language", "account status"], { stroke: palette.blue })}
  ${entity(390, 125, 390, "TRIP", ["PK trip_id", "FK user_id", "preferences_json", "objective_payload_json", "status / title", "one current logical itinerary"], { stroke: palette.green })}
  ${entity(860, 120, 350, "ITINERARY_RUN", ["PK run_id", "FK trip_id", "selected Travel Style", "estimated total", "run state / summary"], { stroke: palette.green })}
  ${entity(1300, 125, 410, "TRIP_LEG", ["PK leg_id", "FK run_id", "origin / destination", "mode / duration / distance", "estimated cost / source"], { stroke: palette.line })}
  ${entity(50, 600, 330, "SUPPORTED_DESTINATION", ["PK destination_id", "city / country", "supported status", "localized display data"], { stroke: palette.blue, titleSize: 20 })}
  ${entity(450, 575, 350, "CANONICAL_POI", ["PK poi_id", "FK destination_id", "OpenTripMap xid", "name / category", "coordinates / source"], { stroke: palette.blue })}
  ${entity(870, 585, 350, "COST_REFERENCE", ["PK reference_id", "FK destination_id", "category / amount", "source / reviewed date", "availability status"], { stroke: palette.amber })}
  ${entity(1290, 560, 420, "TRACEABILITY RECORDS", ["PROVENANCE", "VALIDATION_ISSUE", "ITINERARY_REPAIR", "FK trip_id / run_id", "source and outcome metadata"], { stroke: palette.line })}
  ${connector("M320 245 L390 245", { end: false })}${lines("1 : M", 355, 229, { size: 18, weight: 600 })}
  ${connector("M780 245 L860 245", { end: false })}${lines("1 : M", 820, 229, { size: 18, weight: 600 })}
  ${connector("M1210 245 L1300 245", { end: false })}${lines("1 : M", 1255, 229, { size: 18, weight: 600 })}
  ${connector("M215 600 L215 500 C215 455 520 455 520 365", { end: false })}
  ${connector("M380 720 L450 720", { end: false })}${lines("1 : M", 415, 704, { size: 18, weight: 600 })}
  ${connector("M380 780 C520 890 890 890 1030 798", { end: false })}${lines("1 : M", 715, 885, { size: 18, weight: 600 })}
  ${connector("M1080 390 C1080 500 1450 470 1450 560", { end: false })}${lines("1 : M", 1260, 492, { size: 18, weight: 600 })}
  ${connector("M1210 300 C1320 350 1450 430 1450 560", { end: false })}
  ${box(390, 390, 390, 110, "preferences_json\nMANUAL selections are high-priority preferences", { fill: palette.greenSoft, stroke: palette.green, size: 18 })}
  ${box(860, 390, 350, 110, "objective_payload_json\nDays, activities and optional inactive backup", { fill: palette.greenSoft, stroke: palette.green, size: 18 })}
  ${lines("One generation request creates one logical itinerary run. Nested preferences and itinerary details remain JSON payloads where implemented.", 900, 940, { size: 22, weight: 500, color: palette.line })}
`);

function ellipse(x, y, w, h, text, options = {}) {
  const fill = options.fill ?? palette.white;
  const stroke = options.stroke ?? palette.line;
  return `<g><ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="2.3"/>${lines(text, x + w / 2, y + h / 2 + 7, { size: options.size ?? 21, weight: 550 })}</g>`;
}

figures.figure3_11 = base(1800, 1100, "Nuogo Use Case Diagram", `
  <rect x="235" y="125" width="1330" height="860" rx="20" fill="#fbfcfd" stroke="#8795a2" stroke-width="3"/>
  ${lines("Nuogo System", 900, 170, { size: 30, weight: 700 })}
  ${lines("Traveller", 90, 475, { size: 27, weight: 700 })}
  <circle cx="120" cy="360" r="35" fill="none" stroke="${palette.ink}" stroke-width="4"/><line x1="120" y1="395" x2="120" y2="500" stroke="${palette.ink}" stroke-width="4"/><line x1="65" y1="430" x2="175" y2="430" stroke="${palette.ink}" stroke-width="4"/><line x1="120" y1="500" x2="70" y2="570" stroke="${palette.ink}" stroke-width="4"/><line x1="120" y1="500" x2="170" y2="570" stroke="${palette.ink}" stroke-width="4"/>
  ${ellipse(285, 215, 310, 80, "Register / Login / Guest", { fill: palette.blueSoft, stroke: palette.blue })}
  ${ellipse(285, 330, 310, 80, "Manage Profile", { fill: palette.blueSoft, stroke: palette.blue })}
  ${ellipse(285, 445, 310, 80, "Select Destination", { fill: palette.greenSoft, stroke: palette.green })}
  ${ellipse(285, 560, 310, 80, "Discover Attractions", { fill: palette.greenSoft, stroke: palette.green })}
  ${ellipse(285, 675, 310, 80, "Choose MANUAL / AUTO", { fill: palette.greenSoft, stroke: palette.green })}
  ${ellipse(650, 215, 330, 80, "Enter Travel Preferences", { fill: palette.gray })}
  ${ellipse(650, 330, 330, 80, "Select ONE Travel Style", { fill: palette.amberSoft, stroke: palette.amber })}
  ${ellipse(650, 445, 330, 80, "Enable Rainy-Day Backup", { fill: palette.blueSoft, stroke: palette.blue })}
  ${ellipse(650, 560, 330, 80, "Generate One Itinerary", { fill: palette.greenSoft, stroke: palette.green })}
  ${ellipse(650, 675, 330, 80, "View ONE Workspace", { fill: palette.greenSoft, stroke: palette.green })}
  ${ellipse(1040, 215, 400, 80, "View Budget / Map / Provenance", { fill: palette.gray })}
  ${ellipse(1040, 330, 400, 80, "Edit Preferences / Regenerate", { fill: palette.gray })}
  ${ellipse(1040, 445, 400, 100, "Manage Saved Itinerary\nRename • Duplicate • Archive • View • Delete", { fill: palette.gray, size: 19 })}
  ${lines("Authorised\nMaintainer", 1690, 420, { size: 25, weight: 700 })}
  ${ellipse(1040, 620, 400, 75, "Maintain Destinations", { fill: palette.amberSoft, stroke: palette.amber })}
  ${ellipse(1040, 720, 400, 75, "Maintain POIs", { fill: palette.amberSoft, stroke: palette.amber })}
  ${ellipse(1040, 820, 400, 75, "Maintain Cost References", { fill: palette.amberSoft, stroke: palette.amber })}
  ${connector("M180 430 C225 430 245 255 285 255", { end: false })}${connector("M180 430 C225 430 245 370 285 370", { end: false })}${connector("M180 430 C225 430 245 485 285 485", { end: false })}${connector("M180 430 C225 430 245 600 285 600", { end: false })}${connector("M180 430 C225 430 245 715 285 715", { end: false })}
  ${connector("M595 485 C625 485 625 255 650 255", { end: false })}${connector("M595 600 C625 600 625 370 650 370", { end: false })}${connector("M595 715 C625 715 625 485 650 485", { end: false })}${connector("M980 600 L1040 255", { end: false })}${connector("M980 715 L1040 370", { end: false })}${connector("M980 715 L1040 495", { end: false })}
  ${connector("M1640 430 C1580 430 1530 657 1440 657", { end: false })}${connector("M1640 430 C1580 430 1530 757 1440 757", { end: false })}${connector("M1640 430 C1580 430 1530 857 1440 857", { end: false })}
  ${box(300, 920, 340, 80, "OpenTripMap\nExternal grounding service", { fill: palette.blueSoft, stroke: palette.blue, size: 20 })}
  ${box(750, 920, 340, 80, "OpenRouter / DeepSeek V3.1\nExternal drafting service", { fill: palette.blueSoft, stroke: palette.blue, size: 20 })}
  ${connector("M470 920 C470 850 470 700 440 640", { dashed: true })}${connector("M920 920 C920 850 850 700 815 640", { dashed: true })}
`);

figures.figure3_12 = base(1800, 1100, "Nuogo Final System Workflow", `
  ${box(70, 135, 260, 82, "Start", { fill: palette.gray })}
  ${arrow(330, 176, 390, 176)}
  ${box(390, 135, 300, 82, "Login / Guest", { fill: palette.blueSoft, stroke: palette.blue })}
  ${arrow(690, 176, 750, 176)}
  ${box(750, 135, 300, 82, "Select Destination", { fill: palette.greenSoft, stroke: palette.green })}
  ${arrow(1050, 176, 1110, 176)}
  ${box(1110, 135, 330, 82, "Discover Attractions", { fill: palette.greenSoft, stroke: palette.green })}
  ${arrow(1440, 176, 1500, 176)}
  ${box(1500, 135, 240, 82, "MANUAL / AUTO", { fill: palette.greenSoft, stroke: palette.green })}
  ${arrow(1620, 217, 1620, 290)}
  ${box(1445, 290, 350, 90, "Enter Preferences", { fill: palette.gray })}
  ${arrow(1445, 335, 1375, 335)}
  ${box(1025, 290, 350, 90, "Select ONE Travel Style", { fill: palette.amberSoft, stroke: palette.amber })}
  ${arrow(1025, 335, 955, 335)}
  ${box(605, 290, 350, 90, "Rainy-Day Backup?\nOptional preference", { fill: palette.blueSoft, stroke: palette.blue, size: 23 })}
  ${arrow(605, 335, 535, 335)}
  ${box(185, 290, 350, 90, "Generate ONE Itinerary", { fill: palette.greenSoft, stroke: palette.green })}
  ${arrow(360, 380, 360, 465)}
  ${box(185, 465, 350, 105, "Validate Structure, Grounding,\nSchedule and Core Constraints", { fill: palette.gray, size: 22 })}
  ${arrow(535, 518, 640, 518)}
  <polygon points="790,440 940,518 790,596 640,518" fill="${palette.redSoft}" stroke="${palette.red}" stroke-width="2.5"/>
  ${lines("Hard Budget\nValid?", 790, 520, { size: 24, weight: 700 })}
  ${arrow(940, 518, 1050, 518)}${lines("Yes", 995, 498, { size: 20, weight: 700, color: palette.green })}
  ${box(1050, 465, 350, 105, "Attach Grounded Inactive\nContingency if Enabled", { fill: palette.blueSoft, stroke: palette.blue, size: 22 })}
  ${arrow(1225, 570, 1225, 650)}
  ${box(1050, 650, 350, 100, "Backup Feasibility /\nBudget Recheck", { fill: palette.greenSoft, stroke: palette.green, size: 23 })}
  ${arrow(1050, 700, 930, 700)}
  ${box(700, 650, 230, 100, "Save", { fill: palette.gray })}
  ${arrow(700, 700, 580, 700)}
  ${box(230, 650, 350, 100, "ONE Itinerary Workspace", { fill: palette.greenSoft, stroke: palette.green })}
  ${arrow(405, 750, 405, 835)}
  ${box(230, 835, 350, 100, "Manage Itinerary", { fill: palette.gray })}
  ${connector("M790 596 C620 640 580 735 650 835", { color: palette.red })}${lines("No", 625, 690, { size: 20, weight: 700, color: palette.red })}
  ${box(595, 835, 390, 100, "Controlled Repair\n(one repair + revalidation)", { fill: palette.amberSoft, stroke: palette.amber, size: 23 })}
  ${lines("A repaired result is fully revalidated before it can rejoin the valid path.", 790, 805, { size: 18, weight: 600, color: palette.amber })}
  ${box(1120, 835, 420, 100, "Controlled Failure\nif mandatory checks still fail", { fill: palette.redSoft, stroke: palette.red, size: 23 })}
  ${connector("M985 885 L1120 885", { color: palette.red })}${lines("If still invalid", 1055, 867, { size: 17, weight: 600, color: palette.red })}
  ${lines("No weather API and no automatic activity replacement", 900, 1010, { size: 24, weight: 600, color: palette.line })}
`);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1900, height: 1200 }, deviceScaleFactor: 1.5 });
  for (const [name, svg] of Object.entries(figures)) {
    await writeFile(path.join(output, `${name}.svg`), svg, "utf8");
    await page.setContent(`<style>html,body{margin:0;background:white}svg{display:block}</style>${svg}`);
    const element = page.locator("svg");
    await element.screenshot({ path: path.join(output, `${name}.png`), omitBackground: false });
  }
} finally {
  await browser.close();
}

console.log(output);
