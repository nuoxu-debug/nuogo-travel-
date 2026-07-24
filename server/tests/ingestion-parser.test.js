import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMafengwoCatalog } from "../src/ingestion/mafengwoParser.js";
import { isPathAllowed, parseRobots } from "../src/ingestion/robots.js";
import { validateSourceUrl } from "../src/ingestion/sourcePolicy.js";

const fixture = readFileSync(new URL("./fixtures/mafengwo-catalog.html", import.meta.url), "utf8");
const context = {
  provider: "mafengwo",
  province: "Anhui",
  regionId: "huangshan",
  sourcePageUrl: "https://m.mafengwo.cn/gl/catalog/index?catalog_id=2981&id=18",
  retrievedAt: "2026-07-20T09:00:00.000Z"
};

describe("Mafengwo source policy", () => {
  it("allows only the approved public catalogue path", () => {
    expect(validateSourceUrl("https://m.mafengwo.cn/gl/catalog/index?id=18")).toBeInstanceOf(URL);
    expect(() => validateSourceUrl("https://m.mafengwo.cn/i/9389665")).toThrow(/path/i);
    expect(() => validateSourceUrl("https://example.com/gl/catalog/index")).toThrow(/host/i);
  });

  it("evaluates wildcard robots rules for the requested path", () => {
    const rules = parseRobots(`
      User-agent: *
      Disallow: /po
      Disallow: /mom
      Disallow: *?mfw_chid=*
    `, "NuogoFYPBot");

    expect(isPathAllowed(rules, "/gl/catalog/index?catalog_id=2981&id=18")).toBe(true);
    expect(isPathAllowed(rules, "/po/123")).toBe(false);
    expect(isPathAllowed(rules, "/gl/catalog/index?mfw_chid=abc")).toBe(false);
  });
});

describe("Mafengwo catalogue parser", () => {
  it("extracts POI-card facts without article paragraphs", () => {
    const records = parseMafengwoCatalog(fixture, context);

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      externalId: "6339966",
      nameZh: "迎客松",
      nameEn: "The Guest-Greeting Pine",
      reviewCount: 5152,
      travelNoteCount: 203,
      imageCount: 10628,
      locationLabel: "黄山玉屏景区、前山"
    });
    expect(JSON.stringify(records)).not.toContain("完整攻略正文");
  });
});
