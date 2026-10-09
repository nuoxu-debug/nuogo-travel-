import { describe, expect, it } from "vitest";
import { buildProfilePlan } from "../src/services/itinerary/profilePrePlanner.js";

const candidates = [
  { xid: "N-SUMMER", candidateId: "N-SUMMER", category: "HISTORY", interestMatch: true, estimatedCostMinor: 5000, coordinates: { latitude: 39.99, longitude: 116.27 } },
  { xid: "CHEAP-FAR", candidateId: "CHEAP-FAR", category: "CULTURE", estimatedCostMinor: 1000, coordinates: { latitude: 40.2, longitude: 116.6 } },
  { xid: "COMFORT-NEAR", candidateId: "COMFORT-NEAR", category: "NATURE", estimatedCostMinor: 15000, comfortScore: 1, coordinates: { latitude: 39.91, longitude: 116.41 } }
];
const base = { preferences: { destination: "singapore", startDate: "2026-10-10", endDate: "2026-10-11", interests: ["HISTORY"] }, candidatePool: { candidates, candidateIds: candidates.map(({ xid }) => xid) }, resolvedPreferences: { supported: [candidates[0]], unresolved: [] }, budgetContext: { allocatableBudgetMinor: 100000 }, costReferences: [], anchors: { hotel: { latitude: 39.9, longitude: 116.4 } } };

function hoursCandidate(xid) {
  return {
    xid,
    candidateId: xid,
    category: "CULTURE",
    interestMatch: true,
    estimatedCostMinor: 5000,
    coordinates: { latitude: 1.3, longitude: 103.8 }
  };
}

function hoursRecord(poiId, dayOfWeek) {
  return {
    poiId,
    dayOfWeek,
    opensAt: "09:00:00",
    closesAt: "18:00:00",
    isClosed: false,
    status: "ACTIVE",
    verificationStatus: "VERIFIED"
  };
}

describe("profile pre-planner", () => {
  it("keeps selected attractions first and grounded", () => { const plan = buildProfilePlan({ ...base, profile: "BALANCED" }); expect(plan.selectedCandidateIds[0]).toBe("N-SUMMER"); expect(plan.allowedCandidateIds).toContain("N-SUMMER"); expect(plan.structurallyExcludedSelected).toEqual([]); });
  it("preserves structural failures separately", () => { const plan = buildProfilePlan({ ...base, profile: "BALANCED", resolvedPreferences: { supported: [], unresolved: [{ xid: "UNKNOWN", displayName: "Unknown", reason: "UNAVAILABLE_ATTRACTION" }] } }); expect(plan.structurallyExcludedSelected).toEqual([{ xid: "UNKNOWN", displayName: "Unknown", reason: "UNAVAILABLE_ATTRACTION" }]); });
  it("defers approximate feasibility without removing a supported selection", () => { const deferred = { ...candidates[0], estimatedCostMinor: 200000 }; const plan = buildProfilePlan({ ...base, profile: "BUDGET_SAVING", candidatePool: { candidates: [deferred], candidateIds: [deferred.xid] }, resolvedPreferences: { supported: [deferred], unresolved: [] } }); expect(plan.provisionallyDeferredSelected).toHaveLength(1); expect(plan.allowedCandidateIds).toContain(deferred.xid); });
  it("uses the traveller's daily attraction target for day targets and capacity", () => {
    const extraCandidates = Array.from({ length: 24 }, (_, index) => ({
      xid: `EXTRA-${index}`,
      candidateId: `EXTRA-${index}`,
      category: "CULTURE",
      estimatedCostMinor: 1000,
      coordinates: { latitude: 1.3 + index / 1000, longitude: 103.8 + index / 1000 }
    }));
    const plan = buildProfilePlan({
      ...base,
      profile: "BALANCED",
      preferences: { ...base.preferences, dailyAttractionTarget: 12 },
      candidatePool: { candidates: [candidates[0], ...extraCandidates], candidateIds: [candidates[0], ...extraCandidates].map(({ xid }) => xid) }
    });
    expect(plan.dayTargets).toEqual([{ dayNumber: 1, activityTarget: 12 }, { dayNumber: 2, activityTarget: 12 }]);
    expect(plan.allowedCandidateIds).toHaveLength(24);
  });
  it("produces evidence-based profile differences without ungrounded ids", () => {
    const plans = Object.fromEntries(["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"].map((profile) => [profile, buildProfilePlan({ ...base, profile })]));
    expect(plans.BUDGET_SAVING.rankedSupplementalIds[0]).toBe("CHEAP-FAR");
    expect(plans.COMFORT_FOCUSED.rankedSupplementalIds[0]).toBe("COMFORT-NEAR");
    expect(Object.values(plans).every(({ allowedCandidateIds }) => allowedCandidateIds.every((id) => candidates.some(({ xid }) => xid === id)))).toBe(true);
  });

  it("prefers an otherwise similar candidate with verified hours for the requested date", () => {
    const verified = hoursCandidate("VERIFIED-SATURDAY");
    const unverified = hoursCandidate("UNVERIFIED-SATURDAY");
    const plan = buildProfilePlan({
      ...base,
      profile: "BALANCED",
      preferences: { ...base.preferences, startDate: "2026-10-10", endDate: "2026-10-10", dailyAttractionTarget: 1 },
      candidatePool: {
        candidates: [unverified, verified],
        candidateIds: [unverified.xid, verified.xid],
        operatingHours: { weeklyHours: [hoursRecord(verified.xid, 6)], exceptions: [] }
      },
      resolvedPreferences: { supported: [], unresolved: [] }
    });

    expect(plan.rankedSupplementalIds[0]).toBe(verified.xid);
    expect(plan.allowedCandidateIds).toEqual([verified.xid]);
  });

  it("prefers candidates with verified hours over POIs with no verified weekly data", () => {
    const verified = hoursCandidate("VERIFIED-HOURS");
    const noHours = hoursCandidate("NO-HOURS");
    const plan = buildProfilePlan({
      ...base,
      profile: "BALANCED",
      preferences: { ...base.preferences, startDate: "2026-10-10", endDate: "2026-10-10", dailyAttractionTarget: 1 },
      candidatePool: {
        candidates: [noHours, verified],
        candidateIds: [noHours.xid, verified.xid],
        operatingHours: { weeklyHours: [hoursRecord(verified.xid, 6)], exceptions: [] }
      },
      resolvedPreferences: { supported: [], unresolved: [] }
    });

    expect(plan.allowedCandidateIds).toEqual([verified.xid]);
  });

  it("does not treat Monday-Saturday hours as verified for a Sunday trip date", () => {
    const mondayToSaturday = hoursCandidate("MONDAY-SATURDAY-ONLY");
    const sunday = hoursCandidate("SUNDAY-VERIFIED");
    const plan = buildProfilePlan({
      ...base,
      profile: "BALANCED",
      preferences: { ...base.preferences, startDate: "2026-10-11", endDate: "2026-10-11", dailyAttractionTarget: 1 },
      candidatePool: {
        candidates: [mondayToSaturday, sunday],
        candidateIds: [mondayToSaturday.xid, sunday.xid],
        operatingHours: {
          weeklyHours: [1, 2, 3, 4, 5, 6].map((day) => hoursRecord(mondayToSaturday.xid, day)).concat(hoursRecord(sunday.xid, 0)),
          exceptions: []
        }
      },
      resolvedPreferences: { supported: [], unresolved: [] }
    });

    expect(plan.allowedCandidateIds).toEqual([sunday.xid]);
    expect(plan.rankedSupplementalIds.indexOf(mondayToSaturday.xid)).toBeGreaterThan(plan.rankedSupplementalIds.indexOf(sunday.xid));
  });
});
