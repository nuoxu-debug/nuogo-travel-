import { describe, expect, it } from "vitest";
import * as constants from "./constants.js";
import * as schemas from "./schemas.js";
import { itineraryDraftJsonSchema } from "./itineraryDraftSchema.js";

const validPreferences = {
  destination: "singapore",
  startDate: "2026-10-10",
  endDate: "2026-10-12",
  travellerCount: 2,
  budgetMinor: 120000,
  currency: "SGD",
  interests: ["HISTORY", "FOOD"],
  preferredSights: [],
  attractionSelectionMode: "AUTO",
  selectedAttractions: [],
  travelStyle: "BALANCED",
  rainyDayBackupEnabled: false,
  language: "zh",
  consentToLlmProcessing: true
};

describe("Nuogo Singapore contracts", () => {
  it("exposes Singapore as the only active destination", () => {
    expect(constants.supportedDestinationIds).toEqual(["singapore"]);
    expect(constants.getCity("singapore")).toMatchObject({ name: { en: "Singapore", zh: "新加坡" }, countryCode: "SG" });
    expect(constants.spendingProfiles).toEqual(["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"]);
  });

  it("accepts the simplified SGD preference contract and derives duration", () => {
    const parsed = schemas.travelPreferenceSchema.parse(validPreferences);
    expect(parsed).toMatchObject({ destination: "singapore", budgetMinor: 120000, currency: "SGD" });
    expect(schemas.deriveTripDurationDays(parsed.startDate, parsed.endDate)).toBe(3);
    for (const field of ["origin", "arrivalDateTime", "departureDateTime", "budgetMinor"]) {
      expect(() => schemas.travelPreferenceSchema.parse({ ...validPreferences, [field]: "obsolete" })).toThrow();
    }
  });

  it("validates MANUAL and AUTO selection semantics", () => {
    expect(schemas.travelPreferenceSchema.parse({
      ...validPreferences,
      attractionSelectionMode: "MANUAL",
      selectedAttractions: [{ xid: "demo-sg-gardens", displayName: "Gardens by the Bay" }]
    }).selectedAttractions).toHaveLength(1);
    expect(() => schemas.travelPreferenceSchema.parse({
      ...validPreferences,
      attractionSelectionMode: "AUTO",
      selectedAttractions: [{ xid: "demo-sg-gardens", displayName: "Gardens by the Bay" }]
    })).toThrow();
  });

  it("preserves archived China money without relabelling it as SGD", () => {
    const archived = schemas.normalizeArchivedTravelPreferences({
      destination: "beijing", totalBudgetCny: 5000, preferredSights: ["Forbidden City"]
    }, { travelStyle: "COMFORT_FOCUSED" });
    expect(archived).toMatchObject({ destination: "beijing", totalBudgetCny: 5000, currency: "CNY", travelStyle: "COMFORT_FOCUSED" });
    expect(archived.preferredSights).toEqual(["Forbidden City"]);
  });

  it("keeps archived Singapore minor-unit values denominated in SGD", () => {
    expect(schemas.normalizeArchivedTravelPreferences({
      destination: "singapore", budgetMinor: 120000
    })).toMatchObject({ budgetMinor: 120000, currency: "SGD" });
  });

  it("keeps authoritative money and coordinates outside the LLM draft", () => {
    const draft = {
      travelStyle: "BALANCED",
      trip: { destination: "singapore", startDate: "2026-10-10", endDate: "2026-10-10", travellerCount: 2, budgetMinor: 60000, currency: "SGD" },
      days: [{
        dayNumber: 1, date: "2026-10-10",
        startPoint: { locationId: "hotel", locationType: "HOTEL" },
        activities: [{ sequence: 1, xid: "demo-sg-gardens", activityType: "NATURE", plannedStartTime: "10:00", plannedDurationMinutes: 120, reason: "Matches nature interests." }],
        endPoint: { locationId: "hotel", locationType: "HOTEL" }
      }]
    };
    expect(schemas.itineraryDraftSchema.parse(draft).travelStyle).toBe("BALANCED");
    expect(() => schemas.itineraryDraftSchema.parse({ ...draft, trip: { ...draft.trip, origin: "Kuala Lumpur" } })).toThrow();
    expect(itineraryDraftJsonSchema.additionalProperties).toBe(false);
  });

  it("uses generic minor units for deterministic route estimates", () => {
    expect(schemas.tripLegSchema.parse({
      id: "leg-1", fromLocationId: "hotel", toLocationId: "demo-sg-gardens", mode: "PUBLIC_TRANSIT",
      distanceMeters: 1200, durationMinutes: 12, estimatedCostMinor: 128,
      routeSource: "ESTIMATED", sourceType: "ESTIMATED"
    }).estimatedCostMinor).toBe(128);
  });
});
