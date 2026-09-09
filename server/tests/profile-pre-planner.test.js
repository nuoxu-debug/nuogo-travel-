import { describe, expect, it } from "vitest";
import { buildProfilePlan } from "../src/services/itinerary/profilePrePlanner.js";

const candidates = [
  { xid: "N-SUMMER", candidateId: "N-SUMMER", category: "HISTORY", interestMatch: true, estimatedCostMinor: 5000, coordinates: { latitude: 39.99, longitude: 116.27 } },
  { xid: "CHEAP-FAR", candidateId: "CHEAP-FAR", category: "CULTURE", estimatedCostMinor: 1000, coordinates: { latitude: 40.2, longitude: 116.6 } },
  { xid: "COMFORT-NEAR", candidateId: "COMFORT-NEAR", category: "NATURE", estimatedCostMinor: 15000, comfortScore: 1, coordinates: { latitude: 39.91, longitude: 116.41 } }
];
const base = { preferences: { destination: "singapore", startDate: "2026-10-10", endDate: "2026-10-11", interests: ["HISTORY"] }, candidatePool: { candidates, candidateIds: candidates.map(({ xid }) => xid) }, resolvedPreferences: { supported: [candidates[0]], unresolved: [] }, budgetContext: { allocatableBudgetMinor: 100000 }, costReferences: [], anchors: { hotel: { latitude: 39.9, longitude: 116.4 } } };

describe("profile pre-planner", () => {
  it("keeps selected attractions first and grounded", () => { const plan = buildProfilePlan({ ...base, profile: "BALANCED" }); expect(plan.selectedCandidateIds[0]).toBe("N-SUMMER"); expect(plan.allowedCandidateIds).toContain("N-SUMMER"); expect(plan.structurallyExcludedSelected).toEqual([]); });
  it("preserves structural failures separately", () => { const plan = buildProfilePlan({ ...base, profile: "BALANCED", resolvedPreferences: { supported: [], unresolved: [{ xid: "UNKNOWN", displayName: "Unknown", reason: "UNAVAILABLE_ATTRACTION" }] } }); expect(plan.structurallyExcludedSelected).toEqual([{ xid: "UNKNOWN", displayName: "Unknown", reason: "UNAVAILABLE_ATTRACTION" }]); });
  it("defers approximate feasibility without removing a supported selection", () => { const deferred = { ...candidates[0], estimatedCostMinor: 200000 }; const plan = buildProfilePlan({ ...base, profile: "BUDGET_SAVING", candidatePool: { candidates: [deferred], candidateIds: [deferred.xid] }, resolvedPreferences: { supported: [deferred], unresolved: [] } }); expect(plan.provisionallyDeferredSelected).toHaveLength(1); expect(plan.allowedCandidateIds).toContain(deferred.xid); });
  it("produces evidence-based profile differences without ungrounded ids", () => {
    const plans = Object.fromEntries(["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"].map((profile) => [profile, buildProfilePlan({ ...base, profile })]));
    expect(plans.BUDGET_SAVING.rankedSupplementalIds[0]).toBe("CHEAP-FAR");
    expect(plans.COMFORT_FOCUSED.rankedSupplementalIds[0]).toBe("COMFORT-NEAR");
    expect(Object.values(plans).every(({ allowedCandidateIds }) => allowedCandidateIds.every((id) => candidates.some(({ xid }) => xid === id)))).toBe(true);
  });
});
