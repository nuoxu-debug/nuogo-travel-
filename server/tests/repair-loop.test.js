import { describe, expect, it, vi } from "vitest";
import { deterministicRepair } from "../src/services/repair/deterministicRepair.js";
import { repairUntilValid } from "../src/services/repair/repairLoop.js";
import { targetedLlmRepair } from "../src/services/repair/targetedLlmRepair.js";

function activity(poiId, sequence = 1) {
  return {
    sequence,
    poiId,
    activityType: "HISTORY",
    plannedStartTime: "09:00",
    plannedDurationMinutes: 90,
    reason: "Requested stop."
  };
}

function itinerary() {
  return {
    variant: "BALANCED",
    trip: {
      origin: "Origin",
      destination: "beijing",
      startDate: "2026-10-10",
      endDate: "2026-10-11",
      travellerCount: 2,
      totalBudgetCny: 5000
    },
    days: [
      {
        dayNumber: 1,
        date: "2026-10-10",
        startPoint: { locationId: "origin", locationType: "ORIGIN" },
        activities: [activity("candidate:beijing:B001")],
        endPoint: { locationId: "hotel", locationType: "HOTEL" },
        legs: [{ id: "stale-route" }]
      },
      {
        dayNumber: 2,
        date: "2026-10-11",
        startPoint: { locationId: "hotel", locationType: "HOTEL" },
        activities: [activity("candidate:beijing:B002")],
        endPoint: { locationId: "destination", locationType: "DESTINATION" }
      }
    ],
    budgetSummary: { totalFen: 300000, withinBudget: true }
  };
}

const candidatePool = {
  candidateIds: ["candidate:beijing:B001", "candidate:beijing:B002", "candidate:beijing:B003"],
  candidates: []
};

const issue = (code, path = []) => ({ code, path, severity: "ERROR", metadata: {} });

describe("deterministic itinerary repair", () => {
  it("removes later duplicate and unknown POIs then resequences the day", () => {
    const input = itinerary();
    input.days[1].activities = [
      activity("candidate:beijing:B001", 1),
      activity("candidate:beijing:UNKNOWN", 2),
      activity("candidate:beijing:B002", 3)
    ];
    const result = deterministicRepair(input, [
      issue("DUPLICATE_POI", ["days", 1, "activities", 0, "poiId"]),
      issue("UNKNOWN_POI", ["days", 1, "activities", 1, "poiId"])
    ], { candidatePool });

    expect(result.changed).toBe(true);
    expect(result.itinerary.days[1].activities).toEqual([
      expect.objectContaining({ poiId: "candidate:beijing:B002", sequence: 1 })
    ]);
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
    input.days[0].activities.push({ ...activity("candidate:beijing:B003", 2), activityType: "ENTERTAINMENT" });
    const result = deterministicRepair(input, [issue("BUDGET_EXCEEDED")], { candidatePool });
    expect(result.itinerary.days[0].activities.map(({ poiId }) => poiId))
      .toEqual(["candidate:beijing:B001"]);
  });
});

describe("bounded repair loop", () => {
  it("finalizes only after deterministic repair is re-derived and valid", async () => {
    const input = itinerary();
    input.days[1].activities = [
      activity("candidate:beijing:B001", 1),
      activity("candidate:beijing:B002", 2)
    ];
    const evaluate = vi.fn(async (current) => {
      const duplicate = current.days.flatMap(({ activities }) => activities)
        .filter(({ poiId }) => poiId === "candidate:beijing:B001").length > 1;
      return {
        itinerary: current,
        validation: duplicate
          ? { valid: false, issues: [issue("DUPLICATE_POI", ["days", 1, "activities", 0, "poiId"])] }
          : { valid: true, issues: [] }
      };
    });

    const result = await repairUntilValid({ itinerary: input, candidatePool, evaluate });

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(result.attempts).toBe(2);
    expect(evaluate).toHaveBeenCalledTimes(2);
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
  });

  it("fails after three attempts when the same blocking issue remains", async () => {
    const evaluate = vi.fn(async (current) => ({
      itinerary: current,
      validation: { valid: false, issues: [issue("ROUTE_UNAVAILABLE")] }
    }));
    const semanticRepair = vi.fn(async ({ itinerary: current }) => current);

    const result = await repairUntilValid({
      itinerary: itinerary(), candidatePool, evaluate, semanticRepair
    }, { maxAttempts: 3 });

    expect(result.state).toBe("FAILED");
    expect(result.attempts).toBe(3);
    expect(evaluate).toHaveBeenCalledTimes(3);
    expect(result.validation.valid).toBe(false);
  });

  it("returns an already-valid itinerary without invoking repair", async () => {
    const semanticRepair = vi.fn();
    const result = await repairUntilValid({
      itinerary: itinerary(),
      candidatePool,
      evaluate: async (current) => ({ itinerary: current, validation: { valid: true, issues: [] } }),
      semanticRepair
    });
    expect(result).toMatchObject({ state: "FINAL_VALIDATED", attempts: 1 });
    expect(semanticRepair).not.toHaveBeenCalled();
  });
});

describe("targeted LLM repair", () => {
  it("sends only issue codes, paths, and allowed candidate IDs", async () => {
    const validDraft = itinerary();
    delete validDraft.budgetSummary;
    validDraft.days.forEach((day) => { delete day.legs; });
    const provider = { generateStructured: vi.fn().mockResolvedValue(JSON.stringify(validDraft)) };
    await targetedLlmRepair({
      itinerary: itinerary(),
      issues: [issue("ROUTE_UNAVAILABLE", ["days", 0, "legs"])],
      allowedCandidateIds: candidatePool.candidateIds,
      provider
    });
    const request = provider.generateStructured.mock.calls[0][0];
    const data = JSON.parse(request.user).UNTRUSTED_REPAIR_DATA;
    expect(data.issues).toEqual([{ code: "ROUTE_UNAVAILABLE", path: ["days", 0, "legs"] }]);
    expect(data.allowedCandidateIds).toEqual(candidatePool.candidateIds);
    expect(request.system).not.toContain("stale-route");
  });
});
