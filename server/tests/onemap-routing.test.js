import { describe, expect, it } from "vitest";
import {
  estimateOneMapPublicTransportLeg,
  parseOneMapPublicTransportRoute
} from "../src/services/travel/oneMapPublicTransport.js";

const sampleRoute = {
  plan: {
    itineraries: [{
      duration: 1860,
      walkTime: 420,
      transitTime: 1320,
      transfers: 1,
      fare: "1.77",
      legs: [
        {
          mode: "WALK",
          distance: 320,
          duration: 300,
          from: { name: "Marina Bay Sands" },
          to: { name: "Bayfront" }
        },
        {
          mode: "SUBWAY",
          route: "DT",
          distance: 4100,
          duration: 720,
          from: { name: "Bayfront" },
          intermediateStops: [{ name: "Promenade" }],
          to: { name: "Bugis" }
        },
        {
          mode: "SUBWAY",
          route: "EW",
          distance: 2200,
          duration: 600,
          from: { name: "Bugis" },
          to: { name: "City Hall" }
        },
        {
          mode: "WALK",
          distance: 210,
          duration: 120,
          from: { name: "City Hall" },
          to: { name: "National Gallery Singapore" }
        }
      ]
    }]
  }
};

describe("OneMap public transport routing", () => {
  it("parses public transport itineraries into estimated MRT metadata for the route view", () => {
    const estimate = parseOneMapPublicTransportRoute(sampleRoute, {
      from: { latitude: 1.2839, longitude: 103.8609 },
      to: { latitude: 1.2903, longitude: 103.8514 }
    });

    expect(estimate).toMatchObject({
      durationMinutes: 31,
      distanceMeters: 6830,
      estimatedCostMinor: 177,
      sourceType: "ESTIMATED",
      mrtRoute: {
        provider: "ONEMAP",
        fareMinor: 177,
        transferCount: 1,
        railMinutes: 22,
        walkMinutes: 7,
        accessStation: expect.objectContaining({ name: { en: "Bayfront", zh: "Bayfront" } }),
        egressStation: expect.objectContaining({ name: { en: "City Hall", zh: "City Hall" } }),
        lines: expect.arrayContaining([
          expect.objectContaining({ code: "DT" }),
          expect.objectContaining({ code: "EW" })
        ])
      }
    });
    expect(estimate.mrtRoute.stations.map(({ name }) => name.en)).toEqual([
      "Bayfront",
      "Promenade",
      "Bugis",
      "City Hall"
    ]);
  });

  it("calls OneMap from the server when credentials are available", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url: String(url), options });
      return { ok: true, json: async () => sampleRoute };
    };

    const estimate = await estimateOneMapPublicTransportLeg({
      from: { latitude: 1.2839, longitude: 103.8609 },
      to: { latitude: 1.2903, longitude: 103.8514 },
      mode: "PUBLIC_TRANSIT",
      token: "server-token",
      fetchImpl
    });

    expect(estimate.mrtRoute.provider).toBe("ONEMAP");
    expect(calls[0].url).toContain("/api/public/routingsvc/route");
    expect(calls[0].url).toContain("routeType=pt");
    expect(calls[0].url).toContain("mode=TRANSIT");
    expect(calls[0].options.headers.Authorization).toBe("server-token");
  });

  it("returns null instead of failing when OneMap is not configured or not usable", async () => {
    await expect(estimateOneMapPublicTransportLeg({
      from: { latitude: 1.2839, longitude: 103.8609 },
      to: { latitude: 1.2903, longitude: 103.8514 },
      mode: "PUBLIC_TRANSIT",
      fetchImpl: async () => { throw new Error("should not fetch"); }
    })).resolves.toBeNull();

    await expect(estimateOneMapPublicTransportLeg({
      from: { latitude: 1.2839, longitude: 103.8609 },
      to: { latitude: 1.2903, longitude: 103.8514 },
      mode: "TAXI",
      token: "server-token",
      fetchImpl: async () => { throw new Error("should not fetch"); }
    })).resolves.toBeNull();
  });
});
