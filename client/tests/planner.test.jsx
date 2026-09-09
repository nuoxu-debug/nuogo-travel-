import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../src/App.jsx";
import PipelineOverlay from "../src/components/PipelineOverlay.jsx";

const response = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });

function validatedResult() {
  const day = {
    dayNumber: 1,
    date: "2026-10-10",
    startPoint: { locationId: "hotel", locationType: "HOTEL", coordinates: { lat: 1.29, lon: 103.85 } },
    endPoint: { locationId: "hotel", locationType: "HOTEL", coordinates: { lat: 1.29, lon: 103.85 } },
    activities: [],
    legs: [],
    presentation: { transport: [] }
  };
  const itineraryRun = {
    state: "FINAL_VALIDATED",
    validation: { valid: true, issues: [] },
    summary: { profile: "BALANCED", totalMinor: 120000, budgetMinor: 200000, remainingMinor: 80000, perPersonMinor: 60000, categoriesMinor: {} },
    itinerary: { travelStyle: "BALANCED", variant: "BALANCED", days: [day] }
  };
  return {
    id: "run-1", state: "FINAL_VALIDATED", itineraryRun, validation: itineraryRun.validation,
    guestClaimToken: "guest-claim-token-long-enough",
    trip: { id: "trip-1", objectiveAligned: true, destination: "singapore", startDate: "2026-10-10", endDate: "2026-10-12", travellerCount: 2, budgetMinor: 200000, travelStyle: "BALANCED", itineraryRun }
  };
}

function installGenerationApi({ failure } = {}) {
  fetch.mockImplementation(async (url) => {
    if (url.endsWith("/auth/guest")) return response({ user: { id: "guest-1", accountType: "GUEST" }, token: "guest-token" });
    if (url.endsWith("/trips/generate")) return failure ? response(failure, false, 422) : response(validatedResult());
    return response({});
  });
}

describe("Singapore preference planner", () => {
  it("shows one fixed Singapore destination and the report inputs", () => {
    render(<App initialPath="/planner" />);
    expect(screen.getByTestId("planner-brief-hero")).toHaveAttribute("data-layout", "travel-brief");
    expect(screen.getByText("Supported MVP destination")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Destination" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Start date")).toBeRequired();
    expect(screen.getByLabelText("End date")).toBeRequired();
    expect(screen.getByRole("spinbutton", { name: "Travellers" })).toHaveValue(2);
    expect(screen.getByRole("button", { name: /Balanced/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("checkbox", { name: /rainy-day backup/i })).not.toBeChecked();
    expect(document.body).not.toHaveTextContent(/Beijing|Shanghai|Xi'an|CNY/);
  });

  it("derives inclusive duration and converts SGD to minor units", async () => {
    installGenerationApi();
    render(<App initialPath="/planner" />);
    expect(screen.getByText("3 days")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Generate ONE itinerary" }));
    const request = fetch.mock.calls.find(([url]) => url.endsWith("/trips/generate"));
    expect(JSON.parse(request[1].body)).toMatchObject({ destination: "singapore", startDate: "2026-10-10", endDate: "2026-10-12", travellerCount: 2, budgetMinor: 200000, currency: "SGD", travelStyle: "BALANCED", rainyDayBackupEnabled: false, language: "en" });
  });

  it("submits only safe fields for manually selected attractions", async () => {
    sessionStorage.setItem("nuogo-attraction-draft", JSON.stringify({ destination: "singapore", mode: "MANUAL", selectedAttractions: [{ xid: "demo-sg-gardens", displayName: "Gardens by the Bay", provider: "untrusted" }] }));
    installGenerationApi();
    render(<App initialPath="/planner" />);
    await userEvent.click(screen.getByRole("button", { name: "Generate ONE itinerary" }));
    const request = fetch.mock.calls.find(([url]) => url.endsWith("/trips/generate"));
    const body = JSON.parse(request[1].body);
    expect(body.selectedAttractions).toEqual([{ xid: "demo-sg-gardens", displayName: "Gardens by the Bay" }]);
    expect(body.attractionSelectionMode).toBe("MANUAL");
    expect(JSON.stringify(body)).not.toContain("untrusted");
  });

  it("creates a guest session before generation and opens one workspace", async () => {
    installGenerationApi();
    render(<App initialPath="/planner" />);
    await userEvent.click(screen.getByRole("button", { name: "Generate ONE itinerary" }));
    expect(await screen.findByText(/Validated trip workspace/)).toBeInTheDocument();
    expect(fetch.mock.calls.find(([url]) => url.endsWith("/auth/guest"))).toBeDefined();
    const generation = fetch.mock.calls.find(([url]) => url.endsWith("/trips/generate"));
    expect(generation[1].headers.Authorization).toBe("Bearer guest-token");
    expect(sessionStorage.getItem("nuogo-guest-claim-trip-1")).toBe("guest-claim-token-long-enough");
    expect(screen.queryByRole("button", { name: /Choose this plan/i })).not.toBeInTheDocument();
  });

  it("renders real pipeline states without simulated percentages", () => {
    const { rerender } = render(<PipelineOverlay open state="PLANNING" />);
    expect(screen.getByText("Drafting your selected travel style")).toBeInTheDocument();
    rerender(<PipelineOverlay open state="FINAL_VALIDATED" />);
    expect(screen.getByText("Itinerary validated")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("uses Chinese by default and sends the selected language", async () => {
    localStorage.clear();
    installGenerationApi();
    render(<App initialPath="/planner" />);
    expect(screen.getByText("唯一支持的 MVP 目的地")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "生成一份行程" }));
    const request = fetch.mock.calls.find(([url]) => url.endsWith("/trips/generate"));
    expect(JSON.parse(request[1].body).language).toBe("zh");
  });

  it("localizes a constrained generation failure", async () => {
    localStorage.clear();
    installGenerationApi({ failure: { error: { code: "GENERATION_CONSTRAINTS_UNSATISFIED", message: "internal" } } });
    render(<App initialPath="/planner" />);
    await userEvent.click(screen.getByRole("button", { name: "生成一份行程" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("无法在当前预算和旅行要求内生成有效行程");
    expect(document.body).not.toHaveTextContent("internal");
  });
});
