import { describe, expect, it, vi } from "vitest";
import { buildCandidatePool } from "../src/services/poi/buildCandidatePool.js";
import { buildDiscoveryResponse } from "../src/services/poi/buildDiscoveryResponse.js";
import { normalizeOpenTripMapPoi } from "../src/services/poi/normalizeOpenTripMapPoi.js";
import { retrieveAttractionCandidates } from "../src/services/poi/openTripMapCandidateService.js";

const retrievedAt = "2026-08-14T00:00:00.000Z";

function otm(overrides = {}) {
  return {
    xid: "Q80290",
    name: "Temple of Heaven",
    kinds: "historic,architecture",
    point: { lon: 116.40661, lat: 39.88191 },
    ...overrides
  };
}

describe("canonical POI pipeline", () => {
  it("normalizes OpenTripMap only as a supporting record", () => {
    expect(normalizeOpenTripMapPoi(otm(), { city: "singapore", retrievedAt })).toEqual({
      provider: "OPENTRIPMAP",
      sourceId: "Q80290",
      sourceUrl: "https://opentripmap.com/en/card/Q80290",
      retrievedAt,
      name: "Temple of Heaven",
      city: "singapore",
      category: "ATTRACTION",
      coordinates: { longitude: 116.40661, latitude: 39.88191, coordinateSystem: "WGS84" },
      verificationStatus: "SUPPORTING_ONLY"
    });
  });

  it("builds a stable attraction-only pool whose candidate IDs are raw xids", () => {
    const candidate = {
      xid: "Q80290",
      name: "Temple of Heaven",
      kinds: "historic,architecture",
      coordinates: { longitude: 116.40661, latitude: 39.88191, coordinateSystem: "WGS84" },
      city: "singapore",
      sourceUrl: "https://opentripmap.com/en/card/Q80290",
      retrievedAt,
      matchStatus: "MATCHED"
    };
    const second = { ...candidate, xid: "Q123", name: "National Gallery Singapore" };
    const wrongCity = { ...candidate, xid: "Q456", city: "beijing" };
    const unusable = { ...candidate, xid: "Q789", matchStatus: "UNMATCHED" };
    const preferences = { destination: "singapore", interests: ["FOOD", "HISTORY"] };

    const first = buildCandidatePool(preferences, [second, candidate, unusable, wrongCity]);
    const reordered = buildCandidatePool(preferences, [candidate, unusable, second, wrongCity]);

    expect(first.candidateIds).toEqual(["Q123", "Q80290"]);
    expect(reordered).toEqual(first);
    expect(first.candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ candidateId: "Q80290", xid: "Q80290", category: "CULTURE" })
    ]));
    expect(first.candidates.every(({ city }) => city === "singapore")).toBe(true);
    expect(first.rejected).toEqual(expect.arrayContaining([
      expect.objectContaining({ xid: "Q789", reason: "UNMATCHED" }),
      expect.objectContaining({ xid: "Q456", reason: "WRONG_CITY" })
    ]));
  });

  it("builds localized browser-safe discovery records without credentials", () => {
    const [result] = buildDiscoveryResponse("singapore", [{
      xid: "otm-bj-forbidden-city",
      name: "Forbidden City",
      displayName: { en: "Forbidden City", zh: "故宫博物院" },
      description: { en: "A palace complex.", zh: "皇家宫殿建筑群。" },
      descriptionSourceType: "DATABASE_BACKED",
      category: "HISTORY",
      coordinates: { longitude: 116.397, latitude: 39.918, coordinateSystem: "WGS84" },
      city: "singapore",
      sourceUrl: "https://opentripmap.com/en/card/otm-bj-forbidden-city",
      retrievedAt,
      matchStatus: "MATCHED",
      verificationStatus: "SUPPORTING_ONLY"
    }], { runtimeMode: "live" });
    expect(result).toMatchObject({
      name: { en: "Forbidden City", zh: "故宫博物院" },
      source: { provider: "OPENTRIPMAP", sourceType: "OPENTRIPMAP_API" }
    });
    expect(JSON.stringify(result)).not.toMatch(/apikey|server-otm-key/i);
  });
});

describe("OpenTripMap candidate retrieval", () => {
  const settings = {
    center: { longitude: 116.4074, latitude: 39.9042 },
    radiusMeters: 12_000
  };

  it("uses destination settings, bounds detail calls, and normalizes usable records", async () => {
    const provider = {
      listAttractions: vi.fn(async () => [
        otm(),
        otm({ xid: "Q2", name: "", point: { lon: 116.41, lat: 39.91 } }),
        otm({ xid: "Q3", name: "List-only place", point: { lon: 116.42, lat: 39.92 } }),
        { xid: "BROKEN", name: "No coordinates" }
      ]),
      getAttractionDetails: vi.fn(async ({ xid }) => xid === "Q2"
        ? { xid, name: "Detail-only place", kinds: "museums", point: { lon: 116.41, lat: 39.91 } }
        : { xid, name: "Temple of Heaven", kinds: "historic,architecture", point: { lon: 116.40661, lat: 39.88191 } })
    };

    const candidates = await retrieveAttractionCandidates({
      destination: "singapore",
      settings
    }, { provider, now: () => retrievedAt, maxDetailCalls: 2 });

    expect(provider.listAttractions).toHaveBeenCalledWith({
      city: "singapore",
      coordinates: settings.center,
      radiusMeters: 12_000,
      signal: undefined
    });
    expect(provider.getAttractionDetails).toHaveBeenCalledTimes(2);
    expect(candidates).toEqual([
      expect.objectContaining({
        xid: "Q2",
        name: "Detail-only place",
        kinds: "museums",
        coordinates: { longitude: 116.41, latitude: 39.91, coordinateSystem: "WGS84" },
        city: "singapore",
        sourceUrl: "https://opentripmap.com/en/card/Q2",
        retrievedAt,
        matchStatus: "MATCHED",
        description: { en: "Description unavailable", zh: "暂无景点介绍" }
      }),
      expect.objectContaining({
        xid: "Q3",
        name: "List-only place",
        kinds: "historic,architecture",
        coordinates: { longitude: 116.42, latitude: 39.92, coordinateSystem: "WGS84" },
        city: "singapore",
        sourceUrl: "https://opentripmap.com/en/card/Q3",
        retrievedAt,
        matchStatus: "MATCHED",
        description: { en: "Description unavailable", zh: "暂无景点介绍" }
      }),
      expect.objectContaining({ xid: "Q80290", name: "Temple of Heaven" })
    ]);
  });

  it("returns an empty allow-list without detail calls", async () => {
    const provider = {
      listAttractions: vi.fn(async () => []),
      getAttractionDetails: vi.fn()
    };

    await expect(retrieveAttractionCandidates({ destination: "singapore", settings }, {
      provider,
      now: () => retrievedAt
    })).resolves.toEqual([]);
    expect(provider.getAttractionDetails).not.toHaveBeenCalled();
  });

  it("falls back to usable list facts when a bounded detail request times out", async () => {
    const timeout = Object.assign(new Error("timed out"), { code: "PROVIDER_UNAVAILABLE" });
    const provider = {
      listAttractions: vi.fn(async () => [otm()]),
      getAttractionDetails: vi.fn().mockRejectedValue(timeout)
    };

    await expect(retrieveAttractionCandidates({ destination: "singapore", settings }, {
      provider,
      now: () => retrievedAt,
      maxDetailCalls: 1
    })).resolves.toEqual([
      expect.objectContaining({ xid: "Q80290", name: "Temple of Heaven", matchStatus: "MATCHED" })
    ]);
  });

  it("uses the canonical xid card URL instead of a provider detail link", async () => {
    const provider = {
      listAttractions: vi.fn(async () => [otm()]),
      getAttractionDetails: vi.fn(async ({ xid }) => ({
        xid,
        name: "Temple of Heaven",
        kinds: "historic,architecture",
        point: { lon: 116.40661, lat: 39.88191 },
        otm: "https://opentripmap.com/en/card/Q80290?locale=en"
      }))
    };

    await expect(retrieveAttractionCandidates({ destination: "singapore", settings }, {
      provider,
      now: () => retrievedAt,
      maxDetailCalls: 1
    })).resolves.toEqual([expect.objectContaining({
      xid: "Q80290",
      sourceUrl: "https://opentripmap.com/en/card/Q80290"
    })]);
  });
});
