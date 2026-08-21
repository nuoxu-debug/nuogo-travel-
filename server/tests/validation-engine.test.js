import { describe, expect, it, vi } from "vitest";
import { buildTripLegs } from "../src/services/itinerary/buildTripLegs.js";
import { propagateSchedule } from "../src/services/itinerary/propagateSchedule.js";
import { validateItinerary } from "../src/services/validation/validationEngine.js";
import { validateSpendingProfiles } from "../src/services/validation/validators/spendingProfileValidator.js";

const preferences = {
  origin: "Beijing Capital Airport",
  destination: "beijing",
  startDate: "2026-10-10",
  endDate: "2026-10-11",
  arrivalDateTime: "2026-10-10T08:00:00+08:00",
  departureDateTime: "2026-10-11T20:00:00+08:00",
  localTransportPreference: "PUBLIC_TRANSIT",
  totalBudgetCny: 5000
};

const locations = {
  origin: { longitude: 116.5975, latitude: 40.0799 },
  hotel: { longitude: 116.4074, latitude: 39.9042 },
  "candidate:beijing:B001": { longitude: 116.397, latitude: 39.918 },
  "candidate:beijing:B002": { longitude: 116.4066, latitude: 39.8819 },
  destination: { longitude: 116.5975, latitude: 40.0799 }
};

function activity(sequence, poiId, start = "10:00", duration = 90) {
  return {
    sequence,
    poiId,
    activityType: "HISTORY",
    plannedStartTime: start,
    plannedDurationMinutes: duration,
    reason: "Requested history stop."
  };
}

function itinerary() {
  return {
    variant: "BALANCED",
    trip: {
      origin: preferences.origin,
      destination: "beijing",
      startDate: preferences.startDate,
      endDate: preferences.endDate,
      travellerCount: 2,
      totalBudgetCny: 5000
    },
    days: [
      {
        dayNumber: 1,
        date: "2026-10-10",
        startPoint: { locationId: "origin", locationType: "ORIGIN" },
        activities: [activity(1, "candidate:beijing:B001")],
        endPoint: { locationId: "hotel", locationType: "HOTEL" }
      },
      {
        dayNumber: 2,
        date: "2026-10-11",
        startPoint: { locationId: "hotel", locationType: "HOTEL" },
        activities: [activity(1, "candidate:beijing:B002", "09:00")],
        endPoint: { locationId: "destination", locationType: "DESTINATION" }
      }
    ],
    budgetSummary: { totalFen: 300_000, budgetFen: 500_000, withinBudget: true }
  };
}

const candidatePool = {
  candidateIds: ["candidate:beijing:B001", "candidate:beijing:B002"]
};

describe("trip leg and schedule enrichment", () => {
  it("builds ordered route legs from start through activities to end", async () => {
    const routeProvider = {
      getRoute: vi.fn(async () => ({
        provider: "AMAP",
        distanceMeters: 1200,
        durationSeconds: 600,
        retrievedAt: "2026-08-14T00:00:00.000Z"
      }))
    };
    const enriched = await buildTripLegs(itinerary(), {
      locations,
      routeProvider,
      mode: "PUBLIC_TRANSIT",
      routeCostResolver: () => 300
    });

    expect(routeProvider.getRoute).toHaveBeenCalledTimes(4);
    expect(enriched.days[0].legs).toEqual([
      expect.objectContaining({
        fromLocationId: "origin",
        toLocationId: "candidate:beijing:B001",
        durationMinutes: 10,
        estimatedCostFen: 300,
        routeSource: "AMAP"
      }),
      expect.objectContaining({
        fromLocationId: "candidate:beijing:B001",
        toLocationId: "hotel"
      })
    ]);
  });

  it("keeps route failures explicit instead of substituting zero duration or cost", async () => {
    const enriched = await buildTripLegs(itinerary(), {
      locations,
      routeProvider: { getRoute: vi.fn().mockRejectedValue(Object.assign(new Error("No route"), { code: "ROUTE_UNAVAILABLE" })) },
      mode: "PUBLIC_TRANSIT",
      routeCostResolver: () => 300
    });

    expect(enriched.days[0].legs).toEqual([]);
    expect(enriched.days[0].routeUnavailable).toMatchObject({
      code: "ROUTE_UNAVAILABLE",
      fromLocationId: "origin",
      toLocationId: "candidate:beijing:B001"
    });
  });

  it("propagates travel time and records model schedule shifts", () => {
    const day = {
      ...itinerary().days[0],
      activities: [
        activity(1, "candidate:beijing:B001", "09:00", 60),
        activity(2, "candidate:beijing:B002", "10:00", 60)
      ],
      legs: [
        { durationMinutes: 30 },
        { durationMinutes: 45 },
        { durationMinutes: 15 }
      ]
    };

    const scheduled = propagateSchedule(day, { dayStartTime: "08:45" });

    expect(scheduled.activities[0]).toMatchObject({ scheduledStartTime: "09:15", scheduledEndTime: "10:15", scheduleShiftMinutes: 15 });
    expect(scheduled.activities[1]).toMatchObject({ scheduledStartTime: "11:00", scheduledEndTime: "12:00", scheduleShiftMinutes: 60 });
    expect(scheduled.endTime).toBe("12:15");
  });
});

describe("validation engine", () => {
  it("accepts a continuous, routed, in-budget itinerary", async () => {
    const routed = await buildTripLegs(itinerary(), {
      locations,
      routeProvider: { getRoute: async () => ({
        provider: "AMAP", distanceMeters: 1000, durationSeconds: 600,
        retrievedAt: "2026-08-14T00:00:00.000Z"
      }) },
      mode: "PUBLIC_TRANSIT",
      routeCostResolver: () => 300
    });
    const scheduled = {
      ...routed,
      days: routed.days.map((day) => propagateSchedule(day, {
        dayStartTime: day.dayNumber === 1 ? "08:00" : "08:30"
      }))
    };

    expect(validateItinerary({ preferences, itinerary: scheduled, candidatePool }))
      .toEqual({ valid: true, issues: [] });
  });

  it("reports unknown and duplicate POIs without chain-of-thought text", () => {
    const invalid = itinerary();
    invalid.days[1].activities[0].poiId = "candidate:beijing:B001";
    invalid.days[1].activities.push(activity(2, "candidate:beijing:UNKNOWN", "12:00"));

    const result = validateItinerary({ preferences, itinerary: invalid, candidatePool });

    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "UNKNOWN_POI", path: ["days", 1, "activities", 1, "poiId"], severity: "ERROR" }),
      expect.objectContaining({ code: "DUPLICATE_POI", severity: "ERROR" })
    ]));
    expect(JSON.stringify(result.issues)).not.toContain("because I think");
  });

  it("reports consecutive-day, first-day, and final-day continuity errors", () => {
    const invalid = itinerary();
    invalid.days[0].startPoint = { locationId: "hotel", locationType: "HOTEL" };
    invalid.days[1].startPoint = { locationId: "other-hotel", locationType: "HOTEL" };
    invalid.days[1].endPoint = { locationId: "hotel", locationType: "HOTEL" };

    const codes = validateItinerary({ preferences, itinerary: invalid, candidatePool }).issues
      .map(({ code }) => code);
    expect(codes).toEqual(expect.arrayContaining([
      "ARRIVAL_CONSTRAINT_VIOLATION",
      "LOCATION_CONTINUITY_ERROR",
      "DEPARTURE_CONSTRAINT_VIOLATION"
    ]));
  });

  it("reports route, travel-time, overlap, date, duration, and hard-budget failures", () => {
    const invalid = itinerary();
    invalid.days[0].routeUnavailable = { code: "ROUTE_UNAVAILABLE" };
    invalid.days[0].activities = [
      { ...activity(1, "candidate:beijing:B001", "07:00", 500), scheduledStartTime: "08:30", scheduledEndTime: "16:50", scheduleShiftMinutes: 90 },
      { ...activity(2, "candidate:beijing:B002", "12:00", 400), scheduledStartTime: "12:00", scheduledEndTime: "18:40", scheduleShiftMinutes: 0 }
    ];
    invalid.days[0].date = "2026-10-09";
    invalid.budgetSummary = { totalFen: 600_000, budgetFen: 500_000, withinBudget: false };

    const codes = validateItinerary({ preferences, itinerary: invalid, candidatePool }).issues
      .map(({ code }) => code);
    expect(codes).toEqual(expect.arrayContaining([
      "ROUTE_UNAVAILABLE",
      "TRAVEL_TIME_CONFLICT",
      "TIME_OVERLAP",
      "DATE_RANGE_ERROR",
      "DAILY_DURATION_EXCEEDED",
      "BUDGET_EXCEEDED"
    ]));
  });
});

describe("spending profile differentiation", () => {
  it("rejects duplicated profile strategies instead of presenting simulated choice", () => {
    const metrics = {
      accommodationTier: "MID_RANGE",
      foodTier: "BALANCED",
      transportDistribution: { PUBLIC_TRANSIT: 4 },
      estimatedTotalFen: 200_000
    };
    const variants = ["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"].map((variant) => ({
      state: "FINAL_VALIDATED",
      itinerary: {
        variant,
        days: [{ activities: [{ poiId: "same-1" }, { poiId: "same-2" }] }]
      },
      variantMetrics: metrics
    }));

    expect(validateSpendingProfiles(variants)).toEqual([
      expect.objectContaining({
        code: "INSUFFICIENT_VARIANT_DIFFERENTIATION",
        severity: "ERROR"
      })
    ]);
  });
});
