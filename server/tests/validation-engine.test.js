import { describe, expect, it } from "vitest";
import { buildTripLegs } from "../src/services/itinerary/buildTripLegs.js";
import { propagateSchedule } from "../src/services/itinerary/propagateSchedule.js";
import { validateItinerary } from "../src/services/validation/validationEngine.js";
import {
  MIN_PROFILE_DIFFERENTIATION_FEN,
  validateSpendingProfiles
} from "../src/services/validation/validators/spendingProfileValidator.js";
import { deterministicRepair } from "../src/services/repair/deterministicRepair.js";
import { validateDailyDensity } from "../src/services/validation/validators/dailyDensityValidator.js";

const preferences = {
  origin: "Singapore Capital Airport",
  destination: "singapore",
  startDate: "2026-10-10",
  endDate: "2026-10-11",
  arrivalDateTime: "2026-10-10T08:00:00+08:00",
  departureDateTime: "2026-10-11T20:00:00+08:00",
  localTransportPreference: "PUBLIC_TRANSIT",
  budgetMinor: 5000
};

const locations = {
  origin: { longitude: 116.5975, latitude: 40.0799 },
  hotel: { longitude: 116.4074, latitude: 39.9042 },
  "Q-B001": { longitude: 116.397, latitude: 39.918 },
  "Q-B002": { longitude: 116.4066, latitude: 39.8819 },
  destination: { longitude: 116.5975, latitude: 40.0799 }
};

function activity(sequence, xid, start = "10:00", duration = 90) {
  return {
    sequence,
    xid,
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
      destination: "singapore",
      startDate: preferences.startDate,
      endDate: preferences.endDate,
      travellerCount: 2,
      budgetMinor: 5000
    },
    days: [
      {
        dayNumber: 1,
        date: "2026-10-10",
        startPoint: { locationId: "origin", locationType: "ORIGIN" },
        activities: [activity(1, "Q-B001")],
        endPoint: { locationId: "hotel", locationType: "HOTEL" }
      },
      {
        dayNumber: 2,
        date: "2026-10-11",
        startPoint: { locationId: "hotel", locationType: "HOTEL" },
        activities: [activity(1, "Q-B002", "09:00")],
        endPoint: { locationId: "destination", locationType: "DESTINATION" }
      }
    ],
    budgetSummary: { totalMinor: 300_000, budgetMinor: 500_000, withinBudget: true }
  };
}

const candidatePool = {
  candidateIds: ["Q-B001", "Q-B002"]
};

describe("trip leg and schedule enrichment", () => {
  it("builds ordered route legs from start through activities to end", async () => {
    const enriched = await buildTripLegs(itinerary(), {
      locations,
      mode: "PUBLIC_TRANSIT",
      routeCostResolver: () => 300
    });

    expect(enriched.days[0].legs).toEqual([
      expect.objectContaining({
        fromLocationId: "origin",
        toLocationId: "Q-B001",
        estimatedCostMinor: 300,
        routeSource: "ESTIMATED",
        sourceType: "ESTIMATED",
        durationMinutes: expect.any(Number)
      }),
      expect.objectContaining({
        fromLocationId: "Q-B001",
        toLocationId: "hotel"
      })
    ]);
  });

  it("keeps missing coordinates explicit instead of substituting zero duration or cost", async () => {
    const enriched = await buildTripLegs(itinerary(), {
      locations: { ...locations, origin: undefined },
      mode: "PUBLIC_TRANSIT",
      routeCostResolver: () => 300
    });

    expect(enriched.days[0].legs).toEqual([]);
    expect(enriched.days[0].routeUnavailable).toMatchObject({
      code: "ROUTE_UNAVAILABLE",
      fromLocationId: "origin",
      toLocationId: "Q-B001"
    });
  });

  it("routes only grounded attraction waypoints in a mixed schedule", async () => {
    const mixed = itinerary();
    mixed.days = [{
      ...mixed.days[0],
      activities: [
        activity(1, "Q-B001", "09:00", 60),
        {
          sequence: 2,
          activityType: "MEAL",
          sourceType: "AI_GENERATED",
          plannedStartTime: "12:00",
          plannedDurationMinutes: 60,
          reason: "Generic meal break."
        },
        activity(3, "Q-B002", "14:00", 60)
      ]
    }];

    const routed = await buildTripLegs(mixed, { locations, mode: "PUBLIC_TRANSIT" });
    const scheduled = propagateSchedule(routed.days[0]);

    expect(routed.days[0].legs.map(({ fromLocationId, toLocationId }) =>
      [fromLocationId, toLocationId])).toEqual([
      ["origin", "Q-B001"],
      ["Q-B001", "Q-B002"],
      ["Q-B002", "hotel"]
    ]);
    expect(scheduled.activities.every(({ scheduledStartTime }) => Boolean(scheduledStartTime))).toBe(true);
  });

  it("propagates travel time and records model schedule shifts", () => {
    const day = {
      ...itinerary().days[0],
      activities: [
        activity(1, "Q-B001", "09:00", 60),
        activity(2, "Q-B002", "10:00", 60)
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
  it("requires one ordered entry-day for every inclusive requested date", () => {
    const requestedPreferences = {
      ...preferences,
      endDate: "2026-10-14",
      departureDateTime: "2026-10-14T20:00:00+08:00"
    };
    const scheduleIssues = (days) => validateItinerary({
      preferences: requestedPreferences,
      itinerary: { ...itinerary(), days },
      candidatePool
    }).issues;
    const sourceDays = itinerary().days;

    expect(scheduleIssues([sourceDays[0]]).map(({ code }) => code))
      .toContain("SCHEDULE_DATE_MISSING");
    expect(scheduleIssues([
      sourceDays[0],
      { ...sourceDays[1], date: "2026-10-11" },
      { ...sourceDays[1], date: "2026-10-11" },
      { ...sourceDays[1], date: "2026-10-13" },
      { ...sourceDays[1], date: "2026-10-14" }
    ]).map(({ code }) => code)).toContain("SCHEDULE_DATE_DUPLICATE");
    expect(scheduleIssues([
      sourceDays[0],
      { ...sourceDays[1], date: "2026-10-12" },
      { ...sourceDays[1], date: "2026-10-11" },
      { ...sourceDays[1], date: "2026-10-13" },
      { ...sourceDays[1], date: "2026-10-14" }
    ]).map(({ code }) => code)).toContain("SCHEDULE_DATE_ORDER_ERROR");
  });

  it("accepts a continuous, routed, in-budget itinerary", async () => {
    const routed = await buildTripLegs(itinerary(), {
      locations,
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

  it("reports missing, unknown, and duplicate attraction xids without flagging generic entries", () => {
    const invalid = itinerary();
    invalid.days[1].activities[0].xid = "Q-B001";
    invalid.days[1].activities.push(activity(2, "Q-UNKNOWN", "12:00"));
    invalid.days[0].activities.push({
      sequence: 2,
      activityType: "MEAL",
      sourceType: "AI_GENERATED",
      plannedStartTime: "12:00",
      plannedDurationMinutes: 60,
      reason: "Generic meal break."
    });
    invalid.days[0].activities.push({ ...activity(3, "Q-B002", "14:00"), xid: undefined });

    const result = validateItinerary({ preferences, itinerary: invalid, candidatePool });

    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "UNKNOWN_ATTRACTION_XID", path: ["days", 1, "activities", 1, "xid"], severity: "ERROR" }),
      expect.objectContaining({ code: "MISSING_ATTRACTION_XID", path: ["days", 0, "activities", 2, "xid"], severity: "ERROR" }),
      expect.objectContaining({ code: "DUPLICATE_ATTRACTION_XID", severity: "ERROR" })
    ]));
    expect(result.issues.some(({ path }) => path.join(".") === "days.0.activities.1.xid")).toBe(false);
    expect(JSON.stringify(result.issues)).not.toContain("because I think");
  });

  it("reports consecutive-day continuity without obsolete arrival or departure constraints", () => {
    const invalid = itinerary();
    invalid.days[0].startPoint = { locationId: "hotel", locationType: "HOTEL" };
    invalid.days[1].startPoint = { locationId: "other-hotel", locationType: "HOTEL" };
    invalid.days[1].endPoint = { locationId: "hotel", locationType: "HOTEL" };

    const codes = validateItinerary({ preferences, itinerary: invalid, candidatePool }).issues
      .map(({ code }) => code);
    expect(codes).toContain("LOCATION_CONTINUITY_ERROR");
    expect(codes).not.toEqual(expect.arrayContaining(["ARRIVAL_CONSTRAINT_VIOLATION", "DEPARTURE_CONSTRAINT_VIOLATION"]));
  });

  it("reports route, travel-time, overlap, date, duration, and hard-budget failures", () => {
    const invalid = itinerary();
    invalid.days[0].routeUnavailable = { code: "ROUTE_UNAVAILABLE" };
    invalid.days[0].activities = [
      { ...activity(1, "Q-B001", "07:00", 500), scheduledStartTime: "08:30", scheduledEndTime: "16:50", scheduleShiftMinutes: 90 },
      { ...activity(2, "Q-B002", "12:00", 400), scheduledStartTime: "12:00", scheduledEndTime: "18:40", scheduleShiftMinutes: 0 }
    ];
    invalid.days[0].date = "2026-10-09";
    invalid.budgetSummary = { totalMinor: 600_000, budgetMinor: 500_000, withinBudget: false };

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

  it("reports an under-filled full day with density measurements", () => {
    const result = validateItinerary({
      preferences: {
        ...preferences,
        startDate: "2026-10-10",
        endDate: "2026-10-10",
        arrivalDateTime: "2026-10-10T08:00:00+08:00",
        departureDateTime: "2026-10-10T20:00:00+08:00"
      },
      itinerary: {
        ...itinerary(),
        days: [itinerary().days[0]]
      },
      candidatePool: { candidateIds: ["Q-B001", "Q-B002", "Q-B003"] }
    });

    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "DAILY_DENSITY_TOO_LOW",
      metadata: {
        availableMinutes: 720,
        meaningfulEntries: 1,
        attractionEntries: 1,
        reason: "FULL_DAY_REQUIRES_THREE_MEANINGFUL_ENTRIES_AND_TWO_ATTRACTIONS"
      }
    }));
  });

  it("uses the requested daily attraction target when a full day has enough candidates", () => {
    const result = validateItinerary({
      preferences: {
        ...preferences,
        startDate: "2026-10-10",
        endDate: "2026-10-10",
        arrivalDateTime: "2026-10-10T08:00:00+08:00",
        departureDateTime: "2026-10-10T20:00:00+08:00",
        dailyAttractionTarget: 4
      },
      itinerary: {
        ...itinerary(),
        days: [itinerary().days[0]]
      },
      candidatePool: { candidateIds: ["Q-B001", "Q-B002", "Q-B003", "Q-B004", "Q-B005"] }
    });

    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "DAILY_DENSITY_TOO_LOW",
      metadata: expect.objectContaining({
        availableMinutes: 720,
        attractionEntries: 1,
        requiredAttractionEntries: 4,
        requestedDailyAttractionTarget: 4,
        reason: "DAILY_ATTRACTION_TARGET_NOT_MET"
      })
    }));
  });

  it("does not silently cap a requested six-attraction day to four", () => {
    const result = validateItinerary({
      preferences: {
        ...preferences,
        startDate: "2026-10-10",
        endDate: "2026-10-10",
        arrivalDateTime: "2026-10-10T08:00:00+08:00",
        departureDateTime: "2026-10-10T20:00:00+08:00",
        dailyAttractionTarget: 6
      },
      itinerary: {
        ...itinerary(),
        days: [{
          ...itinerary().days[0],
          activities: [
            activity(1, "Q-B001", "09:00", 90),
            activity(2, "Q-B002", "10:45", 90),
            activity(3, "Q-B003", "12:30", 90),
            activity(4, "Q-B004", "14:15", 90),
            {
              sequence: 5,
              activityType: "MEAL",
              plannedStartTime: "17:30",
              plannedDurationMinutes: 60,
              reason: "Dinner."
            }
          ]
        }]
      },
      candidatePool: {
        candidateIds: ["Q-B001", "Q-B002", "Q-B003", "Q-B004", "Q-B005", "Q-B006"],
        candidates: [
          { xid: "Q-B001", category: "CULTURE" },
          { xid: "Q-B002", category: "HISTORY" },
          { xid: "Q-B003", category: "NATURE" },
          { xid: "Q-B004", category: "ENTERTAINMENT" },
          { xid: "Q-B005", category: "CULTURE" },
          { xid: "Q-B006", category: "HISTORY" }
        ]
      }
    });

    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "DAILY_DENSITY_TOO_LOW",
      metadata: expect.objectContaining({
        requestedDailyAttractionTarget: 6,
        requiredAttractionEntries: 6,
        attractionEntries: 4
      })
    }));
  });

  it("does not count meals or transport toward the requested sightseeing target", () => {
    const issues = validateDailyDensity({
      preferences: {
        ...preferences,
        startDate: "2026-10-10",
        endDate: "2026-10-10",
        arrivalDateTime: "2026-10-10T08:00:00+08:00",
        departureDateTime: "2026-10-10T20:00:00+08:00",
        dailyAttractionTarget: 6
      },
      itinerary: {
        ...itinerary(),
        days: [{
          ...itinerary().days[0],
          activities: [
            activity(1, "Q-B001", "09:00", 90),
            activity(2, "Q-B002", "10:45", 90),
            activity(3, "Q-B003", "12:30", 90),
            activity(4, "Q-B004", "14:15", 90),
            {
              sequence: 5,
              activityType: "MEAL",
              plannedStartTime: "16:00",
              plannedDurationMinutes: 60,
              reason: "Late lunch."
            },
            {
              sequence: 6,
              activityType: "TRANSFER",
              plannedStartTime: "17:00",
              plannedDurationMinutes: 30,
              reason: "Move across town."
            },
            {
              sequence: 7,
              activityType: "MEAL",
              plannedStartTime: "18:00",
              plannedDurationMinutes: 60,
              reason: "Dinner."
            }
          ]
        }]
      },
      candidatePool: {
        candidateIds: ["Q-B001", "Q-B002", "Q-B003", "Q-B004", "Q-B005", "Q-B006"],
        candidates: [
          { xid: "Q-B001", category: "CULTURE" },
          { xid: "Q-B002", category: "HISTORY" },
          { xid: "Q-B003", category: "NATURE" },
          { xid: "Q-B004", category: "ENTERTAINMENT" },
          { xid: "Q-B005", category: "CULTURE" },
          { xid: "Q-B006", category: "HISTORY" }
        ]
      }
    });

    expect(issues).toContainEqual(expect.objectContaining({
      code: "DAILY_DENSITY_TOO_LOW",
      metadata: expect.objectContaining({
        meaningfulEntries: 4,
        attractionEntries: 4,
        requestedDailyAttractionTarget: 6
      })
    }));
  });

  it("counts database POI categories as attraction candidates for density", () => {
    const issues = validateDailyDensity({
      preferences: {
        ...preferences,
        startDate: "2026-10-10",
        endDate: "2026-10-10",
        arrivalDateTime: "2026-10-10T08:00:00+08:00",
        departureDateTime: "2026-10-10T20:00:00+08:00",
        dailyAttractionTarget: 3
      },
      itinerary: {
        ...itinerary(),
        days: [itinerary().days[0]]
      },
      candidatePool: {
        candidateIds: ["Q-B001", "Q-B002", "Q-B003", "Q-B004"],
        candidates: [
          { xid: "Q-B001", category: "CULTURE" },
          { xid: "Q-B002", category: "HISTORY" },
          { xid: "Q-B003", category: "NATURE" },
          { xid: "Q-B004", category: "ENTERTAINMENT" }
        ]
      }
    });

    expect(issues).toContainEqual(expect.objectContaining({
      code: "DAILY_DENSITY_TOO_LOW",
      metadata: expect.objectContaining({
        requiredAttractionEntries: 3,
        attractionEntries: 1
      })
    }));
  });

  it("rejects generic filler before the first grounded attraction", () => {
    const invalid = itinerary();
    invalid.days = [{
      ...invalid.days[0],
      activities: [
        {
          sequence: 1,
          activityType: "REST",
          sourceType: "AI_GENERATED",
          plannedStartTime: "09:00",
          plannedDurationMinutes: 60,
          reason: "Start with a rest stop."
        },
        {
          sequence: 2,
          activityType: "MEAL",
          sourceType: "AI_GENERATED",
          plannedStartTime: "10:00",
          plannedDurationMinutes: 45,
          reason: "Breakfast before sightseeing."
        },
        activity(3, "Q-B001", "11:00", 90),
        activity(4, "Q-B002", "14:00", 90)
      ]
    }];

    const result = validateItinerary({ preferences, itinerary: invalid, candidatePool });

    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "GENERIC_PREFIX_TOO_LONG",
        path: ["days", 0, "activities"],
        severity: "ERROR",
        metadata: expect.objectContaining({ firstAttractionIndex: 2 })
      }),
      expect.objectContaining({
        code: "DAY_STARTS_WITH_WEAK_GENERIC_ENTRY",
        path: ["days", 0, "activities", 0],
        severity: "ERROR",
        metadata: expect.objectContaining({ activityType: "REST" })
      })
    ]));
  });

  it("rejects transfer activities because transport belongs to route legs", () => {
    const invalid = itinerary();
    invalid.days = [{
      ...invalid.days[0],
      activities: [
        activity(1, "Q-B001", "09:00", 90),
        {
          sequence: 2,
          activityType: "TRANSFER",
          sourceType: "AI_GENERATED",
          plannedStartTime: "11:00",
          plannedDurationMinutes: 30,
          reason: "Move to the next area."
        },
        activity(3, "Q-B002", "12:00", 90)
      ]
    }];

    const result = validateItinerary({ preferences, itinerary: invalid, candidatePool });

    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "GENERIC_TRANSFER_ACTIVITY",
      path: ["days", 0, "activities", 1],
      severity: "ERROR"
    }));
  });

  it("rejects a day that contains only generic meals and no grounded POI activity", () => {
    const invalid = itinerary();
    invalid.days = [{
      ...invalid.days[0],
      activities: [
        {
          sequence: 1,
          activityType: "MEAL",
          sourceType: "AI_GENERATED",
          plannedStartTime: "09:00",
          plannedDurationMinutes: 45,
          reason: "Breakfast at a hawker centre."
        },
        {
          sequence: 2,
          activityType: "MEAL",
          sourceType: "AI_GENERATED",
          plannedStartTime: "12:30",
          plannedDurationMinutes: 60,
          reason: "Lunch between museum visits."
        },
        {
          sequence: 3,
          activityType: "MEAL",
          sourceType: "AI_GENERATED",
          plannedStartTime: "18:30",
          plannedDurationMinutes: 75,
          reason: "Dinner at a historic food centre."
        }
      ]
    }];

    const result = validateItinerary({ preferences, itinerary: invalid, candidatePool });

    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "DAY_HAS_NO_GROUNDED_POI_ACTIVITY",
      path: ["days", 0, "activities"],
      severity: "ERROR",
      metadata: expect.objectContaining({ genericActivityCount: 3 })
    }));
  });

  it("rejects broad destination-area fixtures as scheduled attraction stops", () => {
    const invalid = itinerary();
    invalid.days = [{
      ...invalid.days[0],
      activities: [
        activity(1, "demo-sg-sentosa", "09:00", 120),
        activity(2, "demo-sg-universal-studios", "11:45", 240)
      ]
    }];

    const result = validateItinerary({
      preferences,
      itinerary: invalid,
      candidatePool: {
        candidateIds: ["demo-sg-sentosa", "demo-sg-universal-studios"],
        candidates: [
          {
            xid: "demo-sg-sentosa",
            name: "Sentosa",
            coordinates: { latitude: 1.2540, longitude: 103.8238 }
          },
          {
            xid: "demo-sg-universal-studios",
            name: "Universal Studios Singapore",
            coordinates: { latitude: 1.2543, longitude: 103.8238 }
          }
        ]
      }
    });

    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "BROAD_AREA_USED_AS_ATTRACTION",
      path: ["days", 0, "activities", 0, "xid"],
      severity: "ERROR",
      metadata: expect.objectContaining({ xid: "demo-sg-sentosa" })
    }));
  });

  it("allows distinct address-level sub-attractions that share the same coordinates", () => {
    const valid = itinerary();
    valid.days = [{
      ...valid.days[0],
      activities: [
        activity(1, "sg-flower-dome-cloud-forest", "09:00", 120),
        activity(2, "sg-ocbc-skyway", "11:45", 60),
        activity(3, "sg-supertree-observatory", "13:00", 60)
      ]
    }];

    const result = validateItinerary({
      preferences,
      itinerary: valid,
      candidatePool: {
        candidateIds: ["sg-flower-dome-cloud-forest", "sg-ocbc-skyway", "sg-supertree-observatory"],
        candidates: [
          {
            xid: "sg-flower-dome-cloud-forest",
            name: "Flower Dome & Cloud Forest",
            coordinates: { latitude: 1.284588588663125, longitude: 103.8646565996385 }
          },
          {
            xid: "sg-ocbc-skyway",
            name: "OCBC Skyway",
            coordinates: { latitude: 1.284588588663125, longitude: 103.8646565996385 }
          },
          {
            xid: "sg-supertree-observatory",
            name: "Supertree Observatory",
            coordinates: { latitude: 1.284588588663125, longitude: 103.8646565996385 }
          }
        ]
      }
    });

    expect(result.issues.some(({ code }) => code === "NEAR_DUPLICATE_ADJACENT_POI")).toBe(false);
  });

  it("rejects repeated use of the same canonical attraction stop", () => {
    const invalid = itinerary();
    invalid.days = [{
      ...invalid.days[0],
      activities: [
        activity(1, "sg-ocbc-skyway", "09:00", 60),
        activity(2, "sg-ocbc-skyway", "11:00", 60)
      ]
    }];

    const result = validateItinerary({
      preferences,
      itinerary: invalid,
      candidatePool: {
        candidateIds: ["sg-ocbc-skyway"],
        candidates: [{
          xid: "sg-ocbc-skyway",
          name: "OCBC Skyway",
          coordinates: { latitude: 1.284588588663125, longitude: 103.8646565996385 }
        }]
      }
    });

    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "DUPLICATE_ATTRACTION_XID",
      path: ["days", 0, "activities", 1, "xid"],
      severity: "ERROR"
    }));
  });

  it("rejects consecutive near-duplicate attraction stops only when duplicate name evidence exists", () => {
    const invalid = itinerary();
    invalid.days = [{
      ...invalid.days[0],
      activities: [
        activity(1, "demo-sg-gallery-a", "09:00", 120),
        activity(2, "demo-sg-gallery-b", "11:45", 120)
      ]
    }];

    const result = validateItinerary({
      preferences,
      itinerary: invalid,
      candidatePool: {
        candidateIds: ["demo-sg-gallery-a", "demo-sg-gallery-b"],
        candidates: [
          {
            xid: "demo-sg-gallery-a",
            name: "Duplicate Gallery",
            coordinates: { latitude: 1.2540, longitude: 103.8238 }
          },
          {
            xid: "demo-sg-gallery-b",
            name: "duplicate gallery",
            coordinates: { latitude: 1.2543, longitude: 103.8238 }
          }
        ]
      }
    });

    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "NEAR_DUPLICATE_ADJACENT_POI",
      path: ["days", 0, "activities", 1, "xid"],
      severity: "ERROR",
      metadata: expect.objectContaining({
        xid: "demo-sg-gallery-b",
        previousXid: "demo-sg-gallery-a"
      })
    }));
  });

  it("reports an under-filled medium day", () => {
    const result = validateItinerary({
      preferences: {
        ...preferences,
        startDate: "2026-10-10",
        endDate: "2026-10-10",
        arrivalDateTime: "2026-10-10T14:00:00+08:00",
        departureDateTime: "2026-10-10T20:00:00+08:00"
      },
      itinerary: { ...itinerary(), days: [itinerary().days[0]] },
      candidatePool: { candidateIds: ["Q-B001", "Q-B002"] }
    });

    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "DAILY_DENSITY_TOO_LOW",
      metadata: expect.objectContaining({
        availableMinutes: 360,
        meaningfulEntries: 1,
        attractionEntries: 1,
        reason: "MEDIUM_DAY_REQUIRES_TWO_MEANINGFUL_ENTRIES"
      })
    }));
  });

  it("allows a short day, slow pace, a long attraction, and verified candidate scarcity", () => {
    const base = {
      itinerary: { ...itinerary(), days: [itinerary().days[0]] },
      candidatePool: { candidateIds: ["Q-B001", "Q-B002", "Q-B003"] }
    };
    const densityIssues = (preferenceOverrides, itineraryOverrides = {}, pool = base.candidatePool) =>
      validateDailyDensity({
        preferences: {
          ...preferences,
          startDate: "2026-10-10",
          endDate: "2026-10-10",
          arrivalDateTime: "2026-10-10T08:00:00+08:00",
          departureDateTime: "2026-10-10T20:00:00+08:00",
          ...preferenceOverrides
        },
        itinerary: { ...base.itinerary, ...itineraryOverrides },
        candidatePool: pool
      });

    expect(densityIssues({ arrivalDateTime: "2026-10-10T16:00:00+08:00" })).toEqual([]);
    expect(densityIssues({ pace: "slow" })).toEqual([]);
    expect(densityIssues({}, {
      days: [{
        ...base.itinerary.days[0],
        activities: [activity(1, "Q-B001", "10:00", 240)]
      }]
    })).toEqual([]);
    expect(densityIssues({}, {}, { candidateIds: ["Q-B001"] })).toEqual([]);
  });

  it("treats insufficient unique candidates for all full days as verified scarcity", () => {
    const result = validateDailyDensity({
      preferences,
      itinerary: itinerary(),
      candidatePool: {
        candidateIds: ["Q-B001", "Q-B002", "Q-B003"]
      }
    });

    expect(result).toEqual([]);
  });

  it("signals regeneration for density issues without adding filler activities", () => {
    const input = itinerary();
    const result = deterministicRepair(input, [{
      code: "DAILY_DENSITY_TOO_LOW",
      path: ["days", 0],
      severity: "ERROR",
      metadata: {}
    }]);

    expect(result.changed).toBe(false);
    expect(result.itinerary.days[0].activities).toEqual(input.days[0].activities);
    expect(result.regenerationRequiredCodes).toEqual(["DAILY_DENSITY_TOO_LOW"]);
  });
});

describe("spending profile differentiation", () => {
  const profileTiers = [
    ["BUDGET", "BUDGET", "ECONOMY"],
    ["MID_RANGE", "BALANCED", "BALANCED"],
    ["COMFORT", "COMFORT", "COMFORT"]
  ];
  const variants = ({
    totals = [200_000, 210_000, 220_000],
    budgets = [500_000, 500_000, 500_000],
    categoryTotals = [50_000, 60_000, 70_000],
    duplicateComposition = false
  } = {}) => ["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"].map((profile, index) => ({
    state: "FINAL_VALIDATED",
    itinerary: {
      travelStyle: profile,
      days: [{
        activities: [
          { xid: duplicateComposition ? "same-1" : `${profile}-1`, activityType: "HISTORY" },
          { activityType: "MEAL", sourceType: "AI_GENERATED" }
        ]
      }]
    },
    summary: {
      totalMinor: totals[index],
      budgetMinor: budgets[index],
      withinBudget: totals[index] <= budgets[index],
      categoriesMinor: {
        accommodation: categoryTotals[index],
        foodAndBeverages: 20_000
      }
    },
    variantMetrics: {
      accommodationTier: profileTiers[index][0],
      localTransportationTier: profileTiers[index][1],
      foodTier: profileTiers[index][2],
      transportDistribution: duplicateComposition
        ? { PUBLIC_TRANSIT: 4 }
        : { [index === 0 ? "WALK" : index === 1 ? "PUBLIC_TRANSIT" : "TAXI"]: 4 },
      estimatedTotalMinor: totals[index]
    }
  }));

  it("centralizes the smallest explicit one-SGD differentiation threshold", () => {
    expect(MIN_PROFILE_DIFFERENTIATION_FEN).toBe(100);
    expect(validateSpendingProfiles(variants())).toEqual([]);
  });

  it("keeps composition similarity outside mandatory validation", () => {
    expect(validateSpendingProfiles(variants({
      totals: [200_000, 200_099, 200_199],
      categoryTotals: [50_000, 50_099, 50_199],
      duplicateComposition: true
    }))).toEqual([]);
  });

  it("rejects alternatives that do not share and fit the exact hard budget", () => {
    expect(validateSpendingProfiles(variants({
      totals: [499_800, 499_900, 500_100],
      budgets: [500_000, 500_000, 500_000]
    }))[0]).toMatchObject({
      code: "PROFILE_DIFFERENTIATION_UNAVAILABLE",
      metadata: { reasons: expect.arrayContaining(["HARD_BUDGET"]) }
    });
    expect(validateSpendingProfiles(variants({
      budgets: [500_000, 500_100, 500_000]
    }))[0]).toMatchObject({
      code: "PROFILE_DIFFERENTIATION_UNAVAILABLE",
      metadata: { reasons: expect.arrayContaining(["SHARED_BUDGET"]) }
    });
  });
});
