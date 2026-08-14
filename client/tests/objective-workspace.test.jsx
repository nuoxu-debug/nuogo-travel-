import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../src/App.jsx";

function objectiveTrip() {
  const categoriesFen = {
    outboundTransport: 30000,
    returnTransport: 30000,
    accommodation: 100000,
    localTransportation: 2000,
    foodAndBeverages: 60000,
    attractionTickets: 40000,
    entertainmentActivities: 10000,
    other: 8000
  };
  const poi = (id, name, longitude, latitude) => ({
    sequence: Number(id.at(-1)),
    poiId: id,
    activityType: "HISTORY",
    plannedStartTime: "10:00",
    scheduledStartTime: "10:05",
    scheduledEndTime: "11:35",
    plannedDurationMinutes: 90,
    reason: "Selected from verified destination candidates.",
    poi: {
      canonicalPoiId: id,
      name,
      category: "ATTRACTION",
      coordinates: { longitude, latitude },
      address: "Central district",
      primarySource: "AMAP",
      sourceRecords: [{ provider: "AMAP", sourceId: id, retrievedAt: "2026-08-14T00:00:00.000Z" }]
    }
  });
  const leg = (id, fromLocationId, toLocationId) => ({
    id, fromLocationId, toLocationId, mode: "PUBLIC_TRANSIT",
    distanceMeters: 1200, durationMinutes: 5, estimatedCostFen: 300,
    routeSource: "DEMO", routeRetrievedAt: "2026-08-14T00:00:00.000Z"
  });
  const itinerary = {
    variant: "BALANCED",
    trip: { origin: "Shanghai", destination: "beijing", startDate: "2026-10-10", endDate: "2026-10-11", travellerCount: 2, totalBudgetCny: 5000 },
    days: [{
      dayNumber: 1, date: "2026-10-10", startPoint: { locationId: "origin", locationType: "ORIGIN" },
      activities: [poi("candidate:beijing:1", "Palace Museum", 116.3972, 39.9163)],
      endPoint: { locationId: "hotel", locationType: "HOTEL" },
      legs: [leg("leg-1", "origin", "candidate:beijing:1"), leg("leg-2", "candidate:beijing:1", "hotel")]
    }, {
      dayNumber: 2, date: "2026-10-11", startPoint: { locationId: "hotel", locationType: "HOTEL" },
      activities: [poi("candidate:beijing:2", "Temple of Heaven", 116.4066, 39.8819)],
      endPoint: { locationId: "destination", locationType: "DESTINATION" },
      legs: [leg("leg-3", "hotel", "candidate:beijing:2"), leg("leg-4", "candidate:beijing:2", "destination")]
    }]
  };
  return {
    id: "trip-objective", destination: "beijing", startDate: "2026-10-10", endDate: "2026-10-11",
    travellerCount: 2, totalBudgetCny: 5000, objectiveAligned: true, revision: 0,
    selectedVariantId: "BALANCED", title: "Beijing study trip",
    preferences: { ...itinerary.trip, interests: ["HISTORY"], preferredSights: [], accommodationPreference: "MID_RANGE", foodPreference: "LOCAL", localTransportPreference: "PUBLIC_TRANSIT", activityPreferences: ["HISTORY"], arrivalDateTime: "2026-10-10T08:00:00+08:00", departureDateTime: "2026-10-11T20:00:00+08:00", outboundTransportMode: "TRAIN", returnTransportMode: "TRAIN", outboundTransportCostCny: 300, returnTransportCostCny: 300, otherPreferences: "", language: "en", consentToLlmProcessing: true },
    variants: [{ state: "FINAL_VALIDATED", itinerary, summary: { profile: "BALANCED", categoriesFen, totalFen: 280000, budgetFen: 500000, remainingFen: 220000, perPersonFen: 140000 }, validation: { valid: true, issues: [] } }]
  };
}

async function renderWorkspace() {
  localStorage.setItem("nuogo-token", "test-token");
  sessionStorage.setItem("nuogo-trip-trip-objective", JSON.stringify(objectiveTrip()));
  fetch.mockResolvedValue({ ok: true, json: async () => ({ user: { id: "user-1", name: "Student", email: "student@nuogo.test" } }) });
  render(<App initialPath="/trip/trip-objective" />);
  return screen.findByRole("heading", { name: "Beijing study trip" });
}

describe("validated itinerary workspace", () => {
  it("shows a continuous day sequence with route legs and grounded activity details", async () => {
    await renderWorkspace();
    const timeline = screen.getByRole("region", { name: "Day 1 continuous itinerary" });
    expect(within(timeline).getByText("Start · Origin")).toBeInTheDocument();
    expect(within(timeline).getAllByText("1.2 km · 5 min")).toHaveLength(2);
    expect(within(timeline).getByRole("button", { name: /Palace Museum/ })).toHaveTextContent("AMAP");
    expect(within(timeline).getByText("End · Hotel")).toBeInTheDocument();

    await userEvent.click(within(timeline).getByRole("button", { name: /Palace Museum/ }));
    expect(screen.getByRole("dialog", { name: "Palace Museum details" })).toHaveTextContent("Selected from verified destination candidates");
    expect(screen.getByText("candidate:beijing:1", { selector: "dd" })).toBeInTheDocument();
  });

  it("shows every deterministic budget category, remaining budget, and per-person cost", async () => {
    await renderWorkspace();
    const budget = screen.getByRole("region", { name: "Deterministic trip budget" });
    ["Outbound transport", "Return transport", "Accommodation", "Local transportation", "Food and beverages", "Attraction tickets", "Entertainment and activities", "Other"]
      .forEach((label) => expect(within(budget).getByText(label)).toBeInTheDocument());
    expect(within(budget).getByText("CNY 2,200 remaining")).toBeInTheDocument();
    expect(within(budget).getByText("CNY 1,400 per traveller")).toBeInTheDocument();
  });

  it("keeps the map compact, ordered, and explicit about estimated anchors", async () => {
    await renderWorkspace();
    expect(screen.getByTestId("route-map-panel")).toHaveClass("h-[280px]");
    expect(screen.getByText("Origin and hotel anchors may be estimated; POI coordinates retain their provider source.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Map marker: Palace Museum" })).toBeInTheDocument();
  });

  it("exposes owner management, invalidation, and privacy consent states", async () => {
    await renderWorkspace();
    expect(screen.getByRole("button", { name: "Rename trip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate trip" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit preferences" }));
    expect(screen.getByRole("status")).toHaveTextContent("INVALIDATED");
    expect(screen.getByRole("button", { name: "Revalidate itinerary" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Privacy and AI" }));
    expect(screen.getByRole("dialog", { name: "Privacy and AI settings" })).toHaveTextContent("travel preferences");
  });
});
