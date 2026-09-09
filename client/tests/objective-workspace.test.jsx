import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";

function objectiveTrip() {
  const categoriesMinor = {
    outboundTransport: 30000,
    returnTransport: 30000,
    accommodation: 100000,
    localTransportation: 2000,
    foodAndBeverages: 60000,
    attractionTickets: 40000,
    entertainmentActivities: 10000,
    other: 8000
  };
  const attraction = (sequence, xid, name, longitude, latitude) => ({
    sequence,
    xid,
    activityType: "HISTORY",
    plannedStartTime: "10:00",
    scheduledStartTime: "10:05",
    scheduledEndTime: "11:35",
    plannedDurationMinutes: 90,
    estimatedActivityCostMinor: 6000,
    reason: "Selected from verified destination candidates.",
    poi: {
      canonicalPoiId: xid,
      name,
      city: "singapore",
      category: "ATTRACTION",
      coordinates: { longitude, latitude },
      address: "Central district",
      primarySource: "OPENTRIPMAP",
      matchStatus: "MATCHED",
      verificationStatus: "SUPPORTING_ONLY",
      sourceRecords: [{
        provider: "OPENTRIPMAP",
        sourceId: xid,
        sourceUrl: `https://opentripmap.com/en/card/${xid}`,
        retrievedAt: "2026-08-14T00:00:00.000Z"
      }]
    }
  });
  const generic = (sequence, activityType, plannedStartTime) => ({
    sequence,
    activityType,
    sourceType: activityType === "TRANSFER" || activityType === "DEPARTURE" ? "ESTIMATED" : "AI_GENERATED",
    plannedStartTime,
    scheduledStartTime: plannedStartTime,
    scheduledEndTime: plannedStartTime,
    plannedDurationMinutes: 30,
    reason: `Planned ${activityType.toLowerCase()} entry.`
  });
  const leg = (id, fromLocationId, toLocationId, durationMinutes) => ({
    id, fromLocationId, toLocationId, mode: "PUBLIC_TRANSIT",
    distanceMeters: 1200, durationMinutes, estimatedCostMinor: 300,
    routeSource: "DEMO", routeRetrievedAt: "2026-08-14T00:00:00.000Z"
  });
  const itinerary = {
    travelStyle: "BALANCED",
    trip: { origin: "Singapore", destination: "singapore", startDate: "2026-10-10", endDate: "2026-10-11", travellerCount: 2, budgetMinor: 5000 },
    days: [{
      dayNumber: 1, date: "2026-10-10", startPoint: { locationId: "origin", locationType: "ORIGIN", coordinates: { longitude: 116.3901, latitude: 39.9075 } },
      activities: [
        attraction(1, "otm-bj-forbidden-city", "Palace Museum", 116.3972, 39.9163),
        generic(2, "MEAL", "12:00"),
        generic(3, "TRANSFER", "12:30"),
        generic(4, "ACCOMMODATION", "13:00"),
        generic(5, "REST", "13:30"),
        generic(6, "DEPARTURE", "14:00"),
        attraction(7, "otm-bj-jingshan", "Jingshan Park", 116.3967, 39.9251)
      ],
      endPoint: { locationId: "hotel", locationType: "HOTEL", coordinates: { longitude: 116.405, latitude: 39.91 } },
      legs: [
        leg("leg-1", "origin", "otm-bj-forbidden-city", 5),
        leg("leg-2", "otm-bj-forbidden-city", "otm-bj-jingshan", 6),
        leg("leg-3", "otm-bj-jingshan", "hotel", 7)
      ]
    }, {
      dayNumber: 2, date: "2026-10-11", startPoint: { locationId: "hotel", locationType: "HOTEL", coordinates: { longitude: 116.405, latitude: 39.91 } },
      activities: [attraction(1, "otm-bj-temple-heaven", "Temple of Heaven", 116.4066, 39.8819)],
      endPoint: { locationId: "destination", locationType: "DESTINATION", coordinates: { longitude: 116.42, latitude: 39.9 } },
      legs: [leg("leg-4", "hotel", "otm-bj-temple-heaven", 5), leg("leg-5", "otm-bj-temple-heaven", "destination", 5)]
    }]
  };
  return {
    id: "trip-objective", destination: "singapore", startDate: "2026-10-10", endDate: "2026-10-11",
    travellerCount: 2, budgetMinor: 5000, objectiveAligned: true, revision: 0,
    selectedVariantId: "BALANCED", title: "Singapore study trip",
    preferences: { ...itinerary.trip, interests: ["HISTORY"], preferredSights: [], accommodationPreference: "MID_RANGE", foodPreference: "LOCAL", localTransportPreference: "PUBLIC_TRANSIT", activityPreferences: ["HISTORY"], arrivalDateTime: "2026-10-10T08:00:00+08:00", departureDateTime: "2026-10-11T20:00:00+08:00", outboundTransportMode: "TRAIN", returnTransportMode: "TRAIN", outboundTransportCostCny: 300, returnTransportCostCny: 300, otherPreferences: "", language: "en", consentToLlmProcessing: true },
    variants: [{ state: "FINAL_VALIDATED", itinerary, summary: { profile: "BALANCED", categoriesMinor, totalMinor: 280000, budgetMinor: 500000, remainingMinor: 220000, perPersonMinor: 140000, provenance: { attractionTickets: { id: "cost-attraction" } } }, validation: { valid: true, issues: [] } }]
  };
}

function singleRunTrip() {
  const trip = objectiveTrip();
  trip.itineraryRun = trip.variants[0];
  delete trip.variants;
  delete trip.selectedVariantId;
  return trip;
}

async function renderWorkspace(trip = singleRunTrip()) {
  localStorage.setItem("nuogo-token", "test-token");
  sessionStorage.setItem("nuogo-trip-trip-objective", JSON.stringify(trip));
  fetch.mockResolvedValue({ ok: true, json: async () => ({ user: { id: "user-1", name: "Student", email: "student@nuogo.test" } }) });
  render(<App initialPath="/trip/trip-objective" />);
  return screen.findByRole("heading", { name: "Singapore study trip" });
}

describe("validated itinerary workspace", () => {
  it("shows the selected Travel Style from the current one-run contract", async () => {
    await renderWorkspace();
    expect(screen.getByText(/Validated trip workspace/)).toHaveTextContent("Balanced");
  });
  it("requires an explicit registered-account save to claim a guest itinerary", async () => {
    localStorage.setItem("nuogo-token", "registered-token");
    sessionStorage.setItem("nuogo-guest-claim-trip-objective", "guest-claim-token-long-enough");
    sessionStorage.setItem("nuogo-trip-trip-objective", JSON.stringify(singleRunTrip()));
    fetch.mockImplementation(async (url, options = {}) => {
      if (url.endsWith("/auth/me")) return { ok: true, json: async () => ({ user: { id: "user-1", accountType: "REGISTERED" } }) };
      if (url.endsWith("/trips/trip-objective/claim") && options.method === "POST") {
        return { ok: true, json: async () => ({ trip: { ...singleRunTrip(), persistenceScope: "PERSISTENT" } }) };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App initialPath="/trip/trip-objective" />);
    await userEvent.click(await screen.findByRole("button", { name: "Save itinerary to my account" }));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/trips/trip-objective/claim"),
      expect.objectContaining({ method: "POST", body: JSON.stringify({ claimToken: "guest-claim-token-long-enough" }) })
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Itinerary saved to your account");
    expect(sessionStorage.getItem("nuogo-guest-claim-trip-objective")).toBeNull();
  });
  it("renders saved objective trips in the archive", async () => {
    localStorage.setItem("nuogo-token", "test-token");
    fetch.mockImplementation(async (url) => {
      if (url.endsWith("/auth/me")) return { ok: true, json: async () => ({ user: { id: "user-1", name: "Student", email: "student@nuogo.test" } }) };
      if (url.endsWith("/trips")) return { ok: true, json: async () => ({ trips: [{ ...objectiveTrip(), status: "draft" }] }) };
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<App initialPath="/archive" />);
    expect(await screen.findByRole("heading", { name: "Singapore study trip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open itinerary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Duplicate" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Favorite places" })).not.toBeInTheDocument();
  });

  it("duplicates a saved objective trip from the archive", async () => {
    const source = { ...singleRunTrip(), status: "draft" };
    const copy = { ...singleRunTrip(), id: "trip-copy", title: "Singapore study trip (copy)", status: "draft" };
    localStorage.setItem("nuogo-token", "test-token");
    fetch.mockImplementation(async (url, options = {}) => {
      if (url.endsWith("/auth/me")) return { ok: true, json: async () => ({ user: { id: "user-1", name: "Student", email: "student@nuogo.test" } }) };
      if (url.endsWith("/trips") && !options.method) return { ok: true, json: async () => ({ trips: [source] }) };
      if (url.endsWith("/trips/trip-objective/duplicate") && options.method === "POST") return { ok: true, json: async () => ({ trip: copy }) };
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App initialPath="/archive" />);
    await userEvent.click(await screen.findByRole("button", { name: "Duplicate" }));

    expect(await screen.findByRole("heading", { name: "Singapore study trip (copy)" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/trips/trip-objective/duplicate"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("renders saved trip actions in Chinese", async () => {
    localStorage.setItem("nuogo-language", "zh");
    localStorage.setItem("nuogo-language-default", "zh-v4");
    localStorage.setItem("nuogo-token", "test-token");
    fetch.mockImplementation(async (url) => {
      if (url.endsWith("/auth/me")) return { ok: true, json: async () => ({ user: { id: "user-1", name: "Student", email: "student@nuogo.test" } }) };
      if (url.endsWith("/trips")) return { ok: true, json: async () => ({ trips: [{ ...objectiveTrip(), status: "draft" }] }) };
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App initialPath="/archive" />);

    expect(await screen.findByRole("button", { name: "打开行程" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复用偏好" })).toBeInTheDocument();
    expect(screen.getByText("已验证")).toBeInTheDocument();
  });

  it("deletes an owned objective trip through the API", async () => {
    await renderWorkspace();
    fetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });
    await userEvent.click(screen.getByRole("button", { name: "Delete trip" }));
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/trips/trip-objective"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("opens a new single-run record without a profile-selection step", async () => {
    await renderWorkspace(singleRunTrip());
    expect(screen.getByText(/Validated trip workspace/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choose this plan" })).not.toBeInTheDocument();
  });

  it("shows rainy-day alternatives as inactive contingencies without replacing the main activity", async () => {
    const trip = singleRunTrip();
    trip.itineraryRun.rainyDayBackups = [{
      dayNumber: 1,
      activitySequence: 1,
      replacesXid: "otm-bj-forbidden-city",
      estimatedCostMinor: 3000,
      costSourceType: "ESTIMATED",
      alternative: {
        xid: "otm-bj-capital-museum",
        displayName: { en: "Capital Museum", zh: "首都博物馆" },
        primarySource: "OPENTRIPMAP"
      }
    }];

    await renderWorkspace(trip);

    const contingency = screen.getByRole("region", { name: "Rainy-day contingency" });
    expect(contingency).toHaveTextContent("inactive");
    expect(contingency).toHaveTextContent("never replaces the original activity automatically");
    expect(contingency).toHaveTextContent("Capital Museum");
    expect(contingency).toHaveTextContent("Unused contingency costs are excluded from the itinerary total");
    expect(screen.getByRole("button", { name: /Palace Museum details/ })).toBeInTheDocument();
  });

  it("shows xid-grounded attractions while keeping generic entries ungrounded", async () => {
    await renderWorkspace();
    const timeline = screen.getByRole("region", { name: "Day 1 continuous itinerary" });

    expect(within(timeline).getAllByText(/1\.2 km/).map((element) => element.textContent.match(/\d+ min$/)[0])).toEqual([
      "5 min",
      "6 min",
      "7 min"
    ]);
    expect(within(timeline).getByRole("button", { name: /Palace Museum/ })).toHaveTextContent("OpenTripMap facts");
    ["Meal", "Transfer", "Accommodation", "Rest", "Departure"].forEach((label) => {
      expect(within(timeline).getByRole("button", { name: `${label} details` })).not.toHaveTextContent("OpenTripMap facts");
    });

    await userEvent.click(within(timeline).getByRole("button", { name: /Palace Museum/ }));
    expect(screen.getByRole("dialog", { name: "Palace Museum details" })).toHaveTextContent("Source-matched activity");
    expect(screen.getByText("otm-bj-forbidden-city", { selector: "dd" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await userEvent.click(within(timeline).getByRole("button", { name: "Meal details" }));
    expect(screen.getByRole("dialog", { name: "Meal details" })).toHaveTextContent("Schedule entry");
    expect(screen.getByRole("dialog", { name: "Meal details" })).not.toHaveTextContent("Source-matched activity");
  });

  it("labels a deterministic rainy-day alternative as demo evidence", async () => {
    const trip = singleRunTrip();
    trip.itineraryRun.rainyDayBackups = [{
      dayNumber: 1,
      activitySequence: 1,
      replacesXid: "demo-sg-gardens-by-the-bay",
      estimatedCostMinor: 3000,
      costSourceType: "ESTIMATED",
      alternative: {
        xid: "demo-sg-national-gallery",
        displayName: { en: "National Gallery Singapore", zh: "新加坡国家美术馆" },
        primarySource: "DEMO_FIXTURE"
      }
    }];

    await renderWorkspace(trip);

    const contingency = screen.getByRole("region", { name: "Rainy-day contingency" });
    expect(contingency).toHaveTextContent("Source: Demo fixture");
    expect(contingency).not.toHaveTextContent("Source: OpenTripMap API");
  });

  it("shows validation evidence only from the validated itinerary response", async () => {
    await renderWorkspace();

    const evidence = await screen.findByRole("region", { name: "Itinerary validation summary" });
    expect(within(evidence).getByText("Validated")).toBeVisible();
    expect(within(evidence).getByText("Within hard budget")).toBeVisible();
    expect(within(evidence).getByText("Grounded attractions: 3")).toBeVisible();
  });

  it("does not badge a generic entry with embedded provider records", async () => {
    const trip = objectiveTrip();
    trip.variants[0].itinerary.days[0].activities[1].poi = {
      primarySource: "OPENTRIPMAP",
      sourceRecords: [{ provider: "OPENTRIPMAP", sourceId: "embedded" }]
    };
    await renderWorkspace(trip);

    const timeline = screen.getByRole("region", { name: "Day 1 continuous itinerary" });
    expect(within(timeline).getByRole("button", { name: "Meal details" })).not.toHaveTextContent("OpenTripMap facts");
  });

  it("selects provider facts by activity xid instead of source-record order", async () => {
    const trip = objectiveTrip();
    const records = trip.variants[0].itinerary.days[0].activities[0].poi.sourceRecords;
    records.unshift({
      provider: "OPENTRIPMAP",
      sourceId: "otm-bj-other",
      sourceUrl: "https://opentripmap.com/en/card/otm-bj-other",
      retrievedAt: "2026-08-15T00:00:00.000Z"
    });
    await renderWorkspace(trip);

    const timeline = screen.getByRole("region", { name: "Day 1 continuous itinerary" });
    await userEvent.click(within(timeline).getByRole("button", { name: /Palace Museum/ }));
    const dialog = screen.getByRole("dialog", { name: "Palace Museum details" });
    expect(within(dialog).getByRole("link", { name: "View OpenTripMap record" }))
      .toHaveAttribute("href", "https://opentripmap.com/en/card/otm-bj-forbidden-city");
    expect(dialog).toHaveTextContent("2026-08-14T00:00:00.000Z");
  });

  it("separates OpenTripMap provider facts, AI rationale, and deterministic estimates without current-data claims", async () => {
    await renderWorkspace();
    const timeline = screen.getByRole("region", { name: "Day 1 continuous itinerary" });
    const attraction = within(timeline).getByRole("button", { name: /Palace Museum/ });

    expect(attraction).toHaveTextContent("OpenTripMap facts");
    expect(attraction).toHaveTextContent("AI rationale");
    expect(attraction).toHaveTextContent("Estimate");
    expect(within(timeline).getAllByRole("group", { name: "Travel estimate" })).toHaveLength(3);

    await userEvent.click(attraction);
    const dialog = screen.getByRole("dialog", { name: "Palace Museum details" });
    const providerFacts = within(dialog).getByRole("region", { name: "OpenTripMap provider facts" });
    const rationale = within(dialog).getByRole("region", { name: "AI rationale" });
    const estimate = within(dialog).getByRole("region", { name: "Deterministic estimate" });

    expect(providerFacts).toHaveTextContent("otm-bj-forbidden-city");
    expect(providerFacts).toHaveTextContent("Matched");
    expect(providerFacts).toHaveTextContent("Supporting information");
    expect(providerFacts).not.toHaveTextContent("SUPPORTING_ONLY");
    expect(within(providerFacts).getByRole("link", { name: "View OpenTripMap record" }))
      .toHaveAttribute("href", "https://opentripmap.com/en/card/otm-bj-forbidden-city");
    expect(rationale).toHaveTextContent("Selected from verified destination candidates.");
    expect(estimate).toHaveTextContent("S$ 60 estimated entry");
    expect(dialog).not.toHaveTextContent(/real[- ]time|currently verified/i);
  });

  it("shows every deterministic budget category, remaining budget, and per-person cost", async () => {
    await renderWorkspace();
    const budget = screen.getByRole("region", { name: "Deterministic trip budget" });
    ["Accommodation", "Local transportation", "Food and beverages", "Attraction tickets", "Entertainment and activities", "Other"]
      .forEach((label) => expect(within(budget).getByText(label)).toBeInTheDocument());
    expect(within(budget).queryByText("Outbound transport")).not.toBeInTheDocument();
    expect(within(budget).queryByText("Return transport")).not.toBeInTheDocument();
    expect(within(budget).getByText("S$ 2,200 remaining")).toBeInTheDocument();
    expect(within(budget).getByText("S$ 1,400 per traveller")).toBeInTheDocument();
    expect(within(budget).getByText("Database-backed cost references")).toBeInTheDocument();
  });

  it("keeps the map compact, ordered, and explicit about estimated anchors", async () => {
    await renderWorkspace();
    expect(screen.getByTestId("route-map-panel")).toHaveClass("h-[280px]");
    expect(screen.getByText("Origin and hotel anchors may be estimated; POI coordinates retain their provider source.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Map marker: Palace Museum" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Map marker: Start: Departure point" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Map marker: End: Accommodation" })).toBeInTheDocument();
  });

  it("maps only grounded attractions and selects them by xid", async () => {
    await renderWorkspace();
    expect(screen.getByRole("button", { name: "Map marker: Palace Museum" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Map marker: Jingshan Park" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Map marker: Meal" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Map marker: Jingshan Park" }));
    expect(screen.getByRole("dialog", { name: "Jingshan Park details" })).toBeInTheDocument();
  });

  it("exposes owner management, invalidation, and privacy consent states", async () => {
    await renderWorkspace();
    expect(screen.getByRole("button", { name: "Rename trip" })).toBeInTheDocument();
    vi.spyOn(window, "prompt").mockReturnValue("Singapore graduation trip");
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ trip: { ...objectiveTrip(), title: "Singapore graduation trip", revision: 1 }, revision: 1 }) });
    await userEvent.click(screen.getByRole("button", { name: "Rename trip" }));
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/trips/trip-objective"),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(await screen.findByRole("heading", { name: "Singapore graduation trip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate trip" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit preferences" }));
    expect(screen.getByRole("status")).toHaveTextContent("Needs revalidation");
    expect(screen.getByRole("status")).not.toHaveTextContent("INVALIDATED");
    expect(screen.getByRole("button", { name: "Revalidate itinerary" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Privacy and AI" }));
    expect(screen.getByRole("dialog", { name: "Privacy and AI settings" })).toHaveTextContent("travel preferences");
  });

  it("edits an itinerary entry and consumes the returned revision", async () => {
    const updated = objectiveTrip();
    updated.revision = 1;
    updated.variants[0].itinerary.days[0].activities[0].plannedDurationMinutes = 45;
    await renderWorkspace();
    await userEvent.click(screen.getByRole("button", { name: "Palace Museum details" }));
    await userEvent.clear(screen.getByRole("spinbutton", { name: "Duration in minutes" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "Duration in minutes" }), "45");
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ trip: updated, revision: 1 }) });
    await userEvent.click(screen.getByRole("button", { name: "Save entry changes" }));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/trips/trip-objective/entries/BALANCED%3A1%3A1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          expectedRevision: 0,
          plannedStartTime: "10:00",
          plannedDurationMinutes: 45
        })
      })
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Entry saved and itinerary revalidated");
    expect(JSON.parse(sessionStorage.getItem("nuogo-trip-trip-objective")).revision).toBe(1);
  });

  it("keeps the entry editor open and explains a rejected edit", async () => {
    await renderWorkspace();
    await userEvent.click(screen.getByRole("button", { name: "Palace Museum details" }));
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        error: {
          code: "ITINERARY_EDIT_INVALID",
          message: "The itinerary edit violates the saved trip constraints.",
          details: { issueCodes: ["TRAVEL_TIME_CONFLICT"] }
        }
      })
    });
    await userEvent.click(screen.getByRole("button", { name: "Save entry changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This time conflicts with the route.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("TRAVEL_TIME_CONFLICT");
    expect(screen.getByRole("dialog", { name: "Palace Museum details" })).toBeInTheDocument();
  });

  it("creates a linked version from a changed hard budget", async () => {
    const child = { ...singleRunTrip(), id: "trip-child", parentTripId: "trip-objective", revision: 0 };
    await renderWorkspace();
    await userEvent.click(screen.getByRole("button", { name: "Edit preferences" }));
    const budget = screen.getByRole("spinbutton", { name: "Hard budget in SGD" });
    await userEvent.clear(budget);
    await userEvent.type(budget, "6000");
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        trip: child,
        itineraryRun: child.itineraryRun,
        validation: child.validation,
        state: "FINAL_VALIDATED"
      })
    });
    await userEvent.click(screen.getByRole("button", { name: "Create new trip version" }));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/trips/trip-objective/regenerate"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ expectedRevision: 0, preferences: { budgetMinor: 6000 } })
      })
    );
    expect(sessionStorage.getItem("nuogo-trip-trip-objective")).not.toBeNull();
    expect(JSON.parse(sessionStorage.getItem("nuogo-trip-trip-child")).parentTripId).toBe("trip-objective");
  });

  it("renders the validated workspace controls and budget in Chinese", async () => {
    localStorage.setItem("nuogo-language", "zh");
    localStorage.setItem("nuogo-language-default", "zh-v4");
    await renderWorkspace();

    expect(screen.getByRole("button", { name: "重命名行程" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "第 1 天连续行程" })).toHaveTextContent("起点 · 出发地");
    const budget = screen.getByRole("region", { name: "系统计算的行程预算" });
    expect(within(budget).getByText("景点门票")).toBeInTheDocument();
    expect(within(budget).getByText("剩余 S$ 2,200")).toBeInTheDocument();
    expect(within(budget).getByText("每人 S$ 1,400")).toBeInTheDocument();
  });

  it("localizes provider facts, AI rationale, and estimate labels in Chinese", async () => {
    localStorage.setItem("nuogo-language", "zh");
    localStorage.setItem("nuogo-language-default", "zh-v4");
    await renderWorkspace();

    const timeline = screen.getByRole("region", { name: "第 1 天连续行程" });
    const attraction = within(timeline).getByRole("button", { name: "Palace Museum详情" });
    expect(attraction).toHaveTextContent("OpenTripMap 提供方资料");
    expect(attraction).toHaveTextContent("AI 生成理由");
    expect(attraction).toHaveTextContent("估算");

    await userEvent.click(attraction);
    const dialog = screen.getByRole("dialog", { name: "Palace Museum详情" });
    expect(within(dialog).getByRole("region", { name: "OpenTripMap 提供方资料" })).toHaveTextContent("辅助资料");
    expect(within(dialog).getByRole("region", { name: "AI 生成理由" })).toBeInTheDocument();
    expect(within(dialog).getByRole("region", { name: "确定性估算" })).toBeInTheDocument();
  });
});
