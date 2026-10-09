import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LeafletRouteMap, { ROUTE_MAP_TILE_URL } from "../src/components/LeafletRouteMap.jsx";
import { LanguageProvider } from "../src/context/LanguageContext.jsx";

const activities = [
  {
    id: "start",
    name: { en: "Start", zh: "Start" },
    location: { latitude: 1.2868, longitude: 103.8545 }
  },
  {
    id: "a",
    name: { en: "Gardens by the Bay", zh: "Gardens by the Bay" },
    location: { latitude: 1.2816, longitude: 103.8636 },
    activityType: "NATURE",
    durationMinutes: 90
  },
  {
    id: "b",
    name: { en: "National Gallery Singapore", zh: "National Gallery Singapore" },
    location: { latitude: 1.2903, longitude: 103.8514 },
    activityType: "CULTURE",
    durationMinutes: 90
  }
];

describe("LeafletRouteMap", () => {
  it("uses a no-key tile source so the map does not render API-key placeholder tiles", () => {
    expect(ROUTE_MAP_TILE_URL).toBe("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(ROUTE_MAP_TILE_URL).not.toContain("cartocdn.com");
  });

  it("labels the map route as estimated instead of implying exact navigation", () => {
    render(<LanguageProvider><LeafletRouteMap activities={activities} /></LanguageProvider>);

    expect(screen.getByTestId("route-map-panel")).toBeInTheDocument();
    expect(screen.getByText("Estimated route map")).toBeInTheDocument();
    expect(screen.getByText("Route shape is an estimate, not live navigation.")).toBeInTheDocument();
  });

  it("warns when the map includes an estimated location", () => {
    render(
      <LanguageProvider>
        <LeafletRouteMap activities={[
          { ...activities[0], locationIsEstimated: true },
          ...activities.slice(1)
        ]} />
      </LanguageProvider>
    );

    expect(screen.getByText("Route shape is an estimate; some locations are estimated.")).toBeInTheDocument();
  });
});
