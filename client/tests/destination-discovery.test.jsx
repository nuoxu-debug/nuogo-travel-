import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";

const discovery = {
  destination: { id: "singapore", name: { zh: "新加坡", en: "Singapore" } },
  attractions: [
    { xid: "demo-sg-national-gallery", displayName: { zh: "新加坡国家美术馆", en: "National Gallery Singapore" }, description: { zh: "市政区的艺术机构。", en: "An art institution in the Civic District." }, category: "CULTURE", coordinates: { latitude: 1.2903, longitude: 103.8514, coordinateSystem: "WGS84" }, providerMode: "DEMO", sourceType: "DEMO_FIXTURE" },
    { xid: "demo-sg-botanic-gardens", displayName: { zh: "新加坡植物园", en: "Singapore Botanic Gardens" }, category: "NATURE", coordinates: { latitude: 1.3138, longitude: 103.8159, coordinateSystem: "WGS84" }, providerMode: "DEMO", sourceType: "DEMO_FIXTURE" },
    { xid: "wrong-system", displayName: { zh: "无效位置", en: "Invalid position" }, category: "HISTORY", coordinates: { latitude: 1.3, longitude: 103.8, coordinateSystem: "GCJ02" }, providerMode: "DEMO", sourceType: "DEMO_FIXTURE" }
  ], candidateCount: 3, providerMode: "demo"
};

function respond(body = discovery, ok = true) { fetch.mockResolvedValue({ ok, status: ok ? 200 : 503, json: async () => body }); }

describe("destination discovery", () => {
  it("shows Chinese Singapore discovery content and never renders raw modes", async () => {
    localStorage.setItem("nuogo-language", "zh"); respond(); render(<App initialPath="/discover/singapore" />);
    expect(await screen.findByRole("heading", { name: "发现新加坡" })).toBeVisible();
    expect(screen.getByRole("radio", { name: /让 Nuogo 建议/ })).toBeChecked();
    expect(screen.queryByText("AUTO", { exact: true })).not.toBeInTheDocument();
    expect(screen.getAllByText("演示资料").length).toBeGreaterThan(0);
    expect(screen.getByText("暂无景点介绍")).toBeVisible();
  });

  it("uses friendly labels while preserving MANUAL and AUTO only in the stored draft", async () => {
    localStorage.setItem("nuogo-language", "en"); respond(); render(<App initialPath="/discover/singapore" />);
    expect(await screen.findByRole("heading", { name: "Discover Singapore" })).toBeVisible();
    await userEvent.click(screen.getByRole("radio", { name: /Choose Attractions Myself/ }));
    await userEvent.click(screen.getByRole("button", { name: "Add National Gallery Singapore" }));
    expect(screen.getByText("Selected Attractions: 1")).toBeVisible();
    expect(JSON.parse(sessionStorage.getItem("nuogo-attraction-draft"))).toMatchObject({ destination: "singapore", mode: "MANUAL", selectedAttractions: [{ xid: "demo-sg-national-gallery" }] });
    await userEvent.click(screen.getByRole("radio", { name: /Let Nuogo Suggest/ }));
    expect(screen.getByText("Nuogo will use grounded Singapore attractions after you enter your preferences.")).toBeVisible();
    expect(JSON.parse(sessionStorage.getItem("nuogo-attraction-draft"))).toMatchObject({ mode: "AUTO", selectedAttractions: [] });
  });

  it("keeps cards and map focus linked and labels demo data honestly", async () => {
    localStorage.setItem("nuogo-language", "en"); respond(); render(<App initialPath="/discover/singapore" />);
    await screen.findByRole("heading", { name: "Discover Singapore" });
    await userEvent.click(screen.getByRole("radio", { name: /Choose Attractions Myself/ }));
    await userEvent.click(screen.getByRole("button", { name: "Add National Gallery Singapore" }));
    expect(screen.getAllByText("Demo data").length).toBeGreaterThan(0);
    expect(screen.queryByText("OpenTripMap-supported")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Map location: National Gallery Singapore" })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("link", { name: "Continue to Preferences" })).toHaveAttribute("href", "/planner");
  });

  it("filters attractions without losing a chosen selection", async () => {
    localStorage.setItem("nuogo-language", "en"); respond(); render(<App initialPath="/discover/singapore" />);
    await screen.findByRole("heading", { name: "Discover Singapore" }); await userEvent.click(screen.getByRole("radio", { name: /Choose Attractions Myself/ })); await userEvent.click(screen.getByRole("button", { name: "Add National Gallery Singapore" }));
    await userEvent.click(screen.getByRole("button", { name: "Nature" }));
    expect(screen.getByRole("button", { name: "Add Singapore Botanic Gardens" })).toBeVisible();
    expect(screen.getByText("Selected Attractions: 1")).toBeVisible();
  });

  it("shows a controlled empty state", async () => { respond({ ...discovery, attractions: [], candidateCount: 0 }); render(<App initialPath="/discover/singapore" />); expect(await screen.findByText("No matching attractions found.")).toBeVisible(); });

  it("offers retry after a discovery error", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: { message: "Unavailable" } }) }).mockResolvedValueOnce({ ok: true, status: 200, json: async () => discovery });
    render(<App initialPath="/discover/singapore" />); const alert = await screen.findByRole("alert"); expect(within(alert).getByText("We couldn't load attraction information right now. Please try again.")).toBeVisible(); await userEvent.click(within(alert).getByRole("button", { name: "Try again" })); expect(await screen.findByRole("radio", { name: /Choose Attractions Myself/ })).toBeVisible();
  });

  it("honours reduced motion for the map", async () => { window.matchMedia.mockImplementation((query) => ({ matches: query === "(prefers-reduced-motion: reduce)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })); respond(); render(<App initialPath="/discover/singapore" />); expect(await screen.findByTestId("discovery-map")).toHaveAttribute("data-motion", "reduced"); });
});
