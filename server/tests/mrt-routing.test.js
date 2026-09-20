import { describe, expect, it } from "vitest";
import {
  estimateSingaporeMrtLeg,
  findNearestMrtStation,
  shortestMrtRoute
} from "../src/services/travel/singaporeMrtGraph.js";

describe("Singapore MRT estimated routing", () => {
  it("matches POI coordinates to nearby MRT stations with walking access time", () => {
    const nearest = findNearestMrtStation({
      latitude: 1.2869,
      longitude: 103.8545
    });

    expect(nearest).toMatchObject({
      station: expect.objectContaining({
        id: "raffles-place",
        name: { en: "Raffles Place", zh: "莱佛士坊" }
      }),
      walkMinutes: expect.any(Number)
    });
    expect(nearest.distanceMeters).toBeLessThan(900);
  });

  it("routes between stations through the MRT graph and records interchange details", () => {
    const route = shortestMrtRoute("botanic-gardens", "bayfront");

    expect(route).toMatchObject({
      from: expect.objectContaining({ id: "botanic-gardens" }),
      to: expect.objectContaining({ id: "bayfront" }),
      transferCount: expect.any(Number),
      durationMinutes: expect.any(Number),
      sourceType: "ESTIMATED"
    });
    expect(route.stations.map(({ id }) => id)).toEqual(expect.arrayContaining([
      "botanic-gardens",
      "bayfront"
    ]));
    expect(route.lines.length).toBeGreaterThan(0);
  });

  it("builds an estimated MRT leg with first-mile and last-mile walking", () => {
    const leg = estimateSingaporeMrtLeg({
      from: { latitude: 1.2903, longitude: 103.8514 },
      to: { latitude: 1.2816, longitude: 103.8636 },
      mode: "PUBLIC_TRANSIT"
    });

    expect(leg).toMatchObject({
      sourceType: "ESTIMATED",
      mrtRoute: {
        accessStation: expect.objectContaining({ id: "city-hall" }),
        egressStation: expect.objectContaining({ id: "bayfront" }),
        walkMinutes: expect.any(Number),
        stationCount: expect.any(Number),
        transferCount: expect.any(Number)
      }
    });
    expect(leg.durationMinutes).toBeGreaterThan(leg.mrtRoute.railMinutes);
  });

  it("returns null when a point is outside the supported MRT access radius", () => {
    expect(estimateSingaporeMrtLeg({
      from: { latitude: 1.3521, longitude: 103.8198 },
      to: { latitude: 1.2816, longitude: 103.8636 },
      mode: "PUBLIC_TRANSIT"
    })).toBeNull();
  });

  it("does not apply MRT routing to taxi or walking legs", () => {
    expect(estimateSingaporeMrtLeg({
      from: { latitude: 1.2903, longitude: 103.8514 },
      to: { latitude: 1.2816, longitude: 103.8636 },
      mode: "TAXI"
    })).toBeNull();
  });
});
