import { describe, expect, it } from "vitest";
import { estimateTravelLeg } from "../src/services/travel/estimateTravelTime.js";
import { buildTripLegs } from "../src/services/itinerary/buildTripLegs.js";

const from = { latitude: 0, longitude: 0 };
const to = { latitude: 0, longitude: 0.01 };

describe("deterministic travel estimator", () => {
  it.each([
    ["WALK", 14],
    ["PUBLIC_TRANSIT", 11],
    ["TAXI", 7]
  ])("estimates %s travel with an estimated source label", (mode, durationMinutes) => {
    const leg = estimateTravelLeg({ from, to, mode });

    expect(leg).toMatchObject({
      distanceMeters: 1112,
      durationMinutes,
      sourceType: "ESTIMATED"
    });
  });

  it("rejects coordinates that cannot produce a finite Haversine distance", () => {
    expect(() => estimateTravelLeg({
      from: { latitude: Number.NaN, longitude: 0 },
      to,
      mode: "WALK"
    })).toThrow("finite latitude and longitude");
  });

  it("builds canonical route legs without a route provider", async () => {
    const itinerary = {
      variant: "BALANCED",
      trip: { destination: "singapore" },
      days: [{
        dayNumber: 1,
        startPoint: { locationId: "origin", locationType: "ORIGIN" },
        activities: [{ xid: "Q-B001" }],
        endPoint: { locationId: "hotel", locationType: "HOTEL" }
      }]
    };
    const result = await buildTripLegs(itinerary, {
      locations: { origin: from, "Q-B001": to, hotel: from },
      mode: "WALK",
      routeCostResolver: () => 0
    });

    expect(result.days[0]).not.toHaveProperty("routeUnavailable");
    expect(result.days[0].legs[0]).toMatchObject({
      distanceMeters: 1112,
      durationMinutes: 14,
      estimatedCostMinor: 0,
      routeSource: "ESTIMATED",
      sourceType: "ESTIMATED"
    });
    expect(result.days[0].legs[0]).not.toHaveProperty("routeRetrievedAt");
  });

  it("gives TAXI legs a deterministic nonzero planning cost", async () => {
    const mode = "TAXI";
    const itinerary = {
      variant: "BALANCED",
      trip: { destination: "singapore" },
      days: [{
        dayNumber: 1,
        startPoint: { locationId: "origin", locationType: "ORIGIN" },
        activities: [{ xid: "Q-B001" }],
        endPoint: { locationId: "hotel", locationType: "HOTEL" }
      }]
    };
    const result = await buildTripLegs(itinerary, {
      locations: { origin: from, "Q-B001": to, hotel: from },
      mode
    });

    expect(result.days[0]).not.toHaveProperty("routeUnavailable");
    expect(result.days[0].legs[0]).toMatchObject({
      sourceType: "ESTIMATED",
      routeSource: "ESTIMATED",
      estimatedCostMinor: expect.any(Number)
    });
    expect(result.days[0].legs[0].estimatedCostMinor).toBeGreaterThan(0);
  });
});
