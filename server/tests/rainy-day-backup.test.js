import { describe, expect, it } from "vitest";
import { buildRainyDayBackups } from "../src/services/itinerary/rainyDayBackup.js";

const candidate = (xid, category, kinds, city = "singapore", overrides = {}) => ({
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
  canonicalPoiId: xid,
  sourceType: "DATABASE_BACKED",
  sourceRecords: [{ provider: "DATABASE", sourceId: xid, retrievedAt: "2026-08-14T00:00:00.000Z" }],
  ...overrides
});

const pool = {
  city: "singapore",
  candidates: [
    candidate("garden", "NATURE", "gardens,natural"),
    candidate("open-air-district", "CULTURE", "cultural,historic,architecture"),
    candidate("museum", "CULTURE", "museums,cultural"),
    candidate("other-city", "CULTURE", "museums", "beijing")
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

const scheduledItinerary = {
  budgetSummary: { totalMinor: 100000 },
  days: [{
    dayNumber: 1,
    date: "2026-10-12",
    startPoint: {
      locationId: "hotel",
      coordinates: { longitude: 103.85, latitude: 1.29 }
    },
    endPoint: {
      locationId: "hotel",
      coordinates: { longitude: 103.85, latitude: 1.29 }
    },
    activities: [{
      sequence: 1,
      xid: "sg-national-orchid-garden",
      activityType: "NATURE",
      scheduledStartTime: "10:00",
      scheduledEndTime: "12:00",
      plannedDurationMinutes: 120,
      estimatedActivityCostMinor: 2000,
      poi: {
        coordinates: { longitude: 103.814, latitude: 1.312 },
        canonicalPoiId: "sg-national-orchid-garden"
      }
    }]
  }]
};

const verifiedWeeklyHours = (poiId, {
  opensAt = "09:00:00",
  closesAt = "18:00:00",
  isClosed = false
} = {}) => ({
  id: `hours-${poiId}`,
  poiId,
  dayOfWeek: 1,
  opensAt,
  closesAt,
  isClosed,
  status: "ACTIVE",
  verificationStatus: "VERIFIED"
});

const databasePool = {
  city: "singapore",
  candidates: [
    candidate("sg-national-orchid-garden", "NATURE", "nature", "singapore", {
      name: "National Orchid Garden",
      displayName: { en: "National Orchid Garden", zh: "National Orchid Garden" },
      coordinates: { longitude: 103.814, latitude: 1.312, coordinateSystem: "WGS84" }
    }),
    candidate("sg-artscience-museum", "CULTURE", "culture", "singapore", {
      name: "ArtScience Museum",
      displayName: { en: "ArtScience Museum", zh: "ArtScience Museum" },
      coordinates: { longitude: 103.8593, latitude: 1.2862, coordinateSystem: "WGS84" }
    }),
    candidate("sg-asian-civilisations-museum", "HISTORY", "history", "singapore", {
      name: "Asian Civilisations Museum",
      displayName: { en: "Asian Civilisations Museum", zh: "Asian Civilisations Museum" },
      coordinates: { longitude: 103.8514, latitude: 1.2874, coordinateSystem: "WGS84" }
    }),
    candidate("sg-botanic-gardens", "NATURE", "nature", "singapore", {
      name: "Singapore Botanic Gardens",
      displayName: { en: "Singapore Botanic Gardens", zh: "Singapore Botanic Gardens" },
      coordinates: { longitude: 103.816, latitude: 1.3138, coordinateSystem: "WGS84" }
    })
  ],
  operatingHours: {
    weeklyHours: [
      verifiedWeeklyHours("sg-artscience-museum"),
      verifiedWeeklyHours("sg-asian-civilisations-museum"),
      verifiedWeeklyHours("sg-botanic-gardens")
    ],
    exceptions: []
  }
};

describe("grounded rainy-day backup", () => {
  it("returns no alternatives when the preference is disabled", () => {
    expect(buildRainyDayBackups({ enabled: false, itinerary, candidatePool: pool })).toEqual([]);
  });

  it("recognises ArtScience Museum as rainy-day suitable when database kinds is only culture", () => {
    const backups = buildRainyDayBackups({
      enabled: true,
      itinerary: scheduledItinerary,
      candidatePool: databasePool,
      remainingBudgetMinor: 1000,
      estimateCostMinor: () => 2000
    });

    expect(backups[0]).toMatchObject({
      replacesXid: "sg-national-orchid-garden",
      suitabilityRule: "NAME_LESS_WEATHER_SENSITIVE",
      alternative: expect.objectContaining({
        xid: "sg-artscience-museum",
        canonicalPoiId: "sg-artscience-museum",
        sourceType: "DATABASE_BACKED"
      })
    });
  });

  it("recognises Asian Civilisations Museum as rainy-day suitable when database kinds is only history", () => {
    const backups = buildRainyDayBackups({
      enabled: true,
      itinerary: scheduledItinerary,
      candidatePool: {
        ...databasePool,
        candidates: databasePool.candidates.filter(({ xid }) => xid !== "sg-artscience-museum"),
        operatingHours: {
          weeklyHours: [verifiedWeeklyHours("sg-asian-civilisations-museum")],
          exceptions: []
        }
      },
      remainingBudgetMinor: 1000,
      estimateCostMinor: () => 2000
    });

    expect(backups[0]).toMatchObject({
      suitabilityRule: "NAME_LESS_WEATHER_SENSITIVE",
      alternative: expect.objectContaining({ xid: "sg-asian-civilisations-museum" })
    });
  });

  it("does not choose a nature park as a rainy-day backup without sheltered evidence", () => {
    const backups = buildRainyDayBackups({
      enabled: true,
      itinerary: scheduledItinerary,
      candidatePool: {
        ...databasePool,
        candidates: databasePool.candidates.filter(({ xid }) =>
          xid !== "sg-artscience-museum" && xid !== "sg-asian-civilisations-museum")
      },
      remainingBudgetMinor: 1000,
      estimateCostMinor: () => 2000
    });

    expect(backups).toEqual([]);
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

  it("uses a candidate-specific rainy-day cost before falling back to category estimates", () => {
    const backups = buildRainyDayBackups({
      enabled: true,
      itinerary,
      candidatePool: {
        ...pool,
        candidates: pool.candidates.map((item) => item.xid === "museum"
          ? { ...item, estimatedCostMinor: 1800 }
          : item)
      },
      remainingBudgetMinor: 1000,
      estimateCostMinor: () => 2500
    });

    expect(backups[0]).toMatchObject({
      estimatedCostMinor: 1800,
      costSourceType: "ESTIMATED"
    });
  });

  it("rejects a closed backup candidate and tries the next feasible candidate", () => {
    const backups = buildRainyDayBackups({
      enabled: true,
      itinerary: scheduledItinerary,
      candidatePool: {
        ...databasePool,
        operatingHours: {
          weeklyHours: [
            verifiedWeeklyHours("sg-artscience-museum", { isClosed: true }),
            verifiedWeeklyHours("sg-asian-civilisations-museum")
          ],
          exceptions: []
        }
      },
      remainingBudgetMinor: 1000,
      estimateCostMinor: () => 2000
    });

    expect(backups[0].alternative.xid).toBe("sg-asian-civilisations-museum");
  });

  it("rejects a travel-time-infeasible backup candidate and tries the next feasible candidate", () => {
    const backups = buildRainyDayBackups({
      enabled: true,
      itinerary: {
        ...scheduledItinerary,
        days: [{
          ...scheduledItinerary.days[0],
          activities: [{
            ...scheduledItinerary.days[0].activities[0],
            scheduledStartTime: "10:00",
            scheduledEndTime: "10:30",
            plannedDurationMinutes: 30
          }, {
            sequence: 2,
            xid: "sg-buddha-tooth-relic-temple",
            activityType: "CULTURE",
            scheduledStartTime: "10:45",
            scheduledEndTime: "11:45",
            plannedDurationMinutes: 60,
            poi: {
              coordinates: { longitude: 103.8439, latitude: 1.2815 },
              canonicalPoiId: "sg-buddha-tooth-relic-temple"
            }
          }]
        }]
      },
      candidatePool: {
        ...databasePool,
        candidates: [
          ...databasePool.candidates,
          candidate("sg-buddha-tooth-relic-temple", "CULTURE", "culture", "singapore", {
            coordinates: { longitude: 103.8439, latitude: 1.2815, coordinateSystem: "WGS84" }
          })
        ],
        operatingHours: {
          weeklyHours: [
            verifiedWeeklyHours("sg-artscience-museum"),
            verifiedWeeklyHours("sg-asian-civilisations-museum"),
            verifiedWeeklyHours("sg-buddha-tooth-relic-temple")
          ],
          exceptions: []
        }
      },
      remainingBudgetMinor: 1000,
      estimateCostMinor: () => 2000,
      estimateTravelLeg: ({ from, to }) => ({
        durationMinutes: to.longitude === 103.8593 || from.longitude === 103.8593 ? 45 : 1
      })
    });

    expect(backups[0].alternative.xid).toBe("sg-asian-civilisations-museum");
  });

  it("does not add unused backup cost to the active itinerary total", () => {
    const before = scheduledItinerary.budgetSummary.totalMinor;
    const backups = buildRainyDayBackups({
      enabled: true,
      itinerary: scheduledItinerary,
      candidatePool: databasePool,
      remainingBudgetMinor: 1000,
      estimateCostMinor: () => 2000
    });

    expect(backups[0].estimatedCostMinor).toBe(2000);
    expect(scheduledItinerary.budgetSummary.totalMinor).toBe(before);
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
