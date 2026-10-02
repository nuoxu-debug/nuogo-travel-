import { describe, expect, it } from "vitest";
import { routeModeFor, transportModeSelectionConfig } from "../src/services/itinerary/generateValidatedTrip.js";

const references = [
  { category: "PUBLIC_TRANSPORT_DISTANCE_FARE", tier: "KM_0_32", representativeMinor: 109 },
  { category: "PUBLIC_TRANSPORT_DISTANCE_FARE", tier: "KM_32_42", representativeMinor: 119 },
  { category: "PUBLIC_TRANSPORT_DISTANCE_FARE", tier: "KM_42_52", representativeMinor: 130 },
  { category: "PUBLIC_TRANSPORT_DISTANCE_FARE", tier: "KM_52_72", representativeMinor: 150 },
  { category: "PUBLIC_TRANSPORT_DISTANCE_FARE", tier: "KM_72_999", representativeMinor: 190 },
  { category: "TAXI_OR_RIDE_HAIL_ESTIMATE", tier: "BASE_FARE", representativeMinor: 420 },
  { category: "TAXI_OR_RIDE_HAIL_ESTIMATE", tier: "PER_KM", representativeMinor: 85 }
];

const day = { dayNumber: 1 };
const nearFrom = { latitude: 1.2903, longitude: 103.8514 };
const nearTo = { latitude: 1.2913, longitude: 103.8524 };
const farTo = { latitude: 1.3521, longitude: 103.8198 };

function resolveMode(preferences, from = nearFrom, to = nearTo) {
  return routeModeFor("BALANCED", preferences, { references })({
    day,
    legIndex: 0,
    from,
    to
  });
}

describe("transport preference mode selection", () => {
  it("keeps old requests compatible with the existing profile-based resolver", () => {
    expect(resolveMode({ travelStyle: "BALANCED" }, nearFrom, farTo)).toBe("PUBLIC_TRANSIT");
  });

  it("respects manual public-transport-only preference", () => {
    expect(resolveMode({
      transportPreferenceMode: "MANUAL",
      preferredTransportModes: ["PUBLIC_TRANSIT"]
    }, nearFrom, farTo)).toBe("PUBLIC_TRANSIT");
  });

  it("does not use an unselected taxi mode for manual preferences", () => {
    expect(resolveMode({
      transportPreferenceMode: "MANUAL",
      preferredTransportModes: ["PUBLIC_TRANSIT", "WALK"]
    }, nearFrom, farTo)).not.toBe("TAXI");
  });

  it("uses manual taxi when it is the only selected mode", () => {
    expect(resolveMode({
      transportPreferenceMode: "MANUAL",
      preferredTransportModes: ["TAXI"]
    }, nearFrom, farTo)).toBe("TAXI");
  });

  it("rejects manual walking-only when walking is infeasible", () => {
    const resolver = routeModeFor("BALANCED", {
      transportPreferenceMode: "MANUAL",
      preferredTransportModes: ["WALK"]
    }, { references });
    expect(() => resolver({ day, legIndex: 0, from: nearFrom, to: farTo }))
      .toThrow("No selected transport mode is feasible");
  });

  it("lets AUTO_CHEAPEST choose short feasible walking", () => {
    expect(resolveMode({
      transportPreferenceMode: "AUTO_CHEAPEST",
      preferredTransportModes: []
    })).toBe("WALK");
  });

  it("excludes long walking despite zero cost and chooses cheapest feasible transport", () => {
    expect(resolveMode({
      transportPreferenceMode: "AUTO_CHEAPEST",
      preferredTransportModes: []
    }, nearFrom, farTo)).toBe("PUBLIC_TRANSIT");
  });

  it("uses deterministic tie handling", () => {
    const zeroPublicTransport = references.map((record) =>
      record.category === "PUBLIC_TRANSPORT_DISTANCE_FARE" ? { ...record, representativeMinor: 0 } : record
    );
    const resolver = routeModeFor("BALANCED", {
      transportPreferenceMode: "AUTO_CHEAPEST",
      preferredTransportModes: []
    }, { references: zeroPublicTransport });
    expect(resolver({ day, legIndex: 0, from: nearFrom, to: nearTo })).toBe("WALK");
  });

  it("keeps walking feasibility in one backend configuration boundary", () => {
    expect(transportModeSelectionConfig.maxWalkingRouteMeters).toBeGreaterThan(0);
    expect(transportModeSelectionConfig.maxWalkingRouteMinutes).toBeGreaterThan(0);
  });
});
