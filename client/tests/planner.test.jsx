import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";
import PipelineOverlay from "../src/components/PipelineOverlay.jsx";

function validatedResult() {
  const profiles = ["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"];
  return {
    id: "run-1",
    state: "FINAL_VALIDATED",
    trip: {
      id: "trip-1",
      destination: "beijing",
      startDate: "2026-10-10",
      endDate: "2026-10-11",
      travellerCount: 2,
      totalBudgetCny: 5000
    },
    variants: profiles.map((profile, index) => ({
      state: "FINAL_VALIDATED",
      validation: { valid: true, issues: [] },
      summary: {
        profile,
        totalFen: 300000 + index * 10000,
        budgetFen: 500000,
        remainingFen: 200000 - index * 10000,
        perPersonFen: 150000 + index * 5000,
        categoriesFen: {
          outboundTransport: 30000,
          returnTransport: 30000,
          accommodation: 100000,
          localTransportation: 20000,
          foodAndBeverages: 60000,
          attractionTickets: 40000,
          entertainmentActivities: 10000,
          other: 10000
        }
      },
      variantMetrics: {
        activityCount: 8 + index,
        attractionCount: 6,
        mealCount: 2 + index,
        tripLegCount: 10 + index,
        walkingDistanceMeters: index === 0 ? 4200 : index === 1 ? 1800 : 0,
        transportDistribution: index === 0
          ? { WALK: 4, PUBLIC_TRANSIT: 6 }
          : index === 1
            ? { PUBLIC_TRANSIT: 7, TAXI: 4 }
            : { TAXI: 12 },
        accommodationTier: ["BUDGET", "MID_RANGE", "COMFORT"][index],
        foodTier: ["ECONOMY", "BALANCED", "COMFORT"][index],
        pace: ["ACTIVE", "MODERATE", "RELAXED"][index],
        differences: [
          `${index === 0 ? 10 : index === 1 ? 7 : 0} value-oriented local legs`,
          `${["Budget", "Mid-range", "Comfort"][index]} accommodation estimate`,
          `${["Lower", "Balanced", "Higher"][index]} meal allowance`
        ],
        daySummaries: [{
          dayNumber: 1,
          date: "2026-10-10",
          activityCount: 2,
          mealCount: 1,
          tripLegCount: 4,
          items: [
            { type: "START", label: "Origin" },
            { type: "LEG", label: "25 min public transit", routeSource: "AMAP" },
            { type: "ACTIVITY", label: `Verified place ${index + 1}`, startTime: "10:00" },
            { type: "MEAL", label: "Local lunch", startTime: "12:30" },
            { type: "END", label: "Hotel" }
          ]
        }]
      },
      itinerary: {
        variant: profile,
        trip: {
          origin: "Shanghai",
          destination: "beijing",
          startDate: "2026-10-10",
          endDate: "2026-10-11",
          travellerCount: 2,
          totalBudgetCny: 5000
        },
        days: [{
          dayNumber: 1,
          date: "2026-10-10",
          startPoint: { locationId: "origin", locationType: "ORIGIN" },
          activities: [{
            sequence: 1,
            poiId: `candidate:beijing:${index}`,
            activityType: "HISTORY",
            plannedStartTime: "10:00",
            plannedDurationMinutes: 90,
            reason: "Grounded stop",
            poi: { name: `Verified place ${index + 1}`, primarySource: "AMAP" }
          }],
          endPoint: { locationId: "destination", locationType: "DESTINATION" },
          legs: []
        }]
      }
    })),
    validation: { valid: true, issues: [] }
  };
}

describe("objective-aligned China preference planner", () => {
  it("renders every server pipeline state without inventing progress percentages", () => {
    const { rerender } = render(<PipelineOverlay open state="PLANNING" />);
    expect(screen.getByText("Drafting three travel profiles")).toBeInTheDocument();
    rerender(<PipelineOverlay open state="VALIDATING" />);
    expect(screen.getByText("Validating routes, time, and budget")).toBeInTheDocument();
    rerender(<PipelineOverlay open state="REPAIRING" />);
    expect(screen.getByText("Repairing a constrained draft")).toBeInTheDocument();
    rerender(<PipelineOverlay open state="FAILED" />);
    expect(screen.getByText("No safe itinerary was produced")).toBeInTheDocument();
    rerender(<PipelineOverlay open state="FINAL_VALIDATED" />);
    expect(screen.getByText("Three plans validated")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    rerender(<PipelineOverlay open state="RETRIEVING" language="zh" />);
    expect(screen.getByRole("dialog", { name: "正在生成行程" }))
      .toHaveTextContent("正在获取带来源标识的旅行资料");
  });

  it("offers only the three assessed destinations and all mandatory input groups", () => {
    render(<App initialPath="/planner" />);
    const destination = screen.getByRole("combobox", { name: "Destination" });
    expect(within(destination).getAllByRole("option").map(({ value }) => value))
      .toEqual(["beijing", "shanghai", "xian"]);
    expect(screen.getByRole("textbox", { name: "Origin" })).toHaveValue("Shanghai");
    expect(screen.getByLabelText("Arrival date and time")).toBeRequired();
    expect(screen.getByLabelText("Departure date and time")).toBeRequired();
    expect(screen.getByRole("spinbutton", { name: "Travellers" })).toHaveValue(2);
    expect(screen.getByRole("checkbox", { name: /allow Nuogo to send/i })).toBeChecked();
    expect(screen.queryByRole("textbox", { name: /chat/i })).not.toBeInTheDocument();
  });

  it("summarises live route, dates, party, interests, and hard budget", async () => {
    render(<App initialPath="/planner" />);
    const horizon = screen.getByRole("region", { name: "Trip brief progress" });
    ["Origin", "Destination", "Dates", "Travel party", "Interests", "Budget"]
      .forEach((label) => expect(within(horizon).getByText(label)).toBeInTheDocument());
    expect(within(horizon).getByText("Shanghai to Beijing")).toBeInTheDocument();
    expect(within(horizon).getByText("CNY 5,000 total")).toBeInTheDocument();

    await userEvent.clear(screen.getByRole("textbox", { name: "Origin" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Origin" }), "Hangzhou");
    expect(within(horizon).getByText("Hangzhou to Beijing")).toBeInTheDocument();
  });

  it("shows fuel consumption only when a driving leg needs calculation", async () => {
    render(<App initialPath="/planner" />);
    expect(screen.queryByLabelText("Fuel consumption (L/100 km)")).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Outbound transport"), "DRIVING");
    await userEvent.clear(screen.getByLabelText("Outbound transport cost (CNY)"));
    expect(screen.getByLabelText("Fuel consumption (L/100 km)")).toBeInTheDocument();
  });

  it("establishes a guest session before generating from the public planner", async () => {
    fetch.mockImplementation(async (url, _options = {}) => {
      if (url.endsWith("/auth/guest")) {
        return {
          ok: true,
          json: async () => ({
            user: { id: "guest-1", name: "Nuogo Guest", email: "guest@nuogo.local" },
            token: "guest-token"
          })
        };
      }
      if (url.endsWith("/trips/generate")) {
        return { ok: true, json: async () => validatedResult() };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<App initialPath="/planner" />);
    await userEvent.click(screen.getByRole("button", { name: "Generate 3 validated plans" }));

    expect(await screen.findByText("Three travel profiles. One hard budget.")).toBeInTheDocument();
    const guestCall = fetch.mock.calls.find(([url]) => url.endsWith("/auth/guest"));
    const generationCall = fetch.mock.calls.find(([url]) => url.endsWith("/trips/generate"));
    expect(guestCall).toBeDefined();
    expect(generationCall[1].headers.Authorization).toBe("Bearer guest-token");
  });

  it("uses pending and server-confirmed states without simulated timers", async () => {
    let resolveRequest;
    const response = new Promise((resolve) => { resolveRequest = resolve; });
    localStorage.setItem("nuogo-token", "test-token");
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { id: "user-1", name: "Student", email: "student@nuogo.test" } }) })
      .mockReturnValueOnce(response);
    const intervalSpy = vi.spyOn(window, "setInterval");
    render(<App initialPath="/planner" />);
    await userEvent.click(screen.getByRole("button", { name: "Generate 3 validated plans" }));
    expect(await screen.findByRole("dialog", { name: "Generating itinerary" })).toHaveTextContent(
      "Retrieving source-labelled travel data"
    );
    expect(intervalSpy.mock.calls.some(([, delay]) => delay === 45)).toBe(false);

    resolveRequest({ ok: true, json: async () => validatedResult() });
    expect(await screen.findByText("Three travel profiles. One hard budget.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Choose this plan" })).toHaveLength(3);
    expect(screen.getAllByText("Sources: AMAP")).toHaveLength(3);
    expect(screen.getAllByText(/hard budget CNY 5,000/)).toHaveLength(3);
    expect(screen.getByText("8 events")).toBeInTheDocument();
    expect(screen.getByText("Budget stay")).toBeInTheDocument();
    expect(screen.getByText("10 value-oriented local legs")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Preview Budget-saving/i })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText(/25 min public transit/)).toHaveLength(3);
    const request = fetch.mock.calls.find(([url]) => url.includes("/trips/generate"));
    const body = JSON.parse(request[1].body);
    expect(body).toMatchObject({
      origin: "Shanghai",
      destination: "beijing",
      travellerCount: 2,
      totalBudgetCny: 5000,
      language: "en",
      consentToLlmProcessing: true
    });
    expect(body.arrivalDateTime).toMatch(/\+08:00$/);
    expect(body).not.toHaveProperty("days");
    expect(body).not.toHaveProperty("groupType");
  });

  it("renders the planner in Chinese and sends Chinese as the AI language", async () => {
    localStorage.setItem("nuogo-language", "zh");
    localStorage.setItem("nuogo-language-default", "zh-v4");
    fetch.mockImplementation(async (url) => {
      if (url.endsWith("/auth/guest")) {
        return {
          ok: true,
          json: async () => ({
            user: { id: "guest-1", name: "Nuogo 访客", email: "guest@nuogo.local" },
            token: "guest-token"
          })
        };
      }
      if (url.endsWith("/trips/generate")) {
        return { ok: true, json: async () => validatedResult() };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<App initialPath="/planner" />);

    expect(screen.getByText("路线与时间")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "出发地" })).toHaveValue("上海");
    expect(screen.getByRole("region", { name: "行程概览" })).toHaveTextContent("上海到北京");
    expect(screen.getByRole("button", { name: "生成 3 套已验证方案" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "生成 3 套已验证方案" }));

    const request = fetch.mock.calls.find(([url]) => url.includes("/trips/generate"));
    expect(JSON.parse(request[1].body).language).toBe("zh");
    expect(await screen.findByRole("heading", { name: "三套旅行方案，共用一个总预算。" }))
      .toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "选择此方案" })).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "省钱优先" })).toBeInTheDocument();
  });
});
