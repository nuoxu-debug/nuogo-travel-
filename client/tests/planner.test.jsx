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
    id: "run-1",
    state: "FINAL_VALIDATED",
    itineraryRun,
    validation: itineraryRun.validation,
    preview: { result: { id: "run-1", state: "FINAL_VALIDATED" }, expiresAt: "2026-10-11T00:00:00.000Z" },
    previewToken: "a".repeat(64),
    previewExpiresAt: "2026-10-11T00:00:00.000Z",
    trip: { id: "trip-1", objectiveAligned: true, destination: "singapore", startDate: "2026-10-10", endDate: "2026-10-12", travellerCount: 2, budgetMinor: 200000, travelStyle: "BALANCED", itineraryRun, persistenceScope: "PREVIEW", revision: 0 }
  };
}

function signInRegisteredTraveller() {
  localStorage.setItem("nuogo-token", "registered-token");
}

function installGenerationApi({ failure, pendingGeneration } = {}) {
  fetch.mockImplementation(async (url) => {
    if (String(url).includes("api.frankfurter.dev")) {
      const quote = String(url).split("/").pop().toUpperCase();
      return response({ rate: { MYR: 3.31, CNY: 5.39, USD: 0.77 }[quote], date: "2026-09-18" });
    }
    if (url.endsWith("/auth/me")) return response({ user: { id: "user-1", accountType: "REGISTERED", role: "user" } });
    if (url.endsWith("/trips/generate")) {
      if (pendingGeneration) return pendingGeneration.promise;
      return failure ? response(failure, false, 422) : response(validatedResult());
    }
    return response({});
  });
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

describe("Singapore preference planner", () => {
  it("redirects unauthenticated visitors before itinerary generation", async () => {
    installGenerationApi();
    render(<App initialPath="/planner" />);

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(fetch.mock.calls.find(([url]) => url.endsWith("/auth/guest"))).toBeUndefined();
    expect(fetch.mock.calls.find(([url]) => url.endsWith("/trips/generate"))).toBeUndefined();
  });

  it("redirects Guest Mode users from direct planner access to sign in", async () => {
    sessionStorage.setItem("nuogo-token", "guest-token");
    fetch.mockResolvedValueOnce(response({
      user: { id: "guest-1", accountType: "GUEST" }
    }));

    render(<App initialPath="/planner" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Please sign in or create an account to plan your trip.");
    expect(fetch.mock.calls.find(([url]) => url.endsWith("/auth/guest"))).toBeUndefined();
    expect(fetch.mock.calls.find(([url]) => url.endsWith("/trips/generate"))).toBeUndefined();
  });

  it("redirects Guest Mode users from direct trip workspace access to sign in", async () => {
    sessionStorage.setItem("nuogo-token", "guest-token");
    fetch.mockResolvedValueOnce(response({
      user: { id: "guest-1", accountType: "GUEST" }
    }));

    render(<App initialPath="/trip/trip-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Please sign in or create an account to plan your trip.");
    expect(fetch.mock.calls.find(([url]) => url.endsWith("/trips/trip-1"))).toBeUndefined();
  });

  it("shows one fixed Singapore pilot destination and the report inputs for registered travellers", async () => {
    signInRegisteredTraveller();
    installGenerationApi();
    render(<App initialPath="/planner" />);

    expect(await screen.findByTestId("planner-brief-hero")).toHaveAttribute("data-layout", "travel-brief");
    expect(screen.getByTestId("planner-brief-background")).toHaveAttribute("src", expect.stringContaining("singapore-marina-bay-hero.png"));
    expect(screen.getByText("Pilot Destination / Available Now")).toBeInTheDocument();
    expect(screen.getByText("Currently available for validated planning: Singapore")).toBeInTheDocument();
    expect(screen.getByText("More destinations coming in future releases")).toBeInTheDocument();
    expect(screen.getByLabelText("Departure point")).toHaveValue("Changi Airport");
    expect(screen.getByLabelText("Stay / end point")).toHaveValue("Hotel in Singapore");
    expect(screen.queryByRole("combobox", { name: "Destination" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Start date")).toBeRequired();
    expect(screen.getByLabelText("End date")).toBeRequired();
    expect(screen.getByRole("spinbutton", { name: "Travellers" })).toHaveValue(2);
    expect(screen.getByLabelText("Daily attraction target")).toHaveValue("2");
    expect(screen.getByRole("button", { name: /Balanced/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("checkbox", { name: /rainy-day backup/i })).not.toBeChecked();
    expect(document.body).not.toHaveTextContent(/Beijing|Shanghai|Xi'an/);
  });

  it("submits registered traveller preferences without creating a guest session", async () => {
    signInRegisteredTraveller();
    installGenerationApi();
    render(<App initialPath="/planner" />);

    await userEvent.clear(await screen.findByLabelText("Departure point"));
    await userEvent.type(screen.getByLabelText("Departure point"), "Kuala Lumpur, Malaysia");
    await userEvent.click(screen.getByRole("button", { name: "Generate ONE itinerary" }));

    const request = fetch.mock.calls.find(([url]) => url.endsWith("/trips/generate"));
    expect(fetch.mock.calls.find(([url]) => url.endsWith("/auth/guest"))).toBeUndefined();
    expect(request[1].headers.Authorization).toBe("Bearer registered-token");
    expect(JSON.parse(request[1].body)).toMatchObject({
      destination: "singapore",
      departurePoint: "Kuala Lumpur, Malaysia",
      arrivalPoint: "Hotel in Singapore",
      startDate: "2026-10-10",
      endDate: "2026-10-12",
      travellerCount: 2,
      budgetMinor: 200000,
      currency: "SGD",
      dailyAttractionTarget: 2,
      travelStyle: "BALANCED",
      rainyDayBackupEnabled: false,
      language: "en"
    });
    expect(await screen.findByText(/Validated trip workspace/)).toBeInTheDocument();
  });

  it("submits only safe fields for manually selected attractions", async () => {
    sessionStorage.setItem("nuogo-attraction-draft", JSON.stringify({
      destination: "singapore",
      mode: "MANUAL",
      selectedAttractions: [{ xid: "demo-sg-gardens", displayName: "Gardens by the Bay", provider: "untrusted" }]
    }));
    signInRegisteredTraveller();
    installGenerationApi();
    render(<App initialPath="/planner" />);

    await userEvent.click(await screen.findByRole("button", { name: "Generate ONE itinerary" }));
    const request = fetch.mock.calls.find(([url]) => url.endsWith("/trips/generate"));
    const body = JSON.parse(request[1].body);
    expect(body.selectedAttractions).toEqual([{ xid: "demo-sg-gardens", displayName: "Gardens by the Bay" }]);
    expect(body.attractionSelectionMode).toBe("MANUAL");
    expect(JSON.stringify(body)).not.toContain("untrusted");
  });

  it("shows a clear generation loading state while the itinerary is being created", async () => {
    const pendingGeneration = deferred();
    signInRegisteredTraveller();
    installGenerationApi({ pendingGeneration });
    render(<App initialPath="/planner" />);

    await userEvent.click(await screen.findByRole("button", { name: "Generate ONE itinerary" }));

    const status = await screen.findByRole("status", { name: "Generating itinerary" });
    expect(status.parentElement).toHaveStyle({ position: "fixed", zIndex: "2147483000" });
    expect(screen.getByTestId("pipeline-scenic-backdrop")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("pipeline-travel-card")).toBeInTheDocument();
    expect(screen.getByTestId("pipeline-journey-progress")).toHaveTextContent("Retrieving places");
    expect(status).toHaveTextContent("Creating your Singapore itinerary");
    expect(status).toHaveTextContent("Nuogo is retrieving source-labelled places");
    expect(status).toHaveTextContent("Do not close this page");
    expect(screen.getByRole("button", { name: "Generate ONE itinerary" })).toBeDisabled();

    pendingGeneration.resolve(response(validatedResult()));
    expect(await screen.findByText(/Validated trip workspace/)).toBeInTheDocument();
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
    signInRegisteredTraveller();
    installGenerationApi();
    render(<App initialPath="/planner" />);

    expect(await screen.findByText("试点目的地 / 现已可用")).toBeInTheDocument();
    expect(screen.getByLabelText("出发地")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "生成一份行程" }));
    const request = fetch.mock.calls.find(([url]) => url.endsWith("/trips/generate"));
    expect(JSON.parse(request[1].body).language).toBe("zh");
  });

  it("shows the returned validation reason for a constrained generation failure", async () => {
    localStorage.clear();
    signInRegisteredTraveller();
    installGenerationApi({
      failure: { error: { code: "GENERATION_CONSTRAINTS_UNSATISFIED", message: "internal", details: { issueCodes: ["DAILY_DURATION_EXCEEDED"] } } }
    });
    render(<App initialPath="/planner" />);

    await userEvent.click(await screen.findByRole("button", { name: "生成一份行程" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("无法在当前预算和旅行要求内生成有效行程");
    expect(screen.getByRole("alert")).toHaveTextContent("DAILY_DURATION_EXCEEDED");
    expect(document.body).not.toHaveTextContent("internal");
  });
});
