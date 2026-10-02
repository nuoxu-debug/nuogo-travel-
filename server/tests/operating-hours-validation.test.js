import { describe, expect, it, vi } from "vitest";
import { validateItinerary } from "../src/services/validation/validationEngine.js";
import { repairUntilValid } from "../src/services/repair/repairLoop.js";
import { resolveOperatingHours } from "../src/services/operatingHours/operatingHoursService.js";
import { calculateOpeningHoursVerificationCoverage } from "../src/services/validation/validators/operatingHoursValidator.js";

const preferences = {
  destination: "singapore",
  startDate: "2026-10-10",
  endDate: "2026-10-10",
  arrivalDateTime: "2026-10-10T08:00:00+08:00",
  departureDateTime: "2026-10-10T20:00:00+08:00",
  budgetMinor: 500000
};

const baseCandidatePool = {
  candidateIds: ["poi-gallery"],
  candidates: [{
    xid: "poi-gallery",
    candidateId: "poi-gallery",
    canonicalPoiId: "poi-gallery",
    category: "HISTORY"
  }]
};

function visit({ start = "10:00", end = "11:30", xid = "poi-gallery" } = {}) {
  return {
    travelStyle: "BALANCED",
    trip: {
      destination: "singapore",
      startDate: "2026-10-10",
      endDate: "2026-10-10",
      travellerCount: 2,
      budgetMinor: 500000,
      currency: "SGD"
    },
    days: [{
      dayNumber: 1,
      date: "2026-10-10",
      startPoint: { locationId: "origin", locationType: "ORIGIN" },
      activities: [{
        sequence: 1,
        xid,
        activityType: "HISTORY",
        plannedStartTime: start,
        plannedDurationMinutes: 90,
        scheduledStartTime: start,
        scheduledEndTime: end,
        scheduleShiftMinutes: 0,
        reason: "Source-backed pilot attraction."
      }],
      endPoint: { locationId: "hotel", locationType: "HOTEL" },
      legs: [{ durationMinutes: 15 }, { durationMinutes: 15 }]
    }],
    budgetSummary: { totalMinor: 100000, budgetMinor: 500000, withinBudget: true }
  };
}

function weekly(overrides = {}) {
  return {
    id: "hours-saturday",
    poiId: "poi-gallery",
    dayOfWeek: 6,
    opensAt: "10:00",
    closesAt: "19:00",
    isClosed: false,
    sourceName: "Test source",
    sourceUrl: "https://example.com/source-backed-hours",
    sourceType: "OFFICIAL",
    lastReviewedDate: "2026-09-27",
    verificationStatus: "VERIFIED",
    status: "ACTIVE",
    ...overrides
  };
}

function exception(overrides = {}) {
  return {
    id: "exception-christmas",
    poiId: "poi-gallery",
    exceptionDate: "2026-10-10",
    opensAt: "12:00",
    closesAt: "14:00",
    isClosed: false,
    reason: "Special pilot hours",
    sourceName: "Test source",
    sourceUrl: "https://example.com/source-backed-hours",
    sourceType: "OFFICIAL",
    lastReviewedDate: "2026-09-27",
    verificationStatus: "VERIFIED",
    status: "ACTIVE",
    ...overrides
  };
}

function pool({ weeklyHours = [weekly()], exceptions = [] } = {}) {
  return {
    ...baseCandidatePool,
    operatingHours: { weeklyHours, exceptions }
  };
}

describe("source-backed operating-hours resolution", () => {
  it("verifies a visit fully inside active weekly hours", () => {
    expect(resolveOperatingHours({
      poiId: "poi-gallery",
      date: "2026-10-10",
      scheduledStartTime: "10:30",
      scheduledEndTime: "12:00",
      weeklyHours: [weekly()],
      exceptions: []
    })).toMatchObject({ state: "VERIFIED_OPEN" });
  });

  it("requires verified review state before active records can verify opening hours", () => {
    for (const verificationStatus of ["PENDING_REVIEW", "REJECTED"]) {
      expect(resolveOperatingHours({
        poiId: "poi-gallery",
        date: "2026-10-10",
        scheduledStartTime: "10:30",
        scheduledEndTime: "12:00",
        weeklyHours: [weekly({ verificationStatus })],
        exceptions: []
      })).toMatchObject({ state: "UNVERIFIED" });
    }

    expect(resolveOperatingHours({
      poiId: "poi-gallery",
      date: "2026-10-10",
      scheduledStartTime: "10:30",
      scheduledEndTime: "12:00",
      weeklyHours: [weekly({ status: "OUTDATED", verificationStatus: "VERIFIED" })],
      exceptions: []
    })).toMatchObject({ state: "UNVERIFIED" });
  });

  it("marks visits outside weekly hours as closed", () => {
    expect(resolveOperatingHours({
      poiId: "poi-gallery",
      date: "2026-10-10",
      scheduledStartTime: "09:30",
      scheduledEndTime: "11:00",
      weeklyHours: [weekly()],
      exceptions: []
    })).toMatchObject({ state: "VERIFIED_CLOSED" });

    expect(resolveOperatingHours({
      poiId: "poi-gallery",
      date: "2026-10-10",
      scheduledStartTime: "18:30",
      scheduledEndTime: "19:30",
      weeklyHours: [weekly()],
      exceptions: []
    })).toMatchObject({ state: "VERIFIED_CLOSED" });
  });

  it("treats closed, missing, outdated, and unavailable records as non-open states", () => {
    expect(resolveOperatingHours({
      poiId: "poi-gallery",
      date: "2026-10-10",
      scheduledStartTime: "10:30",
      scheduledEndTime: "12:00",
      weeklyHours: [weekly({ isClosed: true })],
      exceptions: []
    })).toMatchObject({ state: "VERIFIED_CLOSED" });

    for (const status of ["OUTDATED", "UNAVAILABLE"]) {
      expect(resolveOperatingHours({
        poiId: "poi-gallery",
        date: "2026-10-10",
        scheduledStartTime: "10:30",
        scheduledEndTime: "12:00",
        weeklyHours: [weekly({ status })],
        exceptions: []
      })).toMatchObject({ state: "UNVERIFIED" });
    }

    expect(resolveOperatingHours({
      poiId: "poi-gallery",
      date: "2026-10-10",
      scheduledStartTime: "10:30",
      scheduledEndTime: "12:00",
      weeklyHours: [],
      exceptions: []
    })).toMatchObject({ state: "UNVERIFIED" });
  });

  it("lets specific-date exceptions override weekly records", () => {
    expect(resolveOperatingHours({
      poiId: "poi-gallery",
      date: "2026-10-10",
      scheduledStartTime: "10:30",
      scheduledEndTime: "12:00",
      weeklyHours: [weekly()],
      exceptions: [exception({ isClosed: true, opensAt: null, closesAt: null })]
    })).toMatchObject({ state: "VERIFIED_CLOSED", source: "EXCEPTION" });

    expect(resolveOperatingHours({
      poiId: "poi-gallery",
      date: "2026-10-10",
      scheduledStartTime: "12:30",
      scheduledEndTime: "13:30",
      weeklyHours: [weekly({ opensAt: "10:00", closesAt: "11:00" })],
      exceptions: [exception({ opensAt: "12:00", closesAt: "14:00" })]
    })).toMatchObject({ state: "VERIFIED_OPEN", source: "EXCEPTION" });
  });
});

describe("operating-hours itinerary validation", () => {
  it("blocks final validation when a scheduled POI is verified closed", () => {
    const result = validateItinerary({
      preferences,
      itinerary: visit({ start: "09:00", end: "10:30" }),
      candidatePool: pool()
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "POI_CLOSED_AT_SCHEDULED_TIME",
      severity: "ERROR",
      metadata: expect.objectContaining({ operatingHoursState: "VERIFIED_CLOSED" })
    }));
  });

  it("keeps unverifiable hours as a warning without labelling the visit verified open", () => {
    const result = validateItinerary({
      preferences,
      itinerary: visit(),
      candidatePool: pool({ weeklyHours: [] })
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "POI_OPENING_HOURS_UNVERIFIED",
      severity: "WARNING",
      metadata: expect.objectContaining({ operatingHoursState: "UNVERIFIED" })
    }));
    expect(JSON.stringify(result)).not.toContain("VERIFIED_OPEN");
  });

  it("calculates opening-hours verification coverage for scheduled POI visits", () => {
    const itinerary = visit();
    itinerary.days[0].activities.push({
      ...itinerary.days[0].activities[0],
      sequence: 2,
      xid: "poi-uncovered",
      scheduledStartTime: "13:00",
      scheduledEndTime: "14:00"
    }, {
      sequence: 3,
      activityType: "MEAL",
      scheduledStartTime: "15:00",
      scheduledEndTime: "16:00"
    });

    const coverage = calculateOpeningHoursVerificationCoverage(itinerary, {
      ...baseCandidatePool,
      candidateIds: ["poi-gallery", "poi-uncovered"],
      candidates: [
        ...baseCandidatePool.candidates,
        { xid: "poi-uncovered", candidateId: "poi-uncovered", canonicalPoiId: "poi-uncovered", category: "HISTORY" }
      ],
      operatingHours: { weeklyHours: [weekly()], exceptions: [] }
    });

    expect(coverage).toEqual({
      verifiedVisits: 1,
      totalVisitsRequiringVerification: 2,
      percentage: 50
    });
    expect(validateItinerary({
      preferences,
      itinerary,
      candidatePool: {
        ...baseCandidatePool,
        candidateIds: ["poi-gallery", "poi-uncovered"],
        candidates: [
          ...baseCandidatePool.candidates,
          { xid: "poi-uncovered", candidateId: "poi-uncovered", canonicalPoiId: "poi-uncovered", category: "HISTORY" }
        ],
        operatingHours: { weeklyHours: [weekly()], exceptions: [] }
      }
    }).metrics.openingHoursVerificationCoverage).toEqual(coverage);
  });

  it("does not count pending-review operating hours as verified coverage", () => {
    const coverage = calculateOpeningHoursVerificationCoverage(visit(), pool({
      weeklyHours: [weekly({ verificationStatus: "PENDING_REVIEW" })],
      exceptions: []
    }));

    expect(coverage).toEqual({
      verifiedVisits: 0,
      totalVisitsRequiringVerification: 1,
      percentage: 0
    });
  });

  it("passes the closed-at-scheduled-time issue through the existing repair loop and reruns validation", async () => {
    const repairPreferences = { ...preferences, pace: "SLOW" };
    const first = visit({ start: "09:00", end: "10:30" });
    const repaired = visit({ start: "10:30", end: "12:00" });
    const evaluate = vi.fn(async (itinerary) => {
      const rerouted = {
        ...itinerary,
        budgetSummary: itinerary.budgetSummary ?? { totalMinor: 100000, budgetMinor: 500000, withinBudget: true },
        days: itinerary.days.map((day) => ({
          ...day,
          legs: day.legs ?? [{ durationMinutes: 15 }, { durationMinutes: 15 }],
          activities: day.activities.map((activity) => ({
            ...activity,
            scheduledStartTime: activity.scheduledStartTime ?? activity.plannedStartTime,
            scheduledEndTime: activity.scheduledEndTime ?? "11:30",
            scheduleShiftMinutes: activity.scheduleShiftMinutes ?? 0
          }))
        }))
      };
      return {
        itinerary: rerouted,
        summary: rerouted.budgetSummary,
        validation: validateItinerary({ preferences: repairPreferences, itinerary: rerouted, candidatePool: pool() })
      };
    });
    const semanticRepair = vi.fn(async () => repaired);

    const result = await repairUntilValid({
      itinerary: first,
      preferences: repairPreferences,
      candidatePool: pool(),
      evaluate,
      semanticRepair
    });

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(semanticRepair).not.toHaveBeenCalled();
    expect(result.repairs[0]).toMatchObject({
      issueCodes: ["POI_CLOSED_AT_SCHEDULED_TIME"],
      action: "DETERMINISTIC_REPAIR"
    });
  });
});
