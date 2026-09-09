import { describe, expect, it } from "vitest";
import { buildRainyDayBackups } from "../src/services/itinerary/rainyDayBackup.js";

const candidate = (xid, category, kinds, city = "singapore") => ({
  xid,
  candidateId: xid,
  name: xid,
  displayName: { en: xid, zh: xid },
  category,
  kinds,
  city,
  primarySource: "OPENTRIPMAP",
  coordinates: { longitude: 116.4, latitude: 39.9, coordinateSystem: "WGS84" },
  matchStatus: "MATCHED",
  verificationStatus: "SUPPORTING_ONLY",
  sourceRecords: [{ provider: "OPENTRIPMAP", sourceId: xid, retrievedAt: "2026-08-14T00:00:00.000Z" }]
});

const pool = {
  city: "singapore",
  candidates: [
    candidate("garden", "NATURE", "gardens,natural"),
    candidate("open-air-district", "CULTURE", "cultural,historic,architecture"),
    candidate("museum", "CULTURE", "museums,cultural"),
    candidate("other-city", "CULTURE", "museums", "singapore")
  ]
};

const itinerary = {
  days: [{
    dayNumber: 1,
    activities: [{
      sequence: 1,
      xid: "garden",
      activityType: "NATURE",
      estimatedActivityCostMinor: 2000
    }]
  }]
};

describe("grounded rainy-day backup", () => {
  it("returns no alternatives when the preference is disabled", () => {
    expect(buildRainyDayBackups({ enabled: false, itinerary, candidatePool: pool })).toEqual([]);
  });

  it("uses an unused same-city less weather-sensitive grounded candidate", () => {
    const backups = buildRainyDayBackups({
      enabled: true,
      itinerary,
      candidatePool: pool,
      remainingBudgetMinor: 1000,
      estimateCostMinor: () => 2500
    });

    expect(backups).toEqual([expect.objectContaining({
      dayNumber: 1,
      replacesXid: "garden",
      estimatedCostMinor: 2500,
      alternative: expect.objectContaining({ xid: "museum", city: "singapore", primarySource: "OPENTRIPMAP" })
    })]);
    expect(backups[0].alternative.xid).not.toBe("garden");
    expect(backups[0].alternative.xid).not.toBe("open-air-district");
  });

  it("returns no alternative when only duplicates, wrong-city, or costly candidates remain", () => {
    expect(buildRainyDayBackups({
      enabled: true,
      itinerary,
      candidatePool: pool,
      remainingBudgetMinor: 0,
      estimateCostMinor: () => 5000
    })).toEqual([]);
  });
});
