import { describe, expect, it } from "vitest";
import { selectRouteMapProvider } from "../src/components/RouteMap.jsx";

describe("route map provider selection", () => {
  it("uses a real Leaflet map when no AMap key is configured", () => {
    expect(selectRouteMapProvider({
      apiKey: "",
      hasEstimatedLocation: true
    })).toBe("leaflet");
  });

  it("prefers AMap when its key is configured and locations are verified", () => {
    expect(selectRouteMapProvider({
      apiKey: "configured-key",
      hasEstimatedLocation: false
    })).toBe("amap");
  });
});
