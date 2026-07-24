import { afterEach, describe, expect, it } from "vitest";
import { AttractionSqliteRepository } from "../src/ingestion/sqliteRepository.js";
import { SqliteAttractionCatalogue } from "../src/services/attractionCatalogue.js";

let repository;

function record(overrides = {}) {
  return {
    externalSource: "mafengwo",
    externalId: "poi-1",
    nameZh: "迎客松",
    nameEn: "Guest-Greeting Pine",
    province: "Anhui",
    regionId: "huangshan",
    locationLabel: "Huangshan Scenic Area",
    thumbnailUrl: "https://p1-q.mafengwo.net/pine.jpeg",
    reviewCount: 12,
    travelNoteCount: 3,
    imageCount: 20,
    sourceUrl: "https://m.mafengwo.cn/poi/poi-1.html",
    sourcePageUrl: "https://m.mafengwo.cn/gl/catalog/index?catalog_id=2981&id=18",
    retrievedAt: "2026-07-20T09:00:00.000Z",
    reviewStatus: "pending",
    active: true,
    ...overrides
  };
}

afterEach(() => repository?.close());

describe("approved attraction catalogue", () => {
  it("returns only active approved Huangshan records with attribution", () => {
    repository = new AttractionSqliteRepository(":memory:");
    repository.upsertAttractions([
      record({ externalId: "approved", reviewStatus: "approved" }),
      record({ externalId: "pending" }),
      record({ externalId: "inactive", reviewStatus: "approved", active: false })
    ]);
    const catalogue = new SqliteAttractionCatalogue(repository);

    expect(catalogue.listApproved("chengdu")).toEqual([]);
    expect(catalogue.listApproved("huangshan")).toEqual([
      expect.objectContaining({
        externalId: "approved",
        nameZh: "迎客松",
        sourceProvider: "Mafengwo",
        sourceUrl: "https://m.mafengwo.cn/poi/poi-1.html"
      })
    ]);
  });

  it("enriches approved Huangshan attractions with media and visit details", () => {
    repository = new AttractionSqliteRepository(":memory:");
    repository.upsertAttractions([
      record({
        externalId: "hongcun",
        nameZh: "\u5b8f\u6751",
        nameEn: "Hongcun Scenic Area",
        reviewStatus: "approved",
        reviewCount: 27219,
        travelNoteCount: 657,
        imageCount: 51373
      })
    ]);
    const [attraction] = new SqliteAttractionCatalogue(repository)
      .listApproved("huangshan");

    expect(attraction.descriptionEn).toMatch(/village|water|architecture/i);
    expect(attraction.descriptionZh).toContain("\u5b8f\u6751");
    expect(attraction.imageAttribution).toBe("Image source: Mafengwo");
    expect(attraction.visitDetails.suggestedDuration.en).toBeTruthy();
    expect(attraction.visitDetails.highlights.zh.length).toBeGreaterThanOrEqual(2);
    expect(attraction.visitDetails.popularity).toEqual({
      reviews: 27219,
      travelNotes: 657,
      images: 51373
    });
  });

  it("fills missing English display names from the curated catalogue", () => {
    repository = new AttractionSqliteRepository(":memory:");
    repository.upsertAttractions([
      record({
        externalId: "tunxi",
        nameZh: "\u5c6f\u6eaa\u8001\u8857",
        nameEn: null,
        reviewStatus: "approved"
      })
    ]);
    const [attraction] = new SqliteAttractionCatalogue(repository)
      .listApproved("huangshan");

    expect(attraction.nameEn).toBe("Tunxi Old Street");
  });
});
