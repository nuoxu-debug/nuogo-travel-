import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";
import { demoMembers, demoTrip } from "./fixtures.js";

const ownerAccess = { role: "owner", canEdit: true, isOwner: true };

function response(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

function authenticatedRead(url, options = {}) {
  if (url.endsWith("/auth/me")) {
    return response({
      user: { id: "user-1", name: "Chen Yu", email: "owner@nuogo.test" }
    });
  }
  if (url.endsWith("/trips/trip-1") && !options.method) {
    return response({
      trip: JSON.parse(sessionStorage.getItem("nuogo-trip-trip-1")),
      access: ownerAccess
    });
  }
  if (url.endsWith("/trips/trip-1/members") && !options.method) {
    return response({ members: demoMembers() });
  }
  return null;
}

describe("comparison and editable workspace", () => {
  beforeEach(() => {
    localStorage.setItem("nuogo-token", "owner-token");
    sessionStorage.setItem("nuogo-trip-trip-1", JSON.stringify(demoTrip()));
    fetch.mockImplementation(async (url, options = {}) => {
      const read = authenticatedRead(url, options);
      if (read) return read;
      throw new Error(`Unexpected request: ${url}`);
    });
  });

  it("compares three variants and selects one", async () => {
    fetch.mockImplementation(async (url, options = {}) => {
      const read = authenticatedRead(url, options);
      if (read) return read;
      if (url.endsWith("/select-variant") && options.method === "POST") {
        return response({
          trip: { ...demoTrip(), selectedVariantId: "variant-food", revision: 1 },
          revision: 1
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<App initialPath="/compare/trip-1" />);
    expect(await screen.findAllByRole("heading", { level: 2, name: /4 day itinerary/i }))
      .toHaveLength(3);
    const overview = screen.getByRole("region", { name: "Plan comparison overview" });
    expect(within(overview).getByText("¥4,800 hard budget")).toBeInTheDocument();
    ["Accommodation", "Transport", "Food", "Attractions", "Entertainment", "Other"]
      .forEach((category) => expect(within(overview).getByText(category)).toBeInTheDocument());

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
      "Budget Backpack: 4 day itinerary",
      "Food-Focused: 4 day itinerary",
      "Slow Leisure: 4 day itinerary"
    ]);

    const chooseButtons = await screen.findAllByRole("button", { name: "Choose this plan" });
    fireEvent.focus(chooseButtons[1]);
    expect(cards[1]).toHaveAttribute("data-active", "true");
    expect(cards.every((card) => card.isConnected)).toBe(true);

    await userEvent.click(chooseButtons[1]);
    expect(await screen.findByText("Trip workspace", {}, { timeout: 5_000 })).toBeInTheDocument();
    expect(screen.getByText("Food-Focused: 4 day itinerary")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/trips/trip-1/select-variant",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          variantId: "variant-food",
          expectedRevision: 0
        })
      })
    );
    expect(JSON.parse(sessionStorage.getItem("nuogo-trip-trip-1")).revision).toBe(1);
  });

  it("shows a recovery action when package selection fails", async () => {
    fetch.mockImplementation(async (url, options = {}) => {
      const read = authenticatedRead(url, options);
      if (read) return read;
      if (url.endsWith("/select-variant") && options.method === "POST") {
        return response({
          error: { code: "NOT_FOUND", message: "Trip was not found." }
        }, { ok: false, status: 404 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App initialPath="/compare/trip-1" />);
    await userEvent.click((await screen.findAllByRole("button", { name: "Choose this plan" }))[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Trip was not found.");
    expect(screen.getByRole("link", { name: "Create new plans" })).toHaveAttribute("href", "/planner");
  });

  it("shows source attribution for a grounded attraction", async () => {
    const trip = demoTrip();
    Object.assign(trip.variants[0].days[0].activities[0], {
      sourceAttractionId: "approved-1",
      sourceProvider: "Mafengwo",
      sourceUrl: "https://m.mafengwo.cn/poi/approved-1.html",
      locationIsEstimated: true
    });
    sessionStorage.setItem("nuogo-trip-trip-1", JSON.stringify(trip));

    render(<App initialPath="/trip/trip-1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit Jinli Ancient Street" }));
    expect(screen.getByRole("link", { name: "View Mafengwo source" }))
      .toHaveAttribute("href", "https://m.mafengwo.cn/poi/approved-1.html");
    expect(screen.getByText("Estimated location")).toBeInTheDocument();
    expect(screen.getByText("Interactive map · some locations estimated")).toBeInTheDocument();
  });

  it("shows grounded attraction images, visit facts, and an image fallback", async () => {
    const trip = demoTrip();
    Object.assign(trip.variants[0].days[0].activities[0], {
      sourceAttractionId: "approved-1",
      sourceProvider: "Mafengwo",
      sourceUrl: "https://m.mafengwo.cn/poi/approved-1.html",
      imageUrl: "/api/attractions/approved-1/image",
      imageAttribution: "Image source: Mafengwo",
      visitDetails: {
        suggestedDuration: { en: "1-2 hours", zh: "1-2\u5c0f\u65f6" },
        bestTime: { en: "Early morning", zh: "\u6e05\u6668" },
        openingHours: {
          en: "Confirm current scenic-area hours.",
          zh: "\u8bf7\u786e\u8ba4\u666f\u533a\u6700\u65b0\u5f00\u653e\u65f6\u95f4\u3002"
        },
        ticketAdvice: {
          en: "Confirm current ticket rules.",
          zh: "\u8bf7\u786e\u8ba4\u6700\u65b0\u95e8\u7968\u89c4\u5219\u3002"
        },
        popularity: { reviews: 1234, travelNotes: 56, images: 789 },
        highlights: {
          en: ["Mountain views", "Ancient pines"],
          zh: ["\u5c71\u5cb3\u98ce\u5149", "\u9ec4\u5c71\u5947\u677e"]
        }
      }
    });
    sessionStorage.setItem("nuogo-trip-trip-1", JSON.stringify(trip));

    render(<App initialPath="/trip/trip-1" />);

    const images = await screen.findAllByRole("img", { name: "Jinli Ancient Street" });
    expect(images.some((image) => image.getAttribute("loading") === "lazy")).toBe(true);
    expect(screen.getByText("1-2 hours")).toBeInTheDocument();
    expect(screen.getByText("Early morning")).toBeInTheDocument();
    expect(screen.getByText("1,234 reviews")).toBeInTheDocument();
    expect(screen.getByText("Mountain views")).toBeInTheDocument();
    expect(screen.getByText("Image source: Mafengwo")).toBeInTheDocument();

    fireEvent.error(images[0]);
    expect(screen.getByText("Image unavailable")).toBeInTheDocument();
  });

  it("uses compact workspace panels so map and guide details do not dominate the daily view", async () => {
    const trip = demoTrip();
    Object.assign(trip.variants[0].days[0].activities[0], {
      imageUrl: "/api/attractions/approved-1/image",
      imageAttribution: "Image source: Mafengwo",
      visitDetails: {
        suggestedDuration: { en: "1-2 hours", zh: "1-2\u5c0f\u65f6" },
        bestTime: { en: "Early morning", zh: "\u6e05\u6668" },
        openingHours: {
          en: "Confirm current scenic-area hours.",
          zh: "\u8bf7\u786e\u8ba4\u666f\u533a\u6700\u65b0\u5f00\u653e\u65f6\u95f4\u3002"
        },
        ticketAdvice: {
          en: "Confirm current ticket rules.",
          zh: "\u8bf7\u786e\u8ba4\u6700\u65b0\u95e8\u7968\u89c4\u5219\u3002"
        },
        popularity: { reviews: 1234, travelNotes: 56, images: 789 },
        highlights: {
          en: ["Mountain views", "Ancient pines"],
          zh: ["\u5c71\u5cb3\u98ce\u5149", "\u9ec4\u5c71\u5947\u677e"]
        }
      }
    });
    sessionStorage.setItem("nuogo-trip-trip-1", JSON.stringify(trip));

    render(<App initialPath="/trip/trip-1" />);

    expect(await screen.findByTestId("workspace-grid")).toHaveClass("xl:grid-cols-[minmax(360px,.95fr)_minmax(380px,.9fr)_310px]");
    expect(screen.getByTestId("route-map-panel")).toHaveClass("h-[280px]");
    expect(screen.getByTestId("guide-panel")).toHaveClass("max-h-[360px]", "overflow-y-auto");
  });

  it("keeps guide content visible when reduced motion is requested", async () => {
    window.matchMedia.mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));

    render(<App initialPath="/trip/trip-1" />);

    expect(await screen.findByRole("heading", {
      level: 2,
      name: "Jinli Ancient Street"
    })).toHaveStyle({ opacity: "1" });
  });

  it("uses Chinese workspace labels and opens activity details with ticket tiers", async () => {
    localStorage.setItem("nuogo-language", "zh");
    localStorage.setItem("nuogo-language-default", "en-v3");
    const trip = demoTrip();
    Object.assign(trip.variants[0].days[0].activities[0], {
      visitDetails: {
        suggestedDuration: { en: "1-2 hours", zh: "1-2小时" },
        bestTime: { en: "Early morning", zh: "清晨" },
        openingHours: {
          en: "Confirm current scenic-area hours.",
          zh: "请确认景区最新开放时间。"
        },
        ticketAdvice: {
          en: "Confirm current ticket rules.",
          zh: "请确认最新门票规则。"
        },
        popularity: { reviews: 1234, travelNotes: 56, images: 789 },
        highlights: {
          en: ["Mountain views", "Ancient pines"],
          zh: ["山岳风光", "黄山奇松"]
        }
      }
    });
    sessionStorage.setItem("nuogo-trip-trip-1", JSON.stringify(trip));

    render(<App initialPath="/trip/trip-1" />);

    expect(await screen.findByText("行程工作台")).toBeInTheDocument();
    expect(screen.getByText("· 路线 03")).toBeInTheDocument();
    expect(screen.getByText(/紧凑/)).toBeInTheDocument();
    expect(screen.getByText("历史古迹")).toBeInTheDocument();
    expect(screen.getByText("Nuogo 本地指南")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("activity-jinli-budget"));

    expect(screen.getByRole("dialog", { name: "行程详情" })).toBeInTheDocument();
    expect(screen.getByText("票价参考")).toBeInTheDocument();
    expect(screen.getByText("成人票")).toBeInTheDocument();
    expect(screen.getByText("儿童/学生票")).toBeInTheDocument();
    expect(screen.getByText("长者票")).toBeInTheDocument();
  });

  it("selects timeline activities with the keyboard", async () => {
    render(<App initialPath="/trip/trip-1" />);
    const card = await screen.findByTestId("activity-people-park-budget");

    expect(card).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(card, { key: "Enter" });

    expect(card).toHaveAttribute("data-selected", "true");
    expect(screen.getAllByRole("heading", {
      level: 2,
      name: "People's Park"
    }).length).toBeGreaterThan(0);
  });

  it("uses the latest revision across sequential activity edits", async () => {
    const source = demoTrip().variants[0].days[0].activities[0];
    const budget = {
      categories: { scenicTickets: 25, localFood: 155, transportation: 0, accommodation: 0 },
      total: 180,
      remaining: 4620,
      limit: 4800,
      overBudget: false
    };
    let editCount = 0;
    fetch.mockImplementation(async (url, options = {}) => {
      const read = authenticatedRead(url, options);
      if (read) return read;
      if (url.endsWith("/activities/jinli-budget") && options.method === "PATCH") {
        editCount += 1;
        return response(editCount === 1 ? {
          activity: { ...source, estimatedCost: 25 },
          budget,
          revision: 1
        } : {
          activity: { ...source, estimatedCost: 30 },
          budget: {
            ...budget,
            categories: { ...budget.categories, scenicTickets: 30 },
            total: 185,
            remaining: 4615
          },
          revision: 2
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    render(<App initialPath="/trip/trip-1" />);

    await userEvent.click(await screen.findByRole("button", { name: "Edit Jinli Ancient Street" }));
    const cost = screen.getByLabelText("Estimated cost");
    await userEvent.clear(cost);
    await userEvent.type(cost, "25");
    await userEvent.click(screen.getByRole("button", { name: "Save activity" }));
    expect((await screen.findAllByText("¥25")).length).toBeGreaterThan(0);

    const mutationCalls = fetch.mock.calls.filter(([, options = {}]) => options.method === "PATCH");
    expect(JSON.parse(mutationCalls[0][1].body)).toMatchObject({
      id: "jinli-budget",
      estimatedCost: 25,
      expectedRevision: 0
    });

    await userEvent.click(screen.getByRole("button", { name: "Edit Jinli Ancient Street" }));
    const nextCost = screen.getByLabelText("Estimated cost");
    await userEvent.clear(nextCost);
    await userEvent.type(nextCost, "30");
    await userEvent.click(screen.getByRole("button", { name: "Save activity" }));

    expect((await screen.findAllByText("¥30")).length).toBeGreaterThan(0);
    const finalMutationCalls = fetch.mock.calls
      .filter(([, options = {}]) => options.method === "PATCH");
    expect(JSON.parse(finalMutationCalls[1][1].body)).toMatchObject({
      id: "jinli-budget",
      estimatedCost: 30,
      expectedRevision: 1
    });
    expect(JSON.parse(sessionStorage.getItem("nuogo-trip-trip-1")).revision).toBe(2);
  });
});
