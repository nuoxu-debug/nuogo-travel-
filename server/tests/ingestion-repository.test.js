import { afterEach, describe, expect, it } from "vitest";
import { AttractionSqliteRepository } from "../src/ingestion/sqliteRepository.js";

let repository;

function record(overrides = {}) {
  return {
    externalSource: "mafengwo",
    externalId: "6339966",
    nameZh: "迎客松",
    nameEn: "The Guest-Greeting Pine",
    province: "Anhui",
    regionId: "huangshan",
    locationLabel: "黄山玉屏景区、前山",
    thumbnailUrl: "https://p1-q.mafengwo.net/pine.jpeg",
    reviewCount: 10,
    travelNoteCount: 2,
    imageCount: 20,
    sourceUrl: "https://m.mafengwo.cn/nb/public/sharejump.php?type=3&id=6339966",
    sourcePageUrl: "https://m.mafengwo.cn/gl/catalog/index?catalog_id=2981&id=18",
    retrievedAt: "2026-07-20T09:00:00.000Z",
    reviewStatus: "pending",
    active: true,
    ...overrides
  };
}

afterEach(() => repository?.close());

describe("SQLite attraction repository", () => {
  it("persists and idempotently updates attributed attractions", () => {
    repository = new AttractionSqliteRepository(":memory:");
    expect(repository.upsertAttractions([record()])).toEqual({ created: 1, updated: 0 });
    expect(repository.upsertAttractions([record({ reviewCount: 12 })])).toEqual({ created: 0, updated: 1 });
    expect(repository.upsertAttractions([record({
      reviewCount: 14,
      sourcePageUrl: "https://m.mafengwo.cn/gl/catalog/index?catalog_id=2981&id=18&page=2"
    })])).toEqual({ created: 0, updated: 1 });

    const rows = repository.listAttractions({ status: "pending" });
    expect(rows).toHaveLength(1);
    expect(rows[0].reviewCount).toBe(14);
    expect(rows[0].sourceUrl).toContain("mafengwo.cn");
  });

  it("reviews selected records atomically within one region", () => {
    repository = new AttractionSqliteRepository(":memory:");
    repository.upsertAttractions([
      record({ externalId: "one", reviewCount: 20 }),
      record({ externalId: "two", reviewCount: 10 }),
      record({ externalId: "three", regionId: "hefei" })
    ]);
    const huangshan = repository.listAttractions({
      status: "pending",
      regionId: "huangshan"
    });

    expect(repository.reviewAttractions({
      regionId: "huangshan",
      ids: [huangshan[0].id],
      status: "approved"
    })).toBe(1);
    expect(repository.listAttractions({
      status: "approved",
      regionId: "huangshan"
    })).toHaveLength(1);
    expect(repository.listAttractions({
      status: "pending",
      regionId: "hefei"
    })).toHaveLength(1);
    expect(() => repository.reviewAttractions({
      regionId: "huangshan",
      ids: ["missing-id"],
      status: "approved"
    })).toThrow(/selected attractions/i);
  });

  it("finds only approved attraction images and persists a local cache path", () => {
    repository = new AttractionSqliteRepository(":memory:");
    repository.upsertAttractions([
      record({ externalId: "approved-image", reviewStatus: "approved" }),
      record({ externalId: "pending-image", reviewStatus: "pending" })
    ]);
    const [approved] = repository.listAttractions({
      status: "approved",
      regionId: "huangshan"
    });
    const [pending] = repository.listAttractions({
      status: "pending",
      regionId: "huangshan"
    });

    const image = repository.findApprovedImage(approved.id);
    expect(image).toMatchObject({
      attractionId: approved.id,
      sourceUrl: "https://p1-q.mafengwo.net/pine.jpeg",
      localPath: null
    });
    expect(repository.findApprovedImage(pending.id)).toBeUndefined();

    repository.setImageLocalPath(image.id, "approved-image.jpeg");
    expect(repository.findApprovedImage(approved.id).localPath)
      .toBe("approved-image.jpeg");
  });
});
