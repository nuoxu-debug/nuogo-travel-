import { describe, expect, it } from "vitest";
import { calculateItineraryBudget, validateHardBudget } from "../src/services/budget/budgetEngine.js";
import { resolveCostReferences } from "../src/services/budget/costReferenceService.js";
import { calculateDrivingCost } from "../src/services/budget/fuelCalculator.js";
import { getSpendingProfile, spendingProfileIds } from "../src/services/budget/spendingProfiles.js";

const preferences = {
  destination: "beijing",
  travellerCount: 4,
  totalBudgetCny: 10_000,
  outboundTransportMode: "TRAIN",
  returnTransportMode: "TRAIN",
  outboundTransportCostCny: 500,
  returnTransportCostCny: 600,
  fuelConsumptionLitresPer100Km: 8
};

const itinerary = {
  nights: 2,
  rooms: 2,
  mealCount: 6,
  days: [{
    activities: [
      { activityType: "HISTORY" },
      { activityType: "CULTURE" },
      { activityType: "ENTERTAINMENT" }
    ],
    legs: [{ estimatedCostFen: 1500 }, { estimatedCostFen: 2500 }]
  }],
  localDriving: {
    distanceKm: 100,
    tollCny: 20,
    parkingDays: 2
  }
};

const references = {
  accommodationRoomNightFen: 30_000,
  foodPersonMealFen: 3_000,
  attractionPersonEntryFen: 5_000,
  entertainmentPersonEntryFen: 4_000,
  otherTripFen: 5_000,
  fuelLitreFen: 800,
  parkingDayFen: 2_000,
  provenance: {}
};

describe("deterministic budget engine", () => {
  it("calculates fuel, toll, and parking costs in integer fen", () => {
    expect(calculateDrivingCost({
      distanceKm: 100,
      fuelConsumptionLitresPer100Km: 8,
      fuelPricePerLitre: 8,
      tollCny: 20,
      parkingCny: 40
    })).toEqual({
      fuelFen: 6400,
      tollFen: 2000,
      parkingFen: 4000,
      totalFen: 12_400
    });
  });

  it("calculates eight categories, total, remaining budget, and per-person cost", () => {
    const summary = calculateItineraryBudget({
      preferences,
      itinerary,
      references,
      profile: "BALANCED"
    });

    expect(summary.categoriesFen).toEqual({
      outboundTransport: 50_000,
      returnTransport: 60_000,
      accommodation: 120_000,
      localTransportation: 16_400,
      foodAndBeverages: 72_000,
      attractionTickets: 40_000,
      entertainmentActivities: 16_000,
      other: 5_000
    });
    expect(summary).toMatchObject({
      profile: "BALANCED",
      totalFen: 379_400,
      budgetFen: 1_000_000,
      remainingFen: 620_600,
      perPersonFen: 94_850,
      withinBudget: true
    });
    expect(Object.values(summary.targetAllocationsFen).reduce((sum, value) => sum + value, 0))
      .toBe(summary.budgetFen);
  });

  it("keeps fixed outbound and return costs trip-level rather than multiplying the group", () => {
    const summary = calculateItineraryBudget({ preferences, itinerary, references, profile: "BUDGET_SAVING" });
    expect(summary.categoriesFen.outboundTransport).toBe(50_000);
    expect(summary.categoriesFen.returnTransport).toBe(60_000);
  });

  it("uses every profile allocation while enforcing the same hard budget", () => {
    expect(spendingProfileIds).toEqual(["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"]);
    const summaries = spendingProfileIds.map((profile) => calculateItineraryBudget({
      preferences, itinerary, references, profile
    }));

    expect(new Set(summaries.map(({ budgetFen }) => budgetFen))).toEqual(new Set([1_000_000]));
    expect(new Set(summaries.map(({ targetAllocationsFen }) => JSON.stringify(targetAllocationsFen))).size)
      .toBe(3);
    for (const profile of spendingProfileIds) {
      expect(Object.values(getSpendingProfile(profile).allocationsPercent)
        .reduce((sum, value) => sum + value, 0)).toBe(100);
    }
  });

  it("prices named accommodation and food tiers from the same reference baseline", () => {
    const summaries = spendingProfileIds.map((profile) => calculateItineraryBudget({
      preferences, itinerary, references, profile
    }));

    expect(summaries.map(({ accommodationTier }) => accommodationTier))
      .toEqual(["BUDGET", "MID_RANGE", "COMFORT"]);
    expect(summaries.map(({ foodTier }) => foodTier))
      .toEqual(["ECONOMY", "BALANCED", "COMFORT"]);
    expect(summaries.map(({ categoriesFen }) => categoriesFen.accommodation))
      .toEqual([84_000, 120_000, 162_000]);
    expect(summaries.map(({ categoriesFen }) => categoriesFen.foodAndBeverages))
      .toEqual([50_400, 72_000, 97_200]);
  });

  it("reports impossible budgets without relaxing the ceiling", () => {
    const summary = calculateItineraryBudget({
      preferences: { ...preferences, totalBudgetCny: 300 },
      itinerary,
      references,
      profile: "COMFORT_FOCUSED"
    });
    expect(validateHardBudget(summary, 300)).toEqual({
      valid: false,
      code: "BUDGET_EXCEEDED",
      totalFen: 446_600,
      budgetFen: 30_000,
      exceededByFen: 416_600,
      remainingFen: -416_600
    });
  });

  it("rounds fractional fuel calculations deterministically at fen boundaries", () => {
    expect(calculateDrivingCost({
      distanceKm: 1.25,
      fuelConsumptionLitresPer100Km: 7.3,
      fuelPricePerLitre: 7.89,
      tollCny: 0,
      parkingCny: 0
    }).fuelFen).toBe(72);
  });

  it("keeps driving totals integral and monotonic across rounding boundaries", () => {
    let previous = -1;
    for (let distanceKm = 0; distanceKm <= 25; distanceKm += 0.25) {
      const result = calculateDrivingCost({
        distanceKm,
        fuelConsumptionLitresPer100Km: 7.3,
        fuelPricePerLitre: 7.89,
        tollCny: 0,
        parkingCny: 0
      });
      expect(Number.isInteger(result.totalFen)).toBe(true);
      expect(result.totalFen).toBeGreaterThanOrEqual(previous);
      previous = result.totalFen;
    }
  });

  it("derives driving outbound cost when no fixed user cost is supplied", () => {
    const summary = calculateItineraryBudget({
      preferences: {
        ...preferences,
        outboundTransportMode: "DRIVING",
        outboundTransportCostCny: undefined
      },
      itinerary: {
        ...itinerary,
        outboundDriving: { distanceKm: 100, tollCny: 20, parkingCny: 0 }
      },
      references,
      profile: "BALANCED"
    });

    expect(summary.categoriesFen.outboundTransport).toBe(8_400);
  });
});

describe("cost reference service", () => {
  it("selects active destination references effective on the travel date", () => {
    const categories = [
      ["ACCOMMODATION_ROOM_NIGHT", "accommodationRoomNightFen", 30000],
      ["FOOD_PERSON_MEAL", "foodPersonMealFen", 3000],
      ["ATTRACTION_PERSON_ENTRY", "attractionPersonEntryFen", 5000],
      ["ENTERTAINMENT_PERSON_ENTRY", "entertainmentPersonEntryFen", 4000],
      ["OTHER_TRIP", "otherTripFen", 5000],
      ["FUEL_LITRE", "fuelLitreFen", 800],
      ["PARKING_DAY", "parkingDayFen", 2000]
    ];
    const records = categories.map(([category, , amountFen]) => ({
      id: `ref-${category}`,
      destinationId: "beijing",
      category,
      unit: "REFERENCE",
      amountFen,
      status: "ACTIVE",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-12-31",
      source: { provider: "DATABASE", sourceId: `source-${category}` }
    }));
    records.push({ ...records[0], id: "old", amountFen: 1, status: "OUTDATED" });

    const resolved = resolveCostReferences(records, {
      destinationId: "beijing",
      onDate: "2026-08-14"
    });

    for (const [, key, amountFen] of categories) expect(resolved[key]).toBe(amountFen);
    expect(Object.keys(resolved.provenance)).toHaveLength(7);
  });

  it("fails explicitly when a required reference is missing", () => {
    expect(() => resolveCostReferences([], {
      destinationId: "beijing",
      onDate: "2026-08-14"
    })).toThrow(expect.objectContaining({ code: "MISSING_COST_REFERENCE" }));
  });
});
