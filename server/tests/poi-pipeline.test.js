import { canonicalPoiSchema } from "@nuogo/shared/schemas";
import { describe, expect, it } from "vitest";
import { buildCandidatePool } from "../src/services/poi/buildCandidatePool.js";
import { matchPois } from "../src/services/poi/matchPois.js";
import { normalizeAmapPoi } from "../src/services/poi/normalizeAmapPoi.js";
import { normalizeOpenTripMapPoi } from "../src/services/poi/normalizeOpenTripMapPoi.js";

const retrievedAt = "2026-08-14T00:00:00.000Z";

function amap(overrides = {}) {
  return {
    id: "B001",
    name: "Temple of Heaven",
    type: "Scenic spot",
    typecode: "110200",
    address: "Dongcheng District",
    cityname: "Beijing",
    location: "116.406605,39.881903",
    ...overrides
  };
}

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
  it("normalizes AMap IDs, categories, coordinates, and source timestamps", () => {
    const poi = normalizeAmapPoi(amap(), { city: "beijing", retrievedAt });

    expect(poi).toMatchObject({
      canonicalPoiId: "amap:beijing:B001",
      name: "Temple of Heaven",
      city: "beijing",
      category: "ATTRACTION",
      coordinates: { longitude: 116.406605, latitude: 39.881903 },
      primarySource: "AMAP",
      amapPoiId: "B001",
      retrievedAt,
      verificationStatus: "PRIMARY_ONLY"
    });
    expect(poi.sourceRecords).toEqual([{
      provider: "AMAP",
      sourceId: "B001",
      retrievedAt
    }]);
    expect(() => canonicalPoiSchema.parse(poi)).not.toThrow();
  });

  it("rejects malformed and out-of-China AMap coordinates", () => {
    expect(() => normalizeAmapPoi(amap({ location: "invalid" }), {
      city: "beijing", retrievedAt
    })).toThrow(/coordinates/i);
    expect(() => normalizeAmapPoi(amap({ location: "1,1" }), {
      city: "beijing", retrievedAt
    })).toThrow(/China/i);
  });

  it("normalizes OpenTripMap only as a supporting record", () => {
    expect(normalizeOpenTripMapPoi(otm(), { city: "beijing", retrievedAt })).toEqual({
      provider: "OPENTRIPMAP",
      sourceId: "Q80290",
      sourceUrl: "https://opentripmap.com/en/card/Q80290",
      retrievedAt,
      name: "Temple of Heaven",
      city: "beijing",
      category: "ATTRACTION",
      coordinates: { longitude: 116.40661, latitude: 39.88191 },
      verificationStatus: "SUPPORTING_ONLY"
    });
  });

  it("matches same-city records by name, category, and distance", () => {
    const primary = [normalizeAmapPoi(amap(), { city: "beijing", retrievedAt })];
    const supporting = [normalizeOpenTripMapPoi(otm(), { city: "beijing", retrievedAt })];

    const [matched] = matchPois(primary, supporting, 0.8);

    expect(matched).toMatchObject({
      verificationStatus: "MATCHED",
      openTripMapXid: "Q80290"
    });
    expect(matched.sourceRecords).toHaveLength(2);
    expect(() => canonicalPoiSchema.parse(matched)).not.toThrow();
  });

  it("does not cross cities, merge distant names, or promote unmatched support", () => {
    const primary = [normalizeAmapPoi(amap(), { city: "beijing", retrievedAt })];
    const supporting = [
      normalizeOpenTripMapPoi(otm(), { city: "shanghai", retrievedAt }),
      normalizeOpenTripMapPoi(otm({
        xid: "Q-far",
        name: "Temple of Heaven",
        point: { lon: 121.49, lat: 31.24 }
      }), { city: "beijing", retrievedAt }),
      normalizeOpenTripMapPoi(otm({ xid: "Q-only", name: "Unlisted Tower" }), {
        city: "beijing", retrievedAt
      })
    ];

    const result = matchPois(primary, supporting, 0.8);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ verificationStatus: "PRIMARY_ONLY" });
    expect(JSON.stringify(result)).not.toContain("Q-only");
  });

  it("marks primary records ambiguous instead of guessing between support candidates", () => {
    const primary = [normalizeAmapPoi(amap(), { city: "beijing", retrievedAt })];
    const supporting = [
      normalizeOpenTripMapPoi(otm(), { city: "beijing", retrievedAt }),
      normalizeOpenTripMapPoi(otm({ xid: "Q80290-copy", point: { lon: 116.40662, lat: 39.88192 } }), {
        city: "beijing", retrievedAt
      })
    ];

    const [result] = matchPois(primary, supporting, 0.8);

    expect(result.verificationStatus).toBe("AMBIGUOUS");
    expect(result.openTripMapXid).toBeUndefined();
    expect(result.sourceRecords).toHaveLength(1);
  });

  it("builds a stable, city-isolated approved candidate pool", () => {
    const beijing = normalizeAmapPoi(amap(), { city: "beijing", retrievedAt });
    const restaurant = normalizeAmapPoi(amap({
      id: "B002",
      name: "Local Noodle House",
      typecode: "050100",
      location: "116.407,39.882"
    }), { city: "beijing", retrievedAt });
    const shanghai = normalizeAmapPoi(amap({ id: "S001", location: "121.49,31.24" }), {
      city: "shanghai", retrievedAt
    });
    const ambiguous = { ...beijing, canonicalPoiId: "amap:beijing:AMB", verificationStatus: "AMBIGUOUS" };
    const preferences = { destination: "beijing", interests: ["FOOD", "HISTORY"] };

    const first = buildCandidatePool(preferences, [restaurant, shanghai, ambiguous, beijing]);
    const second = buildCandidatePool(preferences, [beijing, restaurant, ambiguous, shanghai]);

    expect(first.candidateIds).toEqual([
      "candidate:beijing:B001",
      "candidate:beijing:B002"
    ]);
    expect(second).toEqual(first);
    expect(first.candidates.every(({ city }) => city === "beijing")).toBe(true);
    expect(first.rejected).toEqual(expect.arrayContaining([
      expect.objectContaining({ canonicalPoiId: "amap:beijing:AMB", reason: "AMBIGUOUS" }),
      expect.objectContaining({ canonicalPoiId: "amap:shanghai:S001", reason: "WRONG_CITY" })
    ]));
  });
});
