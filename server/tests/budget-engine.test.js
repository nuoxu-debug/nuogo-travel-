import { describe, expect, it } from "vitest";
import { calculateItineraryBudget, validateHardBudget } from "../src/services/budget/budgetEngine.js";
import { resolveCostReferences } from "../src/services/budget/costReferenceService.js";
import { demoCostReferenceFixtures } from "../src/services/budget/demoCostReferenceFixtures.js";
import { spendingProfileIds } from "../src/services/budget/spendingProfiles.js";

const preferences = {
  destination: "singapore", startDate: "2026-10-10", endDate: "2026-10-12",
  travellerCount: 4, budgetMinor: 1_000_000, currency: "SGD"
};
const itinerary = { days: [{ activities: [
  { activityType: "HISTORY" }, { activityType: "CULTURE" }, { activityType: "ENTERTAINMENT" }
] }] };
const references = resolveCostReferences(demoCostReferenceFixtures("singapore"), { city: "singapore" });

describe("Singapore deterministic budget engine", () => {
  it("uses the exact Table 3.11 SGD references and food ranges", () => {
    expect(references).toHaveLength(14);
    expect(references.find(({ category, tier }) => category === "ACCOMMODATION_ROOM_NIGHT" && tier === "MID_RANGE").representativeMinor).toBe(16_500);
    expect(references.find(({ category, tier }) => category === "LOCAL_TRANSPORT_PERSON_DAY" && tier === "BALANCED").representativeMinor).toBe(190);
    expect(references.find(({ category, tier }) => category === "FOOD_PERSON_DAY" && tier === "ECONOMY")).toMatchObject({ minMinor: 2_000, representativeMinor: 2_750, maxMinor: 3_500 });
  });

  it("calculates six categories in integer SGD cents without double counting", () => {
    const summary = calculateItineraryBudget({ preferences, itinerary, references, profile: "BALANCED" });
    expect(summary.categoriesMinor).toEqual({
      accommodation: 66_000, localTransportation: 2_280, foodAndBeverages: 57_000,
      attractionTickets: 36_800, entertainmentActivities: 30_400, other: 24_000
    });
    expect(summary).toMatchObject({ totalMinor: 216_480, remainingMinor: 783_520, perPersonMinor: 54_120, withinBudget: true });
    expect(Object.values(summary.categoryComponentsMinor).every(({ baselineMinor, profileUpliftMinor, finalMinor }) => baselineMinor + profileUpliftMinor === finalMinor)).toBe(true);
  });

  it("derives travellers, days, nights, and rooms from the request", () => {
    const summary = calculateItineraryBudget({ preferences: { ...preferences, travellerCount: 3, endDate: "2026-10-14" }, itinerary, references, profile: "BUDGET_SAVING" });
    expect(summary.categoriesMinor).toMatchObject({ accommodation: 54_400, localTransportation: 1_920, foodAndBeverages: 41_250, other: 15_000 });
  });

  it("applies distinct style tiers under one unchanged hard maximum", () => {
    const summaries = spendingProfileIds.map((profile) => calculateItineraryBudget({ preferences, itinerary, references, profile }));
    expect(summaries.map(({ totalMinor }) => totalMinor)).toEqual([140_936, 216_480, 466_284]);
    expect(new Set(summaries.map(({ budgetMinor }) => budgetMinor))).toEqual(new Set([1_000_000]));
    expect(summaries.every(({ withinBudget }) => withinBudget)).toBe(true);
  });

  it("fails an impossible budget and accepts the exact hard-budget boundary", () => {
    const summary = calculateItineraryBudget({ preferences, itinerary, references, profile: "BALANCED" });
    expect(validateHardBudget(summary, summary.totalMinor)).toMatchObject({ valid: true, remainingMinor: 0 });
    expect(validateHardBudget(summary, summary.totalMinor - 1)).toMatchObject({ valid: false, code: "BUDGET_EXCEEDED", exceededByMinor: 1 });
  });

  it("keeps all arithmetic integral for an odd traveller count", () => {
    const summary = calculateItineraryBudget({ preferences: { ...preferences, travellerCount: 3 }, itinerary, references, profile: "COMFORT_FOCUSED" });
    expect(Number.isInteger(summary.totalMinor)).toBe(true);
    expect(Number.isInteger(summary.perPersonMinor)).toBe(true);
    expect(Object.values(summary.categoriesMinor).every(Number.isInteger)).toBe(true);
  });
});

describe("Singapore cost reference validation", () => {
  it("fails closed when a required active reference is missing", () => {
    const incomplete = demoCostReferenceFixtures("singapore").filter(({ category, tier }) => !(category === "FOOD_PERSON_DAY" && tier === "COMFORT"));
    expect(() => resolveCostReferences(incomplete, { city: "singapore" })).toThrow(expect.objectContaining({ code: "MISSING_COST_REFERENCE" }));
  });

  it("rejects references without coherent source evidence", () => {
    const invalid = demoCostReferenceFixtures("singapore");
    invalid[0] = { ...invalid[0], sourceUrl: undefined };
    expect(() => resolveCostReferences(invalid, { city: "singapore" })).toThrow(expect.objectContaining({ code: "MISSING_COST_REFERENCE" }));
  });
});
