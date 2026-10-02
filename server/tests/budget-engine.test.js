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
const pricedItinerary = { days: [{ activities: [
  {
    xid: "demo-sg-gardens-by-the-bay",
    activityType: "NATURE",
    poi: { xid: "demo-sg-gardens-by-the-bay", name: "Gardens by the Bay", kinds: "gardens,natural" }
  },
  {
    xid: "demo-sg-merlion-park",
    activityType: "HISTORY",
    poi: { xid: "demo-sg-merlion-park", name: "Merlion Park", kinds: "viewpoints,architecture" }
  },
  {
    xid: "otm-museum",
    activityType: "CULTURE",
    poi: { xid: "otm-museum", name: "Small Museum", kinds: "museums,cultural,indoor" }
  }
] }] };
const references = resolveCostReferences(demoCostReferenceFixtures("singapore"), { city: "singapore" });

describe("Singapore deterministic budget engine", () => {
  it("uses SGD planning references including Klook attraction ticket ranges", () => {
    expect(references).toHaveLength(57);
    expect(references.find(({ category, tier }) => category === "ACCOMMODATION_ROOM_NIGHT" && tier === "MID_RANGE").representativeMinor).toBe(16_500);
    expect(references.find(({ category, tier }) => category === "LOCAL_TRANSPORT_PERSON_DAY" && tier === "BALANCED").representativeMinor).toBe(190);
    expect(references.find(({ category, tier }) => category === "PUBLIC_TRANSPORT_DISTANCE_FARE" && tier === "KM_0_32").representativeMinor).toBe(109);
    expect(references.find(({ category, tier }) => category === "TAXI_OR_RIDE_HAIL_ESTIMATE" && tier === "BASE_FARE").representativeMinor).toBe(420);
    expect(references.find(({ category, tier }) => category === "FOOD_PERSON_DAY" && tier === "ECONOMY")).toMatchObject({ minMinor: 2_000, representativeMinor: 2_750, maxMinor: 3_500 });
    expect(references.find(({ category }) => category === "ATTRACTION_PERSON_ENTRY")).toMatchObject({
      minMinor: 1_800,
      representativeMinor: 3_550,
      maxMinor: 5_050,
      sourceName: expect.stringContaining("Klook"),
      sourceUrl: "https://www.klook.com/en-SG/activity/127-gardens-by-the-bay-singapore/"
    });
    expect(references.find(({ category, tier }) => category === "ATTRACTION_PERSON_ENTRY" && tier === "MUSEUM")).toMatchObject({
      minMinor: 1_200,
      representativeMinor: 2_500,
      maxMinor: 4_000
    });
    expect(references.find(({ poiId, referenceType }) => poiId === "demo-sg-singapore-zoo" && referenceType === "EXACT")).toMatchObject({
      representativeMinor: 4_900,
      sourceType: "OFFICIAL"
    });
    expect(references.find(({ poiId, referenceType }) => poiId === "demo-sg-merlion-park" && referenceType === "FREE")).toMatchObject({
      representativeMinor: 0,
      sourceName: expect.stringContaining("free")
    });
  });

  it("calculates six categories in integer SGD cents without double counting", () => {
    const summary = calculateItineraryBudget({ preferences, itinerary, references, profile: "BALANCED" });
    expect(summary.categoriesMinor).toEqual({
      accommodation: 66_000, localTransportation: 2_280, foodAndBeverages: 57_000,
      attractionTickets: 28_400, entertainmentActivities: 30_400, other: 24_000
    });
    expect(summary).toMatchObject({ totalMinor: 208_080, remainingMinor: 791_920, perPersonMinor: 52_020, withinBudget: true });
    expect(Object.values(summary.categoryComponentsMinor).every(({ baselineMinor, profileUpliftMinor, finalMinor }) => baselineMinor + profileUpliftMinor === finalMinor)).toBe(true);
  });

  it("derives travellers, days, nights, and rooms from the request", () => {
    const summary = calculateItineraryBudget({ preferences: { ...preferences, travellerCount: 3, endDate: "2026-10-14" }, itinerary, references, profile: "BUDGET_SAVING" });
    expect(summary.categoriesMinor).toMatchObject({ accommodation: 54_400, localTransportation: 1_920, foodAndBeverages: 41_250, other: 15_000 });
  });

  it("uses resolved attraction prices instead of one generic value for every attraction", () => {
    const summary = calculateItineraryBudget({ preferences, itinerary: pricedItinerary, references, profile: "BALANCED" });

    expect(summary.categoriesMinor.attractionTickets).toBe((3_550 + 0 + 2_500) * preferences.travellerCount);
    expect(summary.provenance.attractionTickets).toEqual(expect.objectContaining({
      category: "ATTRACTION_PERSON_ENTRY"
    }));
  });

  it("uses complete route leg transport costs instead of adding a daily transport allowance", () => {
    const routedItinerary = {
      days: [{
        activities: [{ xid: "poi-1", activityType: "HISTORY" }],
        legs: [{ estimatedCostMinor: 1_600 }, { estimatedCostMinor: 1_400 }]
      }]
    };
    const summary = calculateItineraryBudget({ preferences, itinerary: routedItinerary, references, profile: "BALANCED" });
    expect(summary.categoriesMinor.localTransportation).toBe(3_000);
    expect(summary.categoriesMinor.localTransportation).not.toBe(2_280);
  });

  it("preserves authoritative route leg transport costs below the budget baseline", () => {
    const routedItinerary = {
      days: [{
        activities: [{ xid: "poi-1", activityType: "HISTORY" }],
        legs: [{ estimatedCostMinor: 109 }, { estimatedCostMinor: 218 }]
      }]
    };
    const summary = calculateItineraryBudget({ preferences, itinerary: routedItinerary, references, profile: "BALANCED" });
    expect(summary.categoriesMinor.localTransportation).toBe(327);
    expect(summary.categoryComponentsMinor.localTransportation).toMatchObject({
      baselineMinor: 1_536,
      profileUpliftMinor: -1_209,
      finalMinor: 327
    });
  });

  it("falls back to the daily transport allowance when route leg costs are incomplete", () => {
    const incompleteItinerary = {
      days: [{
        activities: [{ xid: "poi-1", activityType: "HISTORY" }],
        legs: [{ estimatedCostMinor: 109 }]
      }]
    };
    const summary = calculateItineraryBudget({ preferences, itinerary: incompleteItinerary, references, profile: "BALANCED" });
    expect(summary.categoriesMinor.localTransportation).toBe(2_280);
  });

  it("applies distinct style tiers under one unchanged hard maximum", () => {
    const summaries = spendingProfileIds.map((profile) => calculateItineraryBudget({ preferences, itinerary, references, profile }));
    expect(summaries.map(({ totalMinor }) => totalMinor)).toEqual([132_536, 208_080, 457_884]);
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
