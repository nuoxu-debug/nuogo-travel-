import { describe, expect, it } from "vitest";
import { createDatabaseCandidateService, retrieveDatabaseAttractionCandidates } from "../src/services/poi/databaseCandidateService.js";
import { buildCandidatePool } from "../src/services/poi/buildCandidatePool.js";

const retrievedAt = "2026-10-01T00:00:00.000Z";

function poi(index, overrides = {}) {
  const id = overrides.id ?? `sg-poi-${String(index).padStart(2, "0")}`;
  return {
    id,
    destinationId: "singapore",
    name: { en: `POI ${index}`, zh: `景点 ${index}` },
    category: "CULTURE",
    coordinates: { latitude: 1.28 + index / 1000, longitude: 103.84 + index / 1000 },
    address: { en: `${index} Example Road`, zh: `${index} Example Road` },
    status: "ACTIVE",
    sources: [{
      provider: "OFFICIAL",
      sourceId: `source-${id}`,
      sourceUrl: `https://example.test/${id}`,
      retrievedAt
    }],
    ...overrides
  };
}

describe("database-backed Singapore candidate retrieval", () => {
  it("returns 25 active canonical Singapore POIs before preference filtering", async () => {
    const repository = {
      listCanonicalPois: async () => Array.from({ length: 25 }, (_, index) => poi(index + 1))
    };

    const candidates = await retrieveDatabaseAttractionCandidates({
      destination: "singapore"
    }, { repository, now: () => retrievedAt });

    expect(candidates).toHaveLength(25);
    expect(candidates.every(({ city, matchStatus }) => city === "singapore" && matchStatus === "MATCHED")).toBe(true);
  });

  it("does not substitute demo fixtures when database POIs are available", async () => {
    const repository = {
      listCanonicalPois: async () => [
        poi(1, { id: "sg-national-gallery", name: { en: "National Gallery Singapore", zh: "新加坡国家美术馆" } })
      ]
    };

    const [candidate] = await createDatabaseCandidateService({
      repository,
      now: () => retrievedAt
    })({ destination: "singapore" });

    expect(candidate.xid).toBe("sg-national-gallery");
    expect(candidate.sourceType).toBe("DATABASE_BACKED");
    expect(candidate.providerMode).toBe("DATABASE");
    expect(candidate.xid).not.toMatch(/^demo-sg-(gardens-by-the-bay|marina-bay-sands)$/);
  });

  it("preserves bilingual names and stored coordinates", async () => {
    const repository = {
      listCanonicalPois: async () => [
        poi(1, {
          id: "sg-national-orchid-garden",
          name: { en: "National Orchid Garden", zh: "国家胡姬花园" },
          coordinates: { latitude: "1.31383939905585", longitude: "103.815913798805" }
        })
      ]
    };

    const [candidate] = await retrieveDatabaseAttractionCandidates({
      destination: "singapore"
    }, { repository, now: () => retrievedAt });

    expect(candidate).toMatchObject({
      xid: "sg-national-orchid-garden",
      displayName: { en: "National Orchid Garden", zh: "国家胡姬花园" },
      coordinates: { latitude: 1.31383939905585, longitude: 103.815913798805, coordinateSystem: "WGS84" }
    });
  });

  it("preserves stored source names from database provenance records", async () => {
    const repository = {
      listCanonicalPois: async () => [
        poi(1, {
          id: "sg-buddha-tooth-relic-temple",
          name: { en: "Buddha Tooth Relic Temple and Museum", zh: "Buddha Tooth Relic Temple and Museum" },
          sources: [{
            provider: "OFFICIAL",
            sourceId: "hours-buddha-tooth-relic-temple",
            sourceUrl: "https://www.buddhatoothrelictemple.org.sg/venerable-yuan-zong",
            retrievedAt,
            raw: {
              source_name: "Buddha Tooth Relic Temple and Museum",
              source_kind: "OPERATING_HOURS"
            }
          }]
        })
      ]
    };

    const [candidate] = await retrieveDatabaseAttractionCandidates({
      destination: "singapore"
    }, { repository, now: () => retrievedAt });

    expect(candidate.sourceRecords[0]).toMatchObject({
      provider: "OFFICIAL",
      sourceName: "Buddha Tooth Relic Temple and Museum",
      sourceType: "OPERATING_HOURS",
      sourceUrl: "https://www.buddhatoothrelictemple.org.sg/venerable-yuan-zong"
    });

    const pool = buildCandidatePool({ destination: "singapore", interests: ["CULTURE"] }, [candidate]);
    expect(pool.candidates[0].sourceRecords[0]).toMatchObject({
      sourceName: "Buddha Tooth Relic Temple and Museum",
      sourceType: "OPERATING_HOURS"
    });
  });

  it("keeps POIs without exact/free cost references or weekly hours in the candidate pool", async () => {
    const repository = {
      listCanonicalPois: async () => [
        poi(1, {
          id: "sg-universal-studios",
          name: { en: "Universal Studios Singapore", zh: "新加坡环球影城" },
          category: "ENTERTAINMENT"
        }),
        poi(2, {
          id: "sg-singapore-oceanarium",
          name: { en: "Singapore Oceanarium", zh: "新加坡海洋生态馆" },
          category: "FAMILY"
        })
      ]
    };

    const candidates = await retrieveDatabaseAttractionCandidates({
      destination: "singapore"
    }, { repository, now: () => retrievedAt });
    const pool = buildCandidatePool({ destination: "singapore", interests: ["ENTERTAINMENT"] }, candidates);

    expect(pool.candidateIds).toEqual(["sg-singapore-oceanarium", "sg-universal-studios"]);
    expect(pool.candidates.find(({ xid }) => xid === "sg-universal-studios")).toMatchObject({
      sourceType: "DATABASE_BACKED",
      primarySource: "DATABASE"
    });
  });

  it("preserves Gardens by the Bay sub-attractions as distinct POIs even with identical coordinates", async () => {
    const coordinates = { latitude: 1.284588588663125, longitude: 103.8646565996385 };
    const repository = {
      listCanonicalPois: async () => [
        poi(1, { id: "sg-flower-dome-cloud-forest", name: { en: "Flower Dome & Cloud Forest", zh: "Flower Dome & Cloud Forest" }, coordinates }),
        poi(2, { id: "sg-ocbc-skyway", name: { en: "OCBC Skyway", zh: "OCBC Skyway" }, coordinates }),
        poi(3, { id: "sg-supertree-observatory", name: { en: "Supertree Observatory", zh: "Supertree Observatory" }, coordinates })
      ]
    };

    const candidates = await retrieveDatabaseAttractionCandidates({
      destination: "singapore"
    }, { repository, now: () => retrievedAt });

    expect(candidates.map(({ xid }) => xid)).toEqual([
      "sg-flower-dome-cloud-forest",
      "sg-ocbc-skyway",
      "sg-supertree-observatory"
    ]);
  });
});
