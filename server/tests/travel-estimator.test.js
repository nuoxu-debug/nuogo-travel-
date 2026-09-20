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

  it("adds MRT details only to Singapore public-transit legs that can be resolved", async () => {
    const itinerary = {
      travelStyle: "BALANCED",
      trip: { destination: "singapore" },
      days: [{
        dayNumber: 1,
        startPoint: { locationId: "origin", locationType: "ORIGIN" },
        activities: [{ xid: "demo-sg-gardens-by-the-bay" }],
        endPoint: { locationId: "hotel", locationType: "HOTEL" }
      }]
    };
    const result = await buildTripLegs(itinerary, {
      locations: {
        origin: { latitude: 1.2903, longitude: 103.8514 },
        "demo-sg-gardens-by-the-bay": { latitude: 1.2816, longitude: 103.8636 },
        hotel: { latitude: 1.2903, longitude: 103.8514 }
      },
      mode: "PUBLIC_TRANSIT"
    });

    expect(result.days[0].legs[0]).toMatchObject({
      mode: "PUBLIC_TRANSIT",
      routeSource: "ESTIMATED",
      mrtRoute: {
        accessStation: expect.objectContaining({ name: expect.objectContaining({ en: "City Hall" }) }),
        egressStation: expect.objectContaining({ name: expect.objectContaining({ en: "Bayfront" }) }),
        source: expect.objectContaining({ name: expect.stringContaining("LTA") })
      }
    });
  });

  it("uses the caller destination for MRT routing when the draft has no trip metadata", async () => {
    const itinerary = {
      travelStyle: "BALANCED",
      days: [{
        dayNumber: 1,
        startPoint: { locationId: "origin", locationType: "ORIGIN" },
        activities: [{ xid: "demo-sg-gardens-by-the-bay" }],
        endPoint: { locationId: "hotel", locationType: "HOTEL" }
      }]
    };
    const result = await buildTripLegs(itinerary, {
      destination: "singapore",
      locations: {
        origin: { latitude: 1.2903, longitude: 103.8514 },
        "demo-sg-gardens-by-the-bay": { latitude: 1.2816, longitude: 103.8636 },
        hotel: { latitude: 1.2903, longitude: 103.8514 }
      },
      mode: "PUBLIC_TRANSIT"
    });

    expect(result.days[0].legs[0].mrtRoute).toMatchObject({
      accessStation: expect.objectContaining({ name: expect.objectContaining({ en: "City Hall" }) }),
      egressStation: expect.objectContaining({ name: expect.objectContaining({ en: "Bayfront" }) })
    });
  });

  it("prefers OneMap public-transport route metadata before static MRT fallback", async () => {
    const itinerary = {
      travelStyle: "BALANCED",
      trip: { destination: "singapore" },
      days: [{
        dayNumber: 1,
        startPoint: { locationId: "origin", locationType: "ORIGIN" },
        activities: [{ xid: "demo-sg-national-gallery" }],
        endPoint: { locationId: "hotel", locationType: "HOTEL" }
      }]
    };
    const result = await buildTripLegs(itinerary, {
      locations: {
        origin: { latitude: 1.2839, longitude: 103.8609 },
        "demo-sg-national-gallery": { latitude: 1.2903, longitude: 103.8514 },
        hotel: { latitude: 1.2839, longitude: 103.8609 }
      },
      mode: "PUBLIC_TRANSIT",
      publicTransportEstimator: async ({ mode }) => mode === "PUBLIC_TRANSIT" ? ({
        distanceMeters: 6830,
        durationMinutes: 31,
        estimatedCostMinor: 177,
        sourceType: "ESTIMATED",
        mrtRoute: {
          accessStation: { id: "bayfront", name: { en: "Bayfront", zh: "Bayfront" }, lineCodes: ["DT"] },
          egressStation: { id: "city-hall", name: { en: "City Hall", zh: "City Hall" }, lineCodes: ["EW"] },
          stations: [
            { id: "bayfront", name: { en: "Bayfront", zh: "Bayfront" }, lineCodes: ["DT"] },
            { id: "bugis", name: { en: "Bugis", zh: "Bugis" }, lineCodes: ["DT", "EW"] },
            { id: "city-hall", name: { en: "City Hall", zh: "City Hall" }, lineCodes: ["EW"] }
          ],
          lines: [
            { code: "DT", name: { en: "Downtown Line", zh: "Downtown Line" }, color: "#005ec4" },
            { code: "EW", name: { en: "East-West Line", zh: "East-West Line" }, color: "#009645" }
          ],
          segments: [
            { lineCode: "DT", stationIds: ["bayfront", "bugis"] },
            { lineCode: "EW", stationIds: ["bugis", "city-hall"] }
          ],
          stationCount: 3,
          transferCount: 1,
          railMinutes: 22,
          walkMinutes: 7,
          distanceMeters: 6830,
          fareMinor: 177,
          provider: "ONEMAP",
          source: { name: "OneMap public transport routing", url: "https://www.onemap.gov.sg/apidocs/routing" }
        }
      }) : null
    });

    expect(result.days[0].legs[0]).toMatchObject({
      distanceMeters: 6830,
      durationMinutes: 31,
      estimatedCostMinor: 177,
      mrtRoute: {
        provider: "ONEMAP",
        fareMinor: 177,
        source: expect.objectContaining({ name: "OneMap public transport routing" })
      }
    });
  });
});
