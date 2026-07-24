import { describe, expect, it } from "vitest";
import { anhuiRegions, getRegionSource } from "../src/ingestion/anhuiSources.js";
import { attractionRecordSchema } from "../src/ingestion/contracts.js";

describe("Anhui ingestion contracts", () => {
  it("keeps every expansion region while activating only approved sources", () => {
    expect(Object.keys(anhuiRegions)).toEqual([
      "huangshan",
      "hefei",
      "chizhou",
      "xuancheng",
      "anqing",
      "wuhu"
    ]);
    expect(getRegionSource("huangshan").url).toContain("catalog_id=2981");
    expect(() => getRegionSource("hefei")).toThrow(/approved source/i);
  });

  it("validates an attributed pending attraction", () => {
    const record = attractionRecordSchema.parse({
      externalSource: "mafengwo",
      externalId: "6339966",
      nameZh: "迎客松",
      nameEn: "The Guest-Greeting Pine",
      province: "Anhui",
      regionId: "huangshan",
      sourceUrl: "https://m.mafengwo.cn/nb/public/sharejump.php?type=3&id=6339966",
      sourcePageUrl: "https://m.mafengwo.cn/gl/catalog/index?catalog_id=2981&id=18",
      retrievedAt: "2026-07-20T09:00:00.000Z"
    });

    expect(record.reviewStatus).toBe("pending");
    expect(record.reviewCount).toBe(0);
  });

  it("rejects non-HTTPS and non-Mafengwo source pages", () => {
    const base = {
      externalSource: "mafengwo",
      externalId: "6339966",
      nameZh: "迎客松",
      province: "Anhui",
      regionId: "huangshan",
      sourcePageUrl: "https://m.mafengwo.cn/gl/catalog/index?catalog_id=2981&id=18",
      retrievedAt: "2026-07-20T09:00:00.000Z"
    };

    expect(() => attractionRecordSchema.parse({
      ...base,
      sourceUrl: "javascript:alert(1)"
    })).toThrow();
    expect(() => attractionRecordSchema.parse({
      ...base,
      sourceUrl: "https://example.com/poi/1"
    })).toThrow();
  });
});
