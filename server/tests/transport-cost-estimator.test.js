import { describe, expect, it } from "vitest";
import { estimateTransportCostMinor } from "../src/services/travel/transportCostEstimator.js";

const references = [
  { category: "PUBLIC_TRANSPORT_DISTANCE_FARE", tier: "KM_0_32", representativeMinor: 109 },
  { category: "PUBLIC_TRANSPORT_DISTANCE_FARE", tier: "KM_32_42", representativeMinor: 119 },
  { category: "PUBLIC_TRANSPORT_DISTANCE_FARE", tier: "KM_42_52", representativeMinor: 130 },
  { category: "TAXI_OR_RIDE_HAIL_ESTIMATE", tier: "BASE_FARE", representativeMinor: 420 },
  { category: "TAXI_OR_RIDE_HAIL_ESTIMATE", tier: "PER_KM", representativeMinor: 85 }
];

describe("transport cost estimator", () => {
  it("matches public transport fare bands at lower and upper boundaries", () => {
    expect(estimateTransportCostMinor({
      mode: "PUBLIC_TRANSIT",
      distanceMeters: 0,
      travellerCount: 1,
      references
    })).toBe(109);
    expect(estimateTransportCostMinor({
      mode: "PUBLIC_TRANSIT",
      distanceMeters: 3200,
      travellerCount: 1,
      references
    })).toBe(109);
    expect(estimateTransportCostMinor({
      mode: "PUBLIC_TRANSIT",
      distanceMeters: 3201,
      travellerCount: 1,
      references
    })).toBe(119);
  });

  it("multiplies public transport fare by traveller count", () => {
    expect(estimateTransportCostMinor({
      mode: "MIXED",
      distanceMeters: 5000,
      travellerCount: 3,
      references
    })).toBe(390);
  });

  it("keeps walking cost at zero", () => {
    expect(estimateTransportCostMinor({
      mode: "WALK",
      distanceMeters: 8000,
      travellerCount: 4,
      references
    })).toBe(0);
  });

  it("calculates taxi as a vehicle-level estimate", () => {
    expect(estimateTransportCostMinor({
      mode: "TAXI",
      distanceMeters: 2500,
      travellerCount: 4,
      references
    })).toBe(675);
  });

  it("returns undefined when required reference data is unavailable", () => {
    expect(estimateTransportCostMinor({
      mode: "PUBLIC_TRANSIT",
      distanceMeters: 20_000,
      travellerCount: 2,
      references
    })).toBeUndefined();
    expect(estimateTransportCostMinor({
      mode: "TAXI",
      distanceMeters: 2500,
      travellerCount: 2,
      references: references.filter(({ tier }) => tier !== "PER_KM")
    })).toBeUndefined();
  });
});
