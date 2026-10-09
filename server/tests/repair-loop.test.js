import { describe, expect, it, vi } from "vitest";
import { deterministicRepair } from "../src/services/repair/deterministicRepair.js";
import { repairUntilValid } from "../src/services/repair/repairLoop.js";
import { targetedLlmRepair } from "../src/services/repair/targetedLlmRepair.js";
import { propagateSchedule } from "../src/services/itinerary/propagateSchedule.js";

function activity(xid, sequence = 1) {
  return {
    sequence,
    xid,
    activityType: "HISTORY",
    plannedStartTime: "09:00",
    plannedDurationMinutes: 90,
    reason: "Requested stop."
  };
}

function itinerary() {
  return {
    travelStyle: "BALANCED",
    trip: {
      destination: "singapore",
      startDate: "2026-10-10",
      endDate: "2026-10-11",
      travellerCount: 2,
      budgetMinor: 5000,
      currency: "SGD"
    },
    days: [
      {
        dayNumber: 1,
        date: "2026-10-10",
        startPoint: { locationId: "hotel", locationType: "HOTEL" },
        activities: [activity("Q-B001")],
        endPoint: { locationId: "hotel", locationType: "HOTEL" },
        legs: [{ id: "stale-route" }]
      },
      {
        dayNumber: 2,
        date: "2026-10-11",
        startPoint: { locationId: "hotel", locationType: "HOTEL" },
        activities: [activity("Q-B002")],
        endPoint: { locationId: "destination", locationType: "DESTINATION" }
      }
    ],
    budgetSummary: { totalMinor: 300000, withinBudget: true }
  };
}

const candidatePool = {
  candidateIds: ["Q-B001", "Q-B002", "Q-B003", "Q-B004"],
  candidates: [
    {
      xid: "Q-B001",
      candidateId: "Q-B001",
      name: "National Gallery Singapore",
      displayName: { en: "National Gallery Singapore", zh: "National Gallery Singapore" },
      category: "CULTURE",
      coordinates: { latitude: 1.29, longitude: 103.85 }
    },
    {
      xid: "Q-B002",
      candidateId: "Q-B002",
      name: "Asian Civilisations Museum",
      displayName: { en: "Asian Civilisations Museum", zh: "Asian Civilisations Museum" },
      category: "HISTORY",
      coordinates: { latitude: 1.287, longitude: 103.851 }
    },
    {
      xid: "Q-B003",
      candidateId: "Q-B003",
      name: "Singapore Botanic Gardens",
      displayName: { en: "Singapore Botanic Gardens", zh: "Singapore Botanic Gardens" },
      category: "NATURE",
      coordinates: { latitude: 1.313, longitude: 103.816 }
    },
    {
      xid: "Q-B004",
      candidateId: "Q-B004",
      name: "Singapore Botanic Gardens Visitor Centre",
      displayName: { en: "Singapore Botanic Gardens Visitor Centre", zh: "Singapore Botanic Gardens Visitor Centre" },
      category: "CULTURE",
      coordinates: { latitude: 1.287, longitude: 103.851 }
    }
  ],
  operatingHours: {
    weeklyHours: [
      {
        poiId: "Q-B001",
        dayOfWeek: 6,
        opensAt: "10:00:00",
        closesAt: "19:00:00",
        isClosed: false,
        status: "ACTIVE",
        verificationStatus: "VERIFIED"
      },
      {
        poiId: "Q-B002",
        dayOfWeek: 6,
        opensAt: "06:00:00",
        closesAt: "12:00:00",
        isClosed: false,
        status: "ACTIVE",
        verificationStatus: "VERIFIED"
      },
      {
        poiId: "Q-B003",
        dayOfWeek: 6,
        opensAt: "09:00:00",
        closesAt: "09:30:00",
        isClosed: false,
        status: "ACTIVE",
        verificationStatus: "VERIFIED"
      },
      {
        poiId: "Q-B004",
        dayOfWeek: 6,
        opensAt: "09:00:00",
        closesAt: "18:00:00",
        isClosed: false,
        status: "ACTIVE",
        verificationStatus: "VERIFIED"
      }
    ],
    exceptions: []
  }
};

function sixCandidatePool() {
  const ids = ["Q-B001", "Q-B002", "Q-B003", "Q-B004", "Q-B005", "Q-B006"];
  return {
    candidateIds: ids,
    candidates: ids.map((id, index) => ({
      xid: id,
      candidateId: id,
      name: `Grounded POI ${index + 1}`,
      displayName: { en: `Grounded POI ${index + 1}`, zh: `Grounded POI ${index + 1}` },
      category: ["CULTURE", "HISTORY", "NATURE", "ENTERTAINMENT", "CULTURE", "HISTORY"][index],
      coordinates: { latitude: 1.29 + index * 0.002, longitude: 103.85 + index * 0.002 },
      suggestedVisitDurationMinutes: [45, 75, 120, 90, 60, 105][index]
    })),
    operatingHours: {
      weeklyHours: ids.map((id, index) => ({
        poiId: id,
        dayOfWeek: 6,
        opensAt: index === 5 ? "14:00:00" : "09:00:00",
        closesAt: "20:00:00",
        isClosed: false,
        status: "ACTIVE",
        verificationStatus: "VERIFIED"
      })),
      exceptions: []
    }
  };
}

const issue = (code, path = [], metadata = {}) => ({ code, path, severity: "ERROR", metadata });

describe("deterministic itinerary repair", () => {
  it("removes later duplicate and unknown POIs then resequences the day", () => {
    const input = itinerary();
    input.days[1].activities = [
      activity("Q-B001", 1),
      activity("Q-UNKNOWN", 2),
      activity("Q-B002", 3)
    ];
    const result = deterministicRepair(input, [
      issue("DUPLICATE_ATTRACTION_XID", ["days", 1, "activities", 0, "xid"]),
      issue("UNKNOWN_ATTRACTION_XID", ["days", 1, "activities", 1, "xid"])
    ], { candidatePool });

    expect(result.changed).toBe(true);
    expect(result.itinerary.days[1].activities).toEqual([
      expect.objectContaining({ xid: "Q-B002", sequence: 1 })
    ]);
  });

  it("removes generic transfer activities because route legs own transport", () => {
    const input = itinerary();
    input.days[0].activities = [
      activity("Q-B001", 1),
      {
        sequence: 2,
        activityType: "TRANSFER",
        plannedStartTime: "10:30",
        plannedDurationMinutes: 45,
        reason: "Travel to next stop."
      },
      activity("Q-B002", 3)
    ];

    const result = deterministicRepair(input, [
      issue("GENERIC_TRANSFER_ACTIVITY", ["days", 0, "activities", 1])
    ], { candidatePool });

    expect(result.itinerary.days[0].activities.map(({ xid, activityType }) => xid ?? activityType))
      .toEqual(["Q-B001", "Q-B002"]);
  });

  it("repairs day continuity and invalidates stale route, schedule, and budget data", () => {
    const input = itinerary();
    input.days[1].startPoint = { locationId: "other-hotel", locationType: "HOTEL" };
    input.days[0].activities[0].scheduledStartTime = "10:00";
    const result = deterministicRepair(input, [
      issue("LOCATION_CONTINUITY_ERROR", ["days", 1, "startPoint", "locationId"])
    ], { candidatePool });

    expect(result.itinerary.days[1].startPoint).toEqual(input.days[0].endPoint);
    expect(result.itinerary.days[0].legs).toBeUndefined();
    expect(result.itinerary.days[0].activities[0].scheduledStartTime).toBeUndefined();
    expect(result.itinerary.budgetSummary).toBeUndefined();
  });

  it("removes one optional activity for deterministic budget repair", () => {
    const input = itinerary();
    input.days[0].activities.push({ ...activity("Q-B003", 2), activityType: "ENTERTAINMENT" });
    const result = deterministicRepair(input, [issue("BUDGET_EXCEEDED")], { candidatePool });
    expect(result.itinerary.days[0].activities.map(({ xid }) => xid))
      .toEqual(["Q-B001"]);
  });

  it("resynchronizes every activity in a day after a travel-time shift", () => {
    const input = itinerary();
    input.days[0].activities = [
      { ...activity("Q-B001", 1), plannedStartTime: "09:00", scheduledStartTime: "09:00" },
      { ...activity("Q-B002", 2), plannedStartTime: "11:00", scheduledStartTime: "11:45" },
      { ...activity("Q-B003", 3), plannedStartTime: "14:00", scheduledStartTime: "14:20" }
    ];

    const result = deterministicRepair(input, [
      issue("TRAVEL_TIME_CONFLICT", ["days", 0, "activities", 1, "plannedStartTime"])
    ], { candidatePool });

    expect(result.itinerary.days[0].activities.map(({ plannedStartTime }) => plannedStartTime))
      .toEqual(["10:00", "12:15", "14:30"]);
  });

  it("rebuilds canonical planned times from route-leg travel so the next validation has no shift", () => {
    const input = itinerary();
    input.days[0].activities = [
      { ...activity("Q-B001", 1), plannedStartTime: "09:00" },
      { ...activity("Q-B004", 2), plannedStartTime: "10:00", activityType: "CULTURE" }
    ];
    input.days[0].legs = [
      { fromLocationId: "hotel", toLocationId: "Q-B001", durationMinutes: 28 },
      { fromLocationId: "Q-B001", toLocationId: "Q-B004", durationMinutes: 32 },
      { fromLocationId: "Q-B004", toLocationId: "hotel", durationMinutes: 14 }
    ];

    const result = deterministicRepair(input, [
      issue("TRAVEL_TIME_CONFLICT", ["days", 0, "activities", 0, "plannedStartTime"])
    ], { candidatePool });

    expect(result.itinerary.days[0].activities.map(({ xid, plannedStartTime }) => [xid, plannedStartTime]))
      .toEqual([
        ["Q-B001", "10:00"],
        ["Q-B004", "12:02"]
      ]);

    const rescheduled = propagateSchedule({
      ...result.itinerary.days[0],
      legs: input.days[0].legs
    }, { dayStartTime: "09:00" });
    expect(rescheduled.activities.map(({ scheduleShiftMinutes }) => scheduleShiftMinutes))
      .toEqual([0, 0]);
  });

  it("adds a real grounded candidate POI to a day that has only generic activities", () => {
    const input = itinerary();
    input.days[0].activities = [
      {
        sequence: 1,
        activityType: "MEAL",
        sourceType: "AI_GENERATED",
        plannedStartTime: "09:00",
        plannedDurationMinutes: 45,
        reason: "Breakfast before sightseeing."
      },
      {
        sequence: 2,
        activityType: "REST",
        sourceType: "AI_GENERATED",
        plannedStartTime: "10:00",
        plannedDurationMinutes: 30,
        reason: "Slow start."
      }
    ];

    const result = deterministicRepair(input, [
      issue("DAY_HAS_NO_GROUNDED_POI_ACTIVITY", ["days", 0, "activities"])
    ], { candidatePool });

    expect(result.changed).toBe(true);
    expect(result.itinerary.days[0].activities[0]).toMatchObject({
      sequence: 1,
      xid: "Q-B001",
      activityType: "CULTURE",
      plannedStartTime: "09:00"
    });
    expect(result.itinerary.days[0].activities[0].reason).toContain("National Gallery Singapore");
    expect(result.itinerary.days[0].activities.every(({ xid, activityType }) =>
      !xid || candidatePool.candidates.some((candidate) =>
        candidate.xid === xid && candidate.category === activityType))).toBe(true);
  });

  it("chooses an unused candidate when repairing a later ungrounded day", () => {
    const input = itinerary();
    input.days[0].activities = [activity("Q-B001")];
    input.days[1].activities = [{
      sequence: 1,
      activityType: "MEAL",
      sourceType: "AI_GENERATED",
      plannedStartTime: "09:00",
      plannedDurationMinutes: 45,
      reason: "Breakfast only."
    }];

    const result = deterministicRepair(input, [
      issue("DAY_HAS_NO_GROUNDED_POI_ACTIVITY", ["days", 1, "activities"])
    ], { candidatePool });

    expect(result.itinerary.days[1].activities[0]).toMatchObject({
      xid: "Q-B002",
      activityType: "HISTORY"
    });
  });

  it("reorders grounded POIs to reduce obvious route backtracking", () => {
    const input = itinerary();
    input.days[0].startPoint = { locationId: "hotel", locationType: "HOTEL", coordinates: { latitude: 1.29, longitude: 103.85 } };
    input.days[0].activities = [
      activity("Q-B003", 1),
      activity("Q-B001", 2),
      activity("Q-B002", 3)
    ];

    const result = deterministicRepair(input, [
      issue("TRAVEL_TIME_CONFLICT", ["days", 0, "activities", 1, "plannedStartTime"])
    ], { candidatePool });

    expect(result.itinerary.days[0].activities.map(({ xid }) => xid)).toEqual(["Q-B001", "Q-B002", "Q-B003"]);
  });

  it("keeps distinct POIs that share the same venue coordinates while reordering", () => {
    const input = itinerary();
    input.days[0].startPoint = { locationId: "hotel", locationType: "HOTEL", coordinates: { latitude: 1.29, longitude: 103.85 } };
    input.days[0].activities = [
      activity("Q-B003", 1),
      activity("Q-B004", 2),
      activity("Q-B002", 3)
    ];

    const result = deterministicRepair(input, [
      issue("TRAVEL_TIME_CONFLICT", ["days", 0, "activities", 1, "plannedStartTime"])
    ], { candidatePool });

    expect(result.itinerary.days[0].activities.map(({ xid }) => xid)).toEqual(["Q-B004", "Q-B002", "Q-B003"]);
  });

  it("moves a verified POI scheduled before opening into its open interval", () => {
    const input = itinerary();
    input.days[0].activities = [{
      ...activity("Q-B001"),
      plannedStartTime: "09:00",
      scheduledStartTime: "09:00",
      scheduledEndTime: "10:30"
    }];

    const result = deterministicRepair(input, [
      issue("POI_CLOSED_AT_SCHEDULED_TIME", ["days", 0, "activities", 0, "scheduledStartTime"])
    ], { candidatePool });

    expect(result.itinerary.days[0].activities[0]).toMatchObject({
      xid: "Q-B001",
      plannedStartTime: "10:00"
    });
  });

  it("moves a verified POI scheduled after closing earlier when the same day can fit it", () => {
    const input = itinerary();
    input.days[0].activities = [{
      ...activity("Q-B002"),
      plannedStartTime: "13:30",
      scheduledStartTime: "13:30",
      scheduledEndTime: "14:30",
      plannedDurationMinutes: 60
    }];

    const result = deterministicRepair(input, [
      issue("POI_CLOSED_AT_SCHEDULED_TIME", ["days", 0, "activities", 0, "scheduledStartTime"])
    ], { candidatePool });

    expect(result.itinerary.days[0].activities[0]).toMatchObject({
      xid: "Q-B002",
      plannedStartTime: "09:00"
    });
  });

  it("accounts for existing travel shift when moving a closed POI before closing time", () => {
    const input = itinerary();
    input.days[0].activities = [{
      ...activity("Q-B002"),
      plannedStartTime: "11:45",
      scheduledStartTime: "12:06",
      scheduledEndTime: "13:06",
      scheduleShiftMinutes: 21,
      plannedDurationMinutes: 60
    }];

    const result = deterministicRepair(input, [
      issue("POI_CLOSED_AT_SCHEDULED_TIME", ["days", 0, "activities", 0, "scheduledStartTime"])
    ], { candidatePool });

    expect(result.itinerary.days[0].activities[0]).toMatchObject({
      xid: "Q-B002",
      plannedStartTime: "09:00"
    });
  });

  it("moves a POI that is scheduled after closing before later grounded stops", () => {
    const input = itinerary();
    input.days[0].activities = [
      {
        ...activity("Q-B001", 1),
        plannedStartTime: "10:00",
        scheduledStartTime: "10:00",
        scheduledEndTime: "11:30"
      },
      {
        ...activity("Q-B002", 2),
        plannedStartTime: "13:30",
        scheduledStartTime: "13:30",
        scheduledEndTime: "14:30",
        plannedDurationMinutes: 60
      }
    ];

    const result = deterministicRepair(input, [
      issue("POI_CLOSED_AT_SCHEDULED_TIME", ["days", 0, "activities", 1, "scheduledStartTime"])
    ], { candidatePool });

    expect(result.itinerary.days[0].activities.map(({ xid }) => xid)).toEqual(["Q-B002", "Q-B001"]);
    expect(result.itinerary.days[0].activities[0].plannedStartTime).toBe("09:00");
  });

  it("replaces a closed POI with a valid unused candidate when its verified interval cannot fit the visit", () => {
    const input = itinerary();
    input.days[0].activities = [{
      ...activity("Q-B003"),
      plannedStartTime: "10:00",
      scheduledStartTime: "10:00",
      scheduledEndTime: "12:00",
      plannedDurationMinutes: 120
    }];

    const result = deterministicRepair(input, [
      issue("POI_CLOSED_AT_SCHEDULED_TIME", ["days", 0, "activities", 0, "scheduledStartTime"])
    ], { candidatePool });

    expect(result.itinerary.days[0].activities[0]).toMatchObject({
      xid: "Q-B004",
      activityType: "CULTURE",
      plannedStartTime: "09:00"
    });
    expect(result.itinerary.days[0].activities[0].reason).toContain("Singapore Botanic Gardens Visitor Centre");
  });

  it("replaces an unverified scheduled POI with an unused verified-open candidate", () => {
    const input = itinerary();
    input.days[0].activities = [{
      ...activity("Q-B999"),
      plannedStartTime: "10:00",
      scheduledStartTime: "10:00",
      scheduledEndTime: "11:30",
      plannedDurationMinutes: 90
    }];
    const pool = {
      ...candidatePool,
      candidateIds: [...candidatePool.candidateIds, "Q-B999"],
      candidates: [
        ...candidatePool.candidates,
        {
          xid: "Q-B999",
          candidateId: "Q-B999",
          name: "Unverified Gallery",
          displayName: { en: "Unverified Gallery", zh: "Unverified Gallery" },
          category: "CULTURE",
          coordinates: { latitude: 1.286, longitude: 103.85 }
        }
      ]
    };

    const result = deterministicRepair(input, [
      issue("POI_OPENING_HOURS_UNVERIFIED", ["days", 0, "activities", 0, "xid"], { xid: "Q-B999" })
    ], { candidatePool: pool });

    expect(result.changed).toBe(true);
    expect(result.itinerary.days[0].activities[0]).toMatchObject({
      xid: "Q-B004",
      activityType: "CULTURE",
      plannedStartTime: "09:00"
    });
    expect(result.itinerary.days[0].activities[0].reason).toContain("verified-open replacement");
    expect(result.itinerary.days[0].activities[0].scheduledStartTime).toBeUndefined();
  });

  it("leaves an unverified POI unchanged when no verified feasible replacement exists", () => {
    const input = itinerary();
    input.days[0].activities = [{
      ...activity("Q-B999"),
      plannedStartTime: "10:00",
      scheduledStartTime: "10:00",
      scheduledEndTime: "11:30",
      plannedDurationMinutes: 90
    }];
    const pool = {
      ...candidatePool,
      candidateIds: ["Q-B999"],
      candidates: [{
        xid: "Q-B999",
        candidateId: "Q-B999",
        name: "Unverified Gallery",
        category: "CULTURE",
        coordinates: { latitude: 1.286, longitude: 103.85 }
      }],
      operatingHours: { weeklyHours: [], exceptions: [] }
    };

    const result = deterministicRepair(input, [
      issue("POI_OPENING_HOURS_UNVERIFIED", ["days", 0, "activities", 0, "xid"], { xid: "Q-B999" })
    ], { candidatePool: pool });

    expect(result.changed).toBe(false);
    expect(result.itinerary.days[0].activities[0].xid).toBe("Q-B999");
  });

  it("backfills a sparse full day with real unused grounded candidates", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), activityType: "CULTURE" },
        {
          sequence: 2,
          activityType: "MEAL",
          sourceType: "AI_GENERATED",
          plannedStartTime: "12:00",
          plannedDurationMinutes: 60,
          reason: "Lunch break."
        }
      ]
    }];

    const result = deterministicRepair(input, [{
      code: "DAILY_DENSITY_TOO_LOW",
      path: ["days", 0, "activities"],
      severity: "ERROR",
      metadata: {
        requiredAttractionEntries: 3,
        attractionEntries: 1,
        availableMinutes: 720
      }
    }], { candidatePool });

    const grounded = result.itinerary.days[0].activities.filter(({ xid }) => xid);
    expect(grounded.map(({ xid }) => xid)).toEqual(["Q-B002", "Q-B004", "Q-B001"]);
    expect(grounded.every(({ xid, activityType }) =>
      candidatePool.candidates.some((candidate) =>
        candidate.xid === xid && candidate.category === activityType))).toBe(true);
  });

  it("backfills toward the requested six sightseeing activities without counting meals", () => {
    const pool = sixCandidatePool();
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      title: "Grounded POI 1 day",
      activities: [
        { ...activity("Q-B001", 1), activityType: "CULTURE", plannedDurationMinutes: 45 },
        {
          sequence: 2,
          activityType: "MEAL",
          sourceType: "AI_GENERATED",
          plannedStartTime: "12:00",
          plannedDurationMinutes: 60,
          reason: "Lunch break."
        }
      ]
    }];

    const result = deterministicRepair(input, [{
      code: "DAILY_DENSITY_TOO_LOW",
      path: ["days", 0, "activities"],
      severity: "ERROR",
      metadata: {
        requiredAttractionEntries: 6,
        requestedDailyAttractionTarget: 6,
        attractionEntries: 1,
        availableMinutes: 720
      }
    }], { candidatePool: pool });

    const day = result.itinerary.days[0];
    const grounded = day.activities.filter(({ xid }) => xid);
    const meals = day.activities.filter(({ activityType }) => activityType === "MEAL");
    expect(grounded).toHaveLength(6);
    expect(new Set(grounded.map(({ xid }) => xid)).size).toBe(6);
    expect(meals.length).toBeGreaterThanOrEqual(1);
    expect(grounded.map(({ plannedDurationMinutes }) => plannedDurationMinutes))
      .toEqual(expect.arrayContaining([45, 75, 120, 90, 60, 105]));
  });

  it("adds lunch to a full sightseeing day crossing midday and keeps it in the midday window", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), plannedStartTime: "09:00", plannedDurationMinutes: 90 },
        { ...activity("Q-B002", 2), plannedStartTime: "11:00", plannedDurationMinutes: 90 },
        { ...activity("Q-B004", 3), activityType: "CULTURE", plannedStartTime: "14:00", plannedDurationMinutes: 90 }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("MEAL_CADENCE_MISSING", ["days", 0, "activities"], { meal: "LUNCH" })
    ], { candidatePool });

    const lunch = result.itinerary.days[0].activities.find(({ activityType, plannedStartTime }) =>
      activityType === "MEAL" && plannedStartTime >= "11:30" && plannedStartTime <= "14:00");
    expect(lunch).toMatchObject({
      activityType: "MEAL",
      plannedDurationMinutes: expect.any(Number)
    });
  });

  it("adds lunch at the latest valid lunch start before an afternoon attraction", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { sequence: 1, activityType: "MEAL", plannedStartTime: "09:00", plannedDurationMinutes: 60 },
        { ...activity("Q-B001", 2), activityType: "FAMILY", plannedStartTime: "10:30", plannedDurationMinutes: 180 },
        { ...activity("Q-B002", 3), activityType: "FAMILY", plannedStartTime: "14:30", plannedDurationMinutes: 150 }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("MEAL_CADENCE_MISSING", ["days", 0, "activities"], { meal: "LUNCH" })
    ], { candidatePool });

    const lunch = result.itinerary.days[0].activities.find(({ activityType, plannedStartTime }) =>
      activityType === "MEAL" && plannedStartTime === "13:30");
    expect(lunch).toMatchObject({
      activityType: "MEAL",
      plannedDurationMinutes: expect.any(Number)
    });
  });

  it("shrinks an overlong grounded visit to the canonical duration so lunch can be repaired", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), activityType: "FAMILY", plannedStartTime: "10:30", plannedDurationMinutes: 240 },
        { ...activity("Q-B002", 2), activityType: "FAMILY", plannedStartTime: "19:00", plannedDurationMinutes: 180 }
      ]
    }];
    const pool = {
      ...candidatePool,
      candidates: candidatePool.candidates.map((candidate) =>
        candidate.xid === "Q-B001"
          ? { ...candidate, suggestedVisitDurationMinutes: 180 }
          : candidate)
    };

    const result = deterministicRepair(input, [
      issue("MEAL_CADENCE_MISSING", ["days", 0, "activities"], { meal: "LUNCH" })
    ], { candidatePool: pool });

    const firstAttraction = result.itinerary.days[0].activities.find(({ xid }) => xid === "Q-B001");
    const lunch = result.itinerary.days[0].activities.find(({ activityType, plannedStartTime }) =>
      activityType === "MEAL" && plannedStartTime === "13:30");
    expect(firstAttraction.plannedDurationMinutes).toBe(180);
    expect(lunch).toMatchObject({ activityType: "MEAL" });
  });

  it("adds dinner when a sightseeing day continues into the evening", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), plannedStartTime: "10:00", plannedDurationMinutes: 90 },
        { ...activity("Q-B004", 2), activityType: "CULTURE", plannedStartTime: "18:00", plannedDurationMinutes: 90 }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("MEAL_CADENCE_MISSING", ["days", 0, "activities"], { meal: "DINNER" })
    ], { candidatePool });

    const dinner = result.itinerary.days[0].activities.find(({ activityType, plannedStartTime }) =>
      activityType === "MEAL" && plannedStartTime >= "17:30" && plannedStartTime <= "20:00");
    expect(dinner).toBeTruthy();
  });

  it("adds dinner before an evening attraction so the attraction can be shifted later", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), activityType: "NATURE", plannedStartTime: "10:30", plannedDurationMinutes: 90 },
        { ...activity("Q-B002", 2), activityType: "FAMILY", plannedStartTime: "18:00", plannedDurationMinutes: 180 }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("MEAL_CADENCE_MISSING", ["days", 0, "activities"], { meal: "DINNER" })
    ], { candidatePool });

    const dinner = result.itinerary.days[0].activities.find(({ activityType, plannedStartTime }) =>
      activityType === "MEAL" && plannedStartTime === "17:30");
    expect(dinner).toMatchObject({ activityType: "MEAL" });
    expect(result.itinerary.days[0].activities.find(({ xid }) => xid === "Q-B002").plannedStartTime)
      .toBe("18:00");
  });

  it("keeps feasible dinner and does not force a lunch when travel-time repair blocks the lunch window", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), activityType: "CULTURE", plannedStartTime: "09:00", plannedDurationMinutes: 90 },
        { ...activity("Q-B002", 2), plannedStartTime: "11:00", plannedDurationMinutes: 90 },
        { ...activity("Q-B003", 3), activityType: "NATURE", plannedStartTime: "13:00", plannedDurationMinutes: 90 },
        { ...activity("Q-B004", 4), activityType: "CULTURE", plannedStartTime: "15:00", plannedDurationMinutes: 90 }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("TRAVEL_TIME_CONFLICT", ["days", 0, "activities", 1, "plannedStartTime"]),
      issue("MEAL_CADENCE_MISSING", ["days", 0, "activities"], { meal: "LUNCH" }),
      issue("MEAL_CADENCE_MISSING", ["days", 0, "activities"], { meal: "DINNER" })
    ], { candidatePool });

    const meals = result.itinerary.days[0].activities
      .filter(({ activityType }) => activityType === "MEAL")
      .map(({ plannedStartTime }) => plannedStartTime);
    expect(meals.some((time) => time >= "11:30" && time <= "14:00")).toBe(false);
    expect(meals.some((time) => time >= "17:30" && time <= "20:00")).toBe(true);
  });

  it("keeps a repaired lunch inside the lunch window when rebuilding a shifted day", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), activityType: "CULTURE", plannedStartTime: "10:00", scheduledStartTime: "10:00", scheduledEndTime: "11:00", plannedDurationMinutes: 60 },
        {
          sequence: 2,
          activityType: "MEAL",
          sourceType: "AI_GENERATED",
          plannedStartTime: "12:30",
          scheduledStartTime: "14:43",
          scheduledEndTime: "15:43",
          plannedDurationMinutes: 60,
          reason: "Lunch break."
        },
        { ...activity("Q-B004", 3), activityType: "CULTURE", plannedStartTime: "16:06", scheduledStartTime: "16:06", scheduledEndTime: "18:06", plannedDurationMinutes: 120 }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("TRAVEL_TIME_CONFLICT", ["days", 0, "activities", 1, "plannedStartTime"], { shiftMinutes: 133 })
    ], { candidatePool });

    const lunch = result.itinerary.days[0].activities.find(({ activityType }) => activityType === "MEAL");
    expect(lunch.plannedStartTime >= "11:30").toBe(true);
    expect(lunch.plannedStartTime <= "14:00").toBe(true);
  });

  it("does not silently rebuild lunch to 14:43 outside the validator window", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), activityType: "CULTURE", plannedStartTime: "10:00", scheduledStartTime: "10:00", scheduledEndTime: "11:00", plannedDurationMinutes: 60 },
        {
          sequence: 2,
          activityType: "MEAL",
          sourceType: "AI_GENERATED",
          plannedStartTime: "12:30",
          scheduledStartTime: "14:43",
          scheduledEndTime: "15:43",
          plannedDurationMinutes: 60,
          reason: "Lunch break."
        },
        { ...activity("Q-B004", 3), activityType: "CULTURE", plannedStartTime: "16:06", scheduledStartTime: "16:06", scheduledEndTime: "18:06", plannedDurationMinutes: 120 }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("TRAVEL_TIME_CONFLICT", ["days", 0, "activities", 1, "plannedStartTime"], { shiftMinutes: 133 })
    ], { candidatePool });

    expect(result.itinerary.days[0].activities.find(({ activityType }) => activityType === "MEAL").plannedStartTime)
      .not.toBe("14:43");
  });

  it("keeps a repaired dinner inside the dinner window when rebuilding a shifted day", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), activityType: "CULTURE", plannedStartTime: "15:00", scheduledStartTime: "15:00", scheduledEndTime: "16:00", plannedDurationMinutes: 60 },
        {
          sequence: 2,
          activityType: "MEAL",
          sourceType: "AI_GENERATED",
          plannedStartTime: "17:30",
          scheduledStartTime: "20:08",
          scheduledEndTime: "21:08",
          plannedDurationMinutes: 60,
          reason: "Dinner break."
        }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("TRAVEL_TIME_CONFLICT", ["days", 0, "activities", 1, "plannedStartTime"], { shiftMinutes: 158 })
    ], { candidatePool });

    const dinner = result.itinerary.days[0].activities.find(({ activityType }) => activityType === "MEAL");
    expect(dinner.plannedStartTime >= "17:30").toBe(true);
    expect(dinner.plannedStartTime <= "20:00").toBe(true);
  });

  it("does not insert lunch into a long grounded activity that blocks the whole lunch window", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), activityType: "CULTURE", plannedStartTime: "10:00", plannedDurationMinutes: 60 },
        { ...activity("Q-B004", 2), activityType: "CULTURE", plannedStartTime: "11:43", plannedDurationMinutes: 180 },
        { ...activity("Q-B002", 3), activityType: "HISTORY", plannedStartTime: "16:06", plannedDurationMinutes: 120 }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("MEAL_CADENCE_MISSING", ["days", 0, "activities"], { meal: "LUNCH" })
    ], { candidatePool });

    expect(result.changed).toBe(false);
    expect(result.itinerary.days[0].activities.some(({ activityType }) => activityType === "MEAL")).toBe(false);
  });

  it("repair loop keeps controlled failure when no feasible lunch slot exists", async () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), activityType: "CULTURE", plannedStartTime: "10:00", plannedDurationMinutes: 60 },
        { ...activity("Q-B004", 2), activityType: "CULTURE", plannedStartTime: "11:43", plannedDurationMinutes: 180 },
        { ...activity("Q-B002", 3), activityType: "HISTORY", plannedStartTime: "16:06", plannedDurationMinutes: 120 }
      ]
    }];
    const evaluate = vi.fn(async (current) => ({
      itinerary: current,
      validation: { valid: false, issues: [issue("MEAL_CADENCE_MISSING", ["days", 0, "activities"], { meal: "LUNCH" })] }
    }));

    const result = await repairUntilValid({ itinerary: input, candidatePool, evaluate });

    expect(result.state).toBe("FAILED");
    expect(result.repairs.at(-1).action).toBe("NO_REPAIR_AVAILABLE");
    expect(result.itinerary.days[0].activities.some(({ activityType }) => activityType === "MEAL")).toBe(false);
  });

  it("does not ask semantic repair to fabricate an infeasible lunch slot", async () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), activityType: "CULTURE", plannedStartTime: "10:00", plannedDurationMinutes: 60 },
        { ...activity("Q-B004", 2), activityType: "CULTURE", plannedStartTime: "11:43", plannedDurationMinutes: 180 },
        { ...activity("Q-B002", 3), activityType: "HISTORY", plannedStartTime: "16:06", plannedDurationMinutes: 120 }
      ]
    }];
    const semanticRepair = vi.fn(async () => input);

    const result = await repairUntilValid({
      itinerary: input,
      candidatePool,
      evaluate: async (current) => ({
        itinerary: current,
        validation: { valid: false, issues: [issue("MEAL_CADENCE_MISSING", ["days", 0, "activities"], { meal: "LUNCH" })] }
      }),
      semanticRepair
    });

    expect(result.state).toBe("FAILED");
    expect(semanticRepair).not.toHaveBeenCalled();
    expect(result.repairs.at(-1).action).toBe("NO_REPAIR_AVAILABLE");
  });

  it("does not move or duplicate an already valid lunch during schedule repair", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), activityType: "CULTURE", plannedStartTime: "09:30", scheduledStartTime: "09:45", scheduledEndTime: "11:15", plannedDurationMinutes: 90 },
        {
          sequence: 2,
          activityType: "MEAL",
          sourceType: "AI_GENERATED",
          plannedStartTime: "12:00",
          scheduledStartTime: "12:00",
          scheduledEndTime: "13:00",
          plannedDurationMinutes: 60,
          reason: "Lunch break."
        },
        { ...activity("Q-B004", 3), activityType: "CULTURE", plannedStartTime: "14:00", scheduledStartTime: "14:00", scheduledEndTime: "15:30", plannedDurationMinutes: 90 }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("TRAVEL_TIME_CONFLICT", ["days", 0, "activities", 0, "plannedStartTime"], { shiftMinutes: 15 })
    ], { candidatePool });

    const lunches = result.itinerary.days[0].activities.filter(({ activityType }) => activityType === "MEAL");
    expect(lunches).toHaveLength(1);
    expect(lunches[0].plannedStartTime).toBe("12:00");
  });

  it("does not force meals into a short arrival or departure day", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), plannedStartTime: "15:00", plannedDurationMinutes: 90 }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("MEAL_CADENCE_MISSING", ["days", 0, "activities"], {
        availableMinutes: 240
      })
    ], { candidatePool });

    expect(result.itinerary.days[0].activities.some(({ activityType }) => activityType === "MEAL"))
      .toBe(false);
  });

  it("synchronizes a stale day title after final activities change", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      title: "Visit Removed Museum",
      activities: [
        { ...activity("Q-B001", 1), activityType: "CULTURE" },
        { ...activity("Q-B002", 2), activityType: "HISTORY" }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("DAILY_DENSITY_TOO_LOW", ["days", 0, "activities"])
    ], { candidatePool });

    expect(result.itinerary.days[0].title).not.toContain("Removed Museum");
    expect(result.itinerary.days[0].title).toMatch(/National Gallery Singapore|Asian Civilisations Museum/);
  });

  it("creates missing requested days before backfilling grounded POIs", () => {
    const input = itinerary();
    input.trip.endDate = "2026-10-12";
    input.days = [input.days[0]];

    const result = deterministicRepair(input, [
      issue("SCHEDULE_DATE_MISSING", ["days"]),
      {
        code: "DAILY_DENSITY_TOO_LOW",
        path: ["days", 1, "activities"],
        severity: "ERROR",
        metadata: { requiredAttractionEntries: 2, attractionEntries: 0 }
      }
    ], {
      candidatePool,
      preferences: { startDate: "2026-10-10", endDate: "2026-10-12" }
    });

    expect(result.itinerary.days.map(({ date }) => date))
      .toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
    expect(result.itinerary.days[1].activities.some(({ xid }) => xid)).toBe(true);
    expect(result.itinerary.days[2].activities.some(({ xid }) => xid)).toBe(true);
  });

  it("removes generic filler before deleting grounded POIs when a dense day exceeds duration", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), activityType: "CULTURE" },
        {
          sequence: 2,
          activityType: "REST",
          sourceType: "AI_GENERATED",
          plannedStartTime: "11:00",
          plannedDurationMinutes: 120,
          reason: "Generic rest filler."
        },
        { ...activity("Q-B002", 3), plannedStartTime: "13:30" },
        {
          sequence: 4,
          activityType: "MEAL",
          sourceType: "AI_GENERATED",
          plannedStartTime: "15:30",
          plannedDurationMinutes: 90,
          reason: "Extra meal filler."
        },
        {
          sequence: 5,
          activityType: "MEAL",
          sourceType: "AI_GENERATED",
          plannedStartTime: "17:30",
          plannedDurationMinutes: 90,
          reason: "Dinner."
        },
        { ...activity("Q-B004", 6), activityType: "CULTURE", plannedStartTime: "19:30" }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("DAILY_DURATION_EXCEEDED", ["days", 0, "activities"])
    ], { candidatePool });

    expect(result.itinerary.days[0].activities.map(({ xid, activityType }) => xid ?? activityType))
      .toEqual(["Q-B002", "Q-B004", "Q-B001", "MEAL"]);
  });

  it("compacts dense repaired days into daytime order instead of preserving late shifted times", () => {
    const input = itinerary();
    input.days = [{
      ...input.days[0],
      activities: [
        { ...activity("Q-B001", 1), activityType: "CULTURE", plannedStartTime: "19:30" },
        { ...activity("Q-B002", 2), plannedStartTime: "21:30" },
        { ...activity("Q-B004", 3), activityType: "CULTURE", plannedStartTime: "23:30" }
      ]
    }];

    const result = deterministicRepair(input, [
      issue("TRAVEL_TIME_CONFLICT", ["days", 0, "activities", 0, "plannedStartTime"])
    ], { candidatePool });

    expect(result.itinerary.days[0].activities.map(({ xid }) => xid))
      .toEqual(["Q-B002", "Q-B004", "Q-B001"]);
    expect(result.itinerary.days[0].activities.map(({ plannedStartTime }) => plannedStartTime))
      .toEqual(["09:00", "11:15", "13:30"]);
  });
});

describe("bounded repair loop", () => {
  it("finalizes only after deterministic repair is re-derived and valid", async () => {
    const input = itinerary();
    input.days[1].activities = [
      activity("Q-B001", 1),
      activity("Q-B002", 2)
    ];
    const evaluate = vi.fn(async (current) => {
      const duplicate = current.days.flatMap(({ activities }) => activities)
        .filter(({ xid }) => xid === "Q-B001").length > 1;
      return {
        itinerary: current,
        validation: duplicate
          ? { valid: false, issues: [issue("DUPLICATE_ATTRACTION_XID", ["days", 1, "activities", 0, "xid"])] }
          : { valid: true, issues: [] }
      };
    });

    const result = await repairUntilValid({ itinerary: input, candidatePool, evaluate });

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(result.attempts).toBe(2);
    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(result.repairs).toEqual([{
      attempt: 1,
      issueCodes: ["DUPLICATE_ATTRACTION_XID"],
      action: "DETERMINISTIC_REPAIR",
      finalState: "FINAL_VALIDATED"
    }]);
  });

  it("uses constrained semantic repair only after deterministic repair cannot act", async () => {
    const replacement = itinerary();
    const semanticRepair = vi.fn().mockResolvedValue(replacement);
    let calls = 0;
    const result = await repairUntilValid({
      itinerary: itinerary(),
      candidatePool,
      evaluate: async (current) => {
        calls += 1;
        return calls === 1
          ? { itinerary: current, validation: { valid: false, issues: [issue("ROUTE_UNAVAILABLE", ["days", 0, "legs"])] } }
          : { itinerary: current, validation: { valid: true, issues: [] } };
      },
      semanticRepair
    });

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(semanticRepair).toHaveBeenCalledWith(expect.objectContaining({
      issues: [expect.objectContaining({ code: "ROUTE_UNAVAILABLE" })],
      allowedCandidateIds: candidatePool.candidateIds
    }));
    expect(result.repairs).toEqual([{
      attempt: 1,
      issueCodes: ["ROUTE_UNAVAILABLE"],
      action: "AI_REPAIR",
      finalState: "FINAL_VALIDATED"
    }]);
  });

  it("reruns complete validation after replacing an unverified POI", async () => {
    const input = itinerary();
    input.days[0].activities = [{
      ...activity("Q-B999"),
      plannedStartTime: "10:00",
      scheduledStartTime: "10:00",
      scheduledEndTime: "11:30",
      plannedDurationMinutes: 90
    }];
    const pool = {
      ...candidatePool,
      candidateIds: [...candidatePool.candidateIds, "Q-B999"],
      candidates: [
        ...candidatePool.candidates,
        { xid: "Q-B999", candidateId: "Q-B999", name: "Unverified Gallery", category: "CULTURE", coordinates: { latitude: 1.286, longitude: 103.85 } }
      ]
    };
    const evaluate = vi.fn(async (current) => {
      const xid = current.days[0].activities[0].xid;
      return {
        itinerary: current,
        validation: xid === "Q-B999"
          ? { valid: false, issues: [issue("POI_OPENING_HOURS_UNVERIFIED", ["days", 0, "activities", 0, "xid"], { xid })] }
          : { valid: true, issues: [] }
      };
    });

    const result = await repairUntilValid({ itinerary: input, candidatePool: pool, evaluate });

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(result.itinerary.days[0].activities[0].xid).toBe("Q-B004");
  });

  it("allows chained deterministic repairs when continuity changes create new travel-time conflicts", async () => {
    const input = itinerary();
    const evaluate = vi.fn(async (current) => {
      if (evaluate.mock.calls.length === 1) {
        return {
          itinerary: current,
          validation: {
            valid: false,
            issues: [issue("LOCATION_CONTINUITY_ERROR", ["days", 1, "startPoint", "locationId"])]
          }
        };
      }
      if (evaluate.mock.calls.length === 2) {
        return {
          itinerary: {
            ...current,
            days: current.days.map((day, index) => index === 1
              ? {
                  ...day,
                  activities: day.activities.map((entry) => ({
                    ...entry,
                    scheduledStartTime: "10:15",
                    scheduledEndTime: "11:45",
                    scheduleShiftMinutes: 75
                  }))
                }
              : day)
          },
          validation: {
            valid: false,
            issues: [issue("TRAVEL_TIME_CONFLICT", ["days", 1, "activities", 0, "plannedStartTime"])]
          }
        };
      }
      return {
        itinerary: current,
        validation: { valid: true, issues: [] }
      };
    });

    const result = await repairUntilValid({ itinerary: input, candidatePool, evaluate });

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(result.attempts).toBe(3);
    expect(evaluate).toHaveBeenCalledTimes(3);
    expect(result.repairs).toEqual([
      {
        attempt: 1,
        issueCodes: ["LOCATION_CONTINUITY_ERROR"],
        action: "DETERMINISTIC_REPAIR",
        finalState: "FINAL_VALIDATED"
      },
      {
        attempt: 2,
        issueCodes: ["TRAVEL_TIME_CONFLICT"],
        action: "DETERMINISTIC_REPAIR",
        finalState: "FINAL_VALIDATED"
      }
    ]);
  });

  it("allows one semantic repair followed by chained deterministic repairs", async () => {
    const semanticRepair = vi.fn(async ({ itinerary: current }) => current);
    const evaluate = vi.fn(async (current) => {
      if (evaluate.mock.calls.length === 1) {
        return {
          itinerary: current,
          validation: {
            valid: false,
            issues: [issue("ROUTE_UNAVAILABLE", ["days", 0, "legs"])]
          }
        };
      }
      if (evaluate.mock.calls.length === 2) {
        return {
          itinerary: current,
          validation: {
            valid: false,
            issues: [issue("LOCATION_CONTINUITY_ERROR", ["days", 1, "startPoint", "locationId"])]
          }
        };
      }
      if (evaluate.mock.calls.length === 3) {
        return {
          itinerary: {
            ...current,
            days: current.days.map((day, index) => index === 1
              ? {
                  ...day,
                  activities: day.activities.map((entry) => ({
                    ...entry,
                    scheduledStartTime: "10:15",
                    scheduledEndTime: "11:45",
                    scheduleShiftMinutes: 75
                  }))
                }
              : day)
          },
          validation: {
            valid: false,
            issues: [issue("TRAVEL_TIME_CONFLICT", ["days", 1, "activities", 0, "plannedStartTime"])]
          }
        };
      }
      return {
        itinerary: current,
        validation: { valid: true, issues: [] }
      };
    });

    const input = itinerary();
    input.days[0].activities[0].scheduledStartTime = "10:00";
    input.days[0].activities[0].scheduledEndTime = "11:30";
    input.days[0].activities[0].scheduleShiftMinutes = 60;

    const result = await repairUntilValid({
      itinerary: input,
      candidatePool,
      evaluate,
      semanticRepair
    });

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(result.attempts).toBe(4);
    expect(semanticRepair).toHaveBeenCalledTimes(1);
    expect(result.repairs).toEqual([
      {
        attempt: 1,
        issueCodes: ["ROUTE_UNAVAILABLE"],
        action: "AI_REPAIR",
        finalState: "FINAL_VALIDATED"
      },
      {
        attempt: 2,
        issueCodes: ["LOCATION_CONTINUITY_ERROR"],
        action: "DETERMINISTIC_REPAIR",
        finalState: "FINAL_VALIDATED"
      },
      {
        attempt: 3,
        issueCodes: ["TRAVEL_TIME_CONFLICT"],
        action: "DETERMINISTIC_REPAIR",
        finalState: "FINAL_VALIDATED"
      }
    ]);
  });

  it("keeps enough attempts for deterministic cleanup after a late semantic repair", async () => {
    const semanticRepair = vi.fn(async ({ itinerary: current }) => current);
    const evaluate = vi.fn(async (current) => {
      if (evaluate.mock.calls.length === 1) {
        return {
          itinerary: current,
          validation: {
            valid: false,
            issues: [issue("LOCATION_CONTINUITY_ERROR", ["days", 1, "startPoint", "locationId"])]
          }
        };
      }
      if (evaluate.mock.calls.length === 2) {
        return {
          itinerary: {
            ...current,
            days: current.days.map((day) => ({
              ...day,
              activities: day.activities.map((entry) => ({
                ...entry,
                scheduledStartTime: "10:00",
                scheduledEndTime: "11:30",
                scheduleShiftMinutes: 60
              }))
            }))
          },
          validation: {
            valid: false,
            issues: [issue("TRAVEL_TIME_CONFLICT", ["days", 0, "activities", 0, "plannedStartTime"])]
          }
        };
      }
      if (evaluate.mock.calls.length === 3) {
        return {
          itinerary: current,
          validation: {
            valid: false,
            issues: [issue("SCHEDULE_DATE_MISSING", ["days"])]
          }
        };
      }
      if (evaluate.mock.calls.length === 4) {
        return {
          itinerary: current,
          validation: {
            valid: false,
            issues: [issue("LOCATION_CONTINUITY_ERROR", ["days", 1, "startPoint", "locationId"])]
          }
        };
      }
      return { itinerary: current, validation: { valid: true, issues: [] } };
    });

    const result = await repairUntilValid({
      itinerary: itinerary(),
      candidatePool,
      evaluate,
      semanticRepair
    });

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(evaluate).toHaveBeenCalledTimes(5);
    expect(result.repairs.map(({ action }) => action)).toEqual([
      "DETERMINISTIC_REPAIR",
      "DETERMINISTIC_REPAIR",
      "AI_REPAIR",
      "DETERMINISTIC_REPAIR"
    ]);
  });

  it("reports no available repair when a travel-time failure has no deterministic change left", async () => {
    const addMinutes = (time, minutes) => {
      const [hours, mins] = time.split(":").map(Number);
      const total = hours * 60 + mins + minutes;
      return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    };
    const evaluate = vi.fn(async (current) => {
      if (evaluate.mock.calls.length < 9) {
        return {
          itinerary: {
            ...current,
            days: current.days.map((day) => ({
              ...day,
              activities: day.activities.map((entry) => ({
                ...entry,
                scheduledStartTime: addMinutes(entry.plannedStartTime, 10),
                scheduledEndTime: addMinutes(entry.plannedStartTime, 100),
                scheduleShiftMinutes: 10
              }))
            }))
          },
          validation: {
            valid: false,
            issues: [issue("TRAVEL_TIME_CONFLICT", ["days", 0, "activities", 0, "plannedStartTime"])]
          }
        };
      }
      return { itinerary: current, validation: { valid: true, issues: [] } };
    });

    const result = await repairUntilValid({ itinerary: itinerary(), candidatePool, evaluate });

    expect(result.state).toBe("FAILED");
    expect(result.repairs.at(-1)).toMatchObject({
      action: "NO_REPAIR_AVAILABLE",
      issueCodes: ["TRAVEL_TIME_CONFLICT"]
    });
    expect(evaluate).toHaveBeenCalledTimes(2);
  });

  it("stops with a convergence diagnostic when the same schedule and validation errors repeat", async () => {
    const evaluate = vi.fn(async (current) => ({
      itinerary: current,
      validation: {
        valid: false,
        issues: [issue("LOCATION_CONTINUITY_ERROR", ["days", 1, "startPoint", "locationId"])]
      }
    }));

    const result = await repairUntilValid({ itinerary: itinerary(), candidatePool, evaluate });

    expect(result.state).toBe("FAILED");
    expect(result.repairs.at(-1)).toMatchObject({
      action: "REPAIR_CYCLE_DETECTED",
      issueCodes: ["LOCATION_CONTINUITY_ERROR"]
    });
    expect(evaluate).toHaveBeenCalledTimes(2);
  });

  it("fails after one repair and one revalidation when the blocking issue remains", async () => {
    const evaluate = vi.fn(async (current) => ({
      itinerary: current,
      validation: { valid: false, issues: [issue("ROUTE_UNAVAILABLE")] }
    }));
    const semanticRepair = vi.fn(async ({ itinerary: current }) => current);

    const result = await repairUntilValid({
      itinerary: itinerary(), candidatePool, evaluate, semanticRepair
    }, { maxAttempts: 3 });

    expect(result.state).toBe("FAILED");
    expect(result.attempts).toBe(2);
    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(result.validation.valid).toBe(false);
    expect(result.repairs).toEqual([
      { attempt: 1, issueCodes: ["ROUTE_UNAVAILABLE"], action: "AI_REPAIR", finalState: "FAILED" },
      { attempt: 2, issueCodes: ["ROUTE_UNAVAILABLE"], action: "NO_REPAIR_AVAILABLE", finalState: "FAILED" }
    ]);
  });

  it("returns an already-valid itinerary without invoking repair", async () => {
    const semanticRepair = vi.fn();
    const result = await repairUntilValid({
      itinerary: itinerary(),
      candidatePool,
      evaluate: async (current) => ({ itinerary: current, validation: { valid: true, issues: [] } }),
      semanticRepair
    });
    expect(result).toMatchObject({ state: "FINAL_VALIDATED", attempts: 1, repairs: [] });
    expect(semanticRepair).not.toHaveBeenCalled();
  });
});

describe("targeted LLM repair", () => {
  it("sends issue codes, paths, safe metadata, and allowed candidate context", async () => {
    const validDraft = itinerary();
    delete validDraft.budgetSummary;
    validDraft.days.forEach((day) => { delete day.legs; });
    const provider = { generateStructured: vi.fn().mockResolvedValue(JSON.stringify(validDraft)) };
    await targetedLlmRepair({
      itinerary: itinerary(),
      issues: [{
        ...issue("SCHEDULE_DATE_MISSING", ["days"]),
        metadata: { date: "2026-10-11", internalTrace: "must-not-leak" }
      }],
      allowedCandidateIds: candidatePool.candidateIds,
      candidates: [
        { xid: "Q-B001", name: "National Gallery Singapore", category: "CULTURE" },
        { candidateId: "Q-B002", name: "Gardens by the Bay", category: "NATURE" }
      ],
      provider
    });
    const request = provider.generateStructured.mock.calls[0][0];
    const data = JSON.parse(request.user).UNTRUSTED_REPAIR_DATA;
    expect(data.issues).toEqual([{
      code: "SCHEDULE_DATE_MISSING",
      path: ["days"],
      metadata: { date: "2026-10-11" }
    }]);
    expect(data.allowedCandidateIds).toEqual(candidatePool.candidateIds);
    expect(data.allowedCandidates).toEqual([
      { candidateId: "Q-B001", xid: "Q-B001", name: "National Gallery Singapore", category: "CULTURE" },
      { candidateId: "Q-B002", xid: "Q-B002", name: "Gardens by the Bay", category: "NATURE" }
    ]);
    expect(request.system).toContain("Every date from trip.startDate through trip.endDate must have exactly one day object");
    expect(request.system).not.toContain("stale-route");
    expect(JSON.stringify(data)).not.toContain("internalTrace");
  });
});
