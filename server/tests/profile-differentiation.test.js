import { describe, expect, it, vi } from "vitest";
import { evaluateProfileDifferentiation } from "../src/services/itinerary/evaluateProfileDifferentiation.js";
import { attemptProfileDiversification } from "../src/services/itinerary/diversifyProfiles.js";

const config = { maxNonSelectedPoiJaccard: .8, minimumMeaningfulDimensions: 2, maxRepairAttemptsPerProfile: 1 };
const variant = (profile, ids, overrides = {}) => ({ state: "FINAL_VALIDATED", itinerary: { travelStyle: profile, days: [{ activities: ids.map((xid) => ({ xid })), legs: [] }] }, summary: { withinBudget: true, totalMinor: 10000, budgetMinor: 50000, categoriesMinor: { accommodation: profile === "COMFORT_FOCUSED" ? 5000 : 2000 } }, variantMetrics: { accommodationTier: profile === "COMFORT_FOCUSED" ? "COMFORT" : "BUDGET", foodTier: "BALANCED", pace: "MODERATE", transportDistribution: overrides.transportDistribution ?? { WALK: 1 } }, ...overrides });

describe("profile differentiation quality", () => {
  it("measures non-selected overlap and meaningful dimensions", () => {
    const result = evaluateProfileDifferentiation([variant("BUDGET_SAVING", ["SELECTED", "A"]), variant("BALANCED", ["SELECTED", "B"]), variant("COMFORT_FOCUSED", ["SELECTED", "C"])], { selectedCandidateIds: ["SELECTED"], config });
    expect(result.pairs[0]).toMatchObject({ nonSelectedPoiJaccard: expect.any(Number), meaningfulDimensionCount: expect.any(Number) });
    expect(result.diagnostics).toEqual([]);
  });
  it("marks all-selected overlap as not applicable", () => expect(evaluateProfileDifferentiation([variant("BUDGET_SAVING", ["SELECTED"]), variant("BALANCED", ["SELECTED"])], { selectedCandidateIds: ["SELECTED"], config }).pairs[0].nonSelectedPoiJaccard).toBe("NOT_APPLICABLE"));
  it("records sparse similarity as diagnostics instead of failure", () => { const result = evaluateProfileDifferentiation([variant("BUDGET_SAVING", ["A"]), variant("BALANCED", ["A"])], { selectedCandidateIds: [], config }); expect(result.diagnostics).toHaveLength(1); expect(result.valid).toBe(true); });
  it("keeps a bounded repair only when mandatory-valid and quality improves", async () => {
    const original = [variant("BUDGET_SAVING", ["A"]), variant("BALANCED", ["A"])];
    const evaluate = vi.fn(async () => variant("BALANCED", ["B"], { validation: { valid: true, issues: [] } }));
    const result = await attemptProfileDiversification({ variants: original, selectedCandidateIds: [], profilePlans: [{ profile: "BUDGET_SAVING", rankedSupplementalIds: ["A"] }, { profile: "BALANCED", rankedSupplementalIds: ["A", "B"] }], evaluate, config });
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(result.variants[1].itinerary.days[0].activities[0].xid).toBe("B");
  });
});
