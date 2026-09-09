import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../src/App.jsx";

const admin = {
  id: "admin-1",
  name: "Admin Student",
  email: "admin@nuogo.test",
  role: "admin",
  status: "ACTIVE"
};

function response(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

function installAdminApi() {
  fetch.mockImplementation(async (url, options = {}) => {
    if (url.endsWith("/auth/me")) return response({ user: admin });
    if (url.endsWith("/admin/destinations")) return response({ destinations: [
      { id: "singapore", name: { en: "Singapore", zh: "新加坡" }, status: "ACTIVE" }
    ] });
    if (url.includes("/admin/pois?")) return response({ pois: [{
      id: "poi-gallery", name: { en: "National Gallery Singapore", zh: "新加坡国家美术馆" },
      destinationId: "singapore", category: "ATTRACTION", status: "ACTIVE",
      coordinates: { latitude: 1.2903, longitude: 103.8514 },
      sources: [{ provider: "OPENTRIPMAP", sourceId: "N123", retrievedAt: "2026-08-14T00:00:00.000Z" }]
    }] });
    if (url.includes("/admin/cost-references?")) return response({ costReferences: [{
      id: "cost-food", city: "singapore", category: "FOOD_PERSON_DAY", tier: "BALANCED",
      minMinor: 3000, maxMinor: 4000, representativeMinor: 3500, currency: "SGD",
      sourceName: "University travel survey", sourceUrl: "https://example.edu/travel-costs",
      collectedOn: "2026-08-01", updatedAt: "2026-08-14T00:00:00.000Z", status: "ACTIVE"
    }] });
    if (url.endsWith("/admin/destinations/singapore") && options.method === "PATCH") {
      return response({ destination: { id: "singapore", status: "OUTDATED" } });
    }
    if (url.endsWith("/admin/cost-references/cost-food") && options.method === "PUT") {
      return response({ costReference: JSON.parse(options.body) });
    }
    if (url.endsWith("/admin/cost-references/cost-food") && options.method === "DELETE") {
      return response({ costReference: { id: "cost-food", status: "UNAVAILABLE" } });
    }
    if (url.endsWith("/admin/pois/poi-gallery") && options.method === "DELETE") {
      return response({ poi: { id: "poi-gallery", status: "UNAVAILABLE" } });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
}

describe("report-aligned administration page", () => {
  beforeEach(() => {
    localStorage.setItem("nuogo-token", "admin-token");
    localStorage.setItem("nuogo-language", "en");
    localStorage.setItem("nuogo-language-default", "zh-v4");
  });

  it("shows the admin route only for a server-confirmed administrator", async () => {
    installAdminApi();
    render(<App initialPath="/admin" />);
    expect(await screen.findByRole("heading", { name: "System Administrator" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "System Administrator" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Destinations" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("row", { name: /Singapore/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Users" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Provider cache" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "System records" })).not.toBeInTheDocument();
  });

  it("keeps an ordinary authenticated user out of the admin route", async () => {
    fetch.mockResolvedValue(response({ user: { ...admin, id: "user-1", role: "user" } }));
    render(<App initialPath="/admin" />);
    expect(await screen.findByRole("heading", { name: "One choice. One Singapore itinerary you can actually use." })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "System Administrator" })).not.toBeInTheDocument();
  });

  it("updates destination lifecycle and displays POI and cost evidence", async () => {
    installAdminApi();
    render(<App initialPath="/admin" />);
    await screen.findByRole("heading", { name: "System Administrator" });
    await userEvent.click(screen.getByRole("tab", { name: "Destinations" }));
    const row = screen.getByRole("row", { name: /Singapore/ });
    await userEvent.selectOptions(within(row).getByRole("combobox", { name: "Singapore status" }), "OUTDATED");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/destinations/singapore"), expect.objectContaining({ method: "PATCH" }));

    await userEvent.click(screen.getByRole("tab", { name: "POIs" }));
    expect(screen.getByText("poi-gallery")).toBeInTheDocument();
    expect(screen.getByText("N123")).toBeInTheDocument();
    expect(screen.getByText("1.2903, 103.8514")).toBeInTheDocument();
    expect(screen.getByText("OpenTripMap API")).toBeInTheDocument();
    expect(screen.getByText("Attraction")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("OPENTRIPMAP");

    await userEvent.click(screen.getByRole("button", { name: "Retire National Gallery Singapore" }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/pois/poi-gallery"), expect.objectContaining({ method: "DELETE" }));
    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Cost references" }));
    expect(screen.getByText("University travel survey")).toBeInTheDocument();
    expect(screen.getByText("2026-08-01")).toBeInTheDocument();
  });

  it("offers recovery when an administrative dataset cannot load", async () => {
    fetch.mockImplementation(async (url) => {
      if (url.endsWith("/auth/me")) return response({ user: admin });
      return response({ error: { code: "REQUEST_FAILED", message: "Administrative data is unavailable." } }, false, 503);
    });
    render(<App initialPath="/admin" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Administrative data is unavailable");
    expect(screen.getByRole("button", { name: "Retry loading administration data" })).toBeInTheDocument();
  });

  it("updates and retires cost-reference evidence", async () => {
    installAdminApi();
    render(<App initialPath="/admin" />);
    await screen.findByRole("heading", { name: "System Administrator" });
    await userEvent.click(screen.getByRole("tab", { name: "Cost references" }));
    await screen.findByText("University travel survey");

    await userEvent.click(screen.getByRole("button", { name: "Edit University travel survey" }));
    const sourceName = screen.getByRole("textbox", { name: "Source name" });
    await userEvent.clear(sourceName);
    await userEvent.type(sourceName, "Updated university survey");
    await userEvent.click(screen.getByRole("button", { name: "Save cost reference" }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/cost-references/cost-food"), expect.objectContaining({ method: "PUT" }));
    expect(await screen.findByText("Updated university survey")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retire Updated university survey" }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/cost-references/cost-food"), expect.objectContaining({ method: "DELETE" }));
    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
  });

  it("loads scoped POI and cost data for Singapore", async () => {
    installAdminApi();
    render(<App initialPath="/admin" />);
    await screen.findByRole("row", { name: /Singapore/ });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/pois?destinationId=singapore"), expect.any(Object));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/cost-references?city=singapore"), expect.any(Object));
    expect(fetch.mock.calls.some(([url]) => String(url).includes("beijing"))).toBe(false);
  });
});
