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

function installAdminApi({ pois } = {}) {
  const canonicalPois = pois ?? [{
    id: "poi-gallery", name: { en: "National Gallery Singapore", zh: "National Gallery Singapore" },
    destinationId: "singapore", category: "ATTRACTION", status: "ACTIVE",
    coordinates: { latitude: 1.2903, longitude: 103.8514 },
    sources: [{ provider: "OPENTRIPMAP", sourceId: "N123", retrievedAt: "2026-08-14T00:00:00.000Z" }]
  }];
  fetch.mockImplementation(async (url, options = {}) => {
    if (url.endsWith("/auth/me")) return response({ user: admin });
    if (url.endsWith("/admin/destinations")) return response({ destinations: [
      { id: "singapore", name: { en: "Singapore", zh: "新加坡" }, status: "ACTIVE" }
    ] });
    if (url.includes("/admin/pois?")) return response({ pois: canonicalPois });
    /*
    if (url.includes("__unused_admin_poi_fixture__")) return response({ pois: [{
      id: "poi-gallery", name: { en: "National Gallery Singapore", zh: "新加坡国家美术馆" },
      destinationId: "singapore", category: "ATTRACTION", status: "ACTIVE",
      coordinates: { latitude: 1.2903, longitude: 103.8514 },
      sources: [{ provider: "OPENTRIPMAP", sourceId: "N123", retrievedAt: "2026-08-14T00:00:00.000Z" }]
    }] });
    */
    if (url.includes("/admin/cost-references?")) return response({ costReferences: [{
      id: "cost-food", city: "singapore", category: "FOOD_PERSON_DAY", tier: "BALANCED",
      minMinor: 3000, maxMinor: 4000, representativeMinor: 3500, currency: "SGD",
      referenceType: "GENERIC_FALLBACK", unitType: "PER_PERSON_DAY", priceBasis: "Balanced daily food midpoint",
      sourceType: "SYSTEM_ESTIMATE", lastReviewedDate: "2026-08-15", notes: "Planning reference only.",
      sourceName: "University travel survey", sourceUrl: "https://example.edu/travel-costs",
      collectedOn: "2026-08-01", updatedAt: "2026-08-14T00:00:00.000Z", status: "ACTIVE"
    }] });
    if (url.includes("/admin/poi-operating-hours?")) return response({
      operatingHours: [{
        id: "hours-gallery-monday",
        poiId: "poi-gallery",
        dayOfWeek: 1,
        opensAt: "10:00",
        closesAt: "19:00",
        isClosed: false,
        sourceName: "Official gallery hours",
        sourceUrl: "https://example.edu/gallery-hours",
        sourceType: "OFFICIAL",
        lastReviewedDate: "2026-09-27",
        verificationStatus: "PENDING_REVIEW",
        status: "ACTIVE",
        notes: "Pilot source-backed weekly hours."
      }],
      operatingHourExceptions: [{
        id: "hours-gallery-christmas",
        poiId: "poi-gallery",
        exceptionDate: "2026-12-25",
        opensAt: null,
        closesAt: null,
        isClosed: true,
        reason: "Christmas closure",
        sourceName: "Official gallery hours",
        sourceUrl: "https://example.edu/gallery-hours",
        sourceType: "OFFICIAL",
        lastReviewedDate: "2026-09-27",
        verificationStatus: "VERIFIED",
        verifiedAt: "2026-09-27T10:00:00.000Z",
        verifiedByUserId: "admin-1",
        status: "ACTIVE",
        notes: "Pilot source-backed exception."
      }],
      coverage: {
        canonicalPoiCount: 1,
        activeOperatingHoursPoiCount: 1,
        activeOperatingHoursPoiPercentage: 100
      }
    });
    if (url.endsWith("/admin/destinations/singapore") && options.method === "PATCH") {
      return response({ destination: { id: "singapore", status: "OUTDATED" } });
    }
    if (url.endsWith("/admin/cost-references/cost-food") && options.method === "PUT") {
      return response({ costReference: JSON.parse(options.body) });
    }
    if (url.includes("/admin/cost-references/new-cost-reference") && options.method === "PUT") {
      return response({ costReference: JSON.parse(options.body) });
    }
    if (url.endsWith("/admin/cost-references/cost-food") && options.method === "DELETE") {
      return response({ costReference: { id: "cost-food", status: "UNAVAILABLE" } });
    }
    if (url.includes("/admin/poi-operating-hours/new-operating-hour") && options.method === "PUT") {
      return response({ operatingHour: JSON.parse(options.body) });
    }
    if (url.includes("/admin/poi-operating-hours/import-") && options.method === "PUT") {
      return response({ operatingHour: JSON.parse(options.body) });
    }
    if (url.endsWith("/admin/poi-operating-hours/hours-gallery-monday/verification") && options.method === "PATCH") {
      return response({
        operatingHour: {
          ...JSON.parse(options.body),
          id: "hours-gallery-monday",
          poiId: "poi-gallery",
          dayOfWeek: 1,
          opensAt: "10:00",
          closesAt: "19:00",
          isClosed: false,
          sourceName: "Official gallery hours",
          sourceUrl: "https://example.edu/gallery-hours",
          sourceType: "OFFICIAL",
          lastReviewedDate: "2026-09-27",
          verifiedAt: "2026-09-27T10:00:00.000Z",
          verifiedByUserId: "admin-1",
          status: "ACTIVE",
          notes: "Pilot source-backed weekly hours."
        }
      });
    }
    if (url.includes("/admin/poi-operating-hour-exceptions/new-operating-hour-exception") && options.method === "PUT") {
      return response({ operatingHourException: JSON.parse(options.body) });
    }
    if (url.endsWith("/admin/poi-operating-hour-exceptions/hours-gallery-christmas") && options.method === "DELETE") {
      return response({ operatingHourException: { id: "hours-gallery-christmas", status: "UNAVAILABLE" } });
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
    expect(await screen.findByRole("heading", { name: "Nuogo Admin Console" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin Dashboard" })).toBeInTheDocument();
    expect(screen.getByTestId("user-mode-badge")).toHaveTextContent("System Administrator");
    expect(screen.getAllByText("ADMIN").length).toBeGreaterThan(0);
    expect(await screen.findByText("1 supported POI")).toBeInTheDocument();
    expect(screen.getByText("1 active price reference")).toBeInTheDocument();
    expect(screen.getByText("1 POI with active operating hours")).toBeInTheDocument();
    expect(screen.getByText("0 outdated / unavailable records")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Needs Attention" })).toHaveTextContent("POIs without active operating hours: 0");
    expect(screen.queryByRole("region", { name: "Admin maintenance areas" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Destination Management" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("row", { name: /Singapore/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Users" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Provider cache" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "System records" })).not.toBeInTheDocument();
  });

  it("keeps the dashboard overview shared while tab panels show only their own management content", async () => {
    installAdminApi();
    render(<App initialPath="/admin" />);
    await screen.findByRole("heading", { name: "Nuogo Admin Console" });
    await screen.findByText("1 supported POI");

    expect(screen.getAllByText("1 supported POI")).toHaveLength(1);
    expect(screen.getAllByRole("region", { name: "Needs Attention" })).toHaveLength(1);

    const destinationPanel = screen.getByRole("region", { name: "Destination Management" });
    expect(within(destinationPanel).getByRole("row", { name: /Singapore/ })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Attraction / POI Management" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Price Reference Management" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Attraction / POI Management" }));
    const poiPanel = screen.getByRole("region", { name: "Attraction / POI Management" });
    expect(within(poiPanel).getByText("National Gallery Singapore")).toBeInTheDocument();
    expect(within(poiPanel).getByRole("heading", { name: "Operating Hours" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Destination Management" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Price Reference Management" })).not.toBeInTheDocument();
    expect(screen.getAllByText("1 supported POI")).toHaveLength(1);
    expect(screen.getAllByRole("region", { name: "Needs Attention" })).toHaveLength(1);

    await userEvent.click(screen.getByRole("tab", { name: "Price Reference Management" }));
    const pricePanel = screen.getByRole("region", { name: "Price Reference Management" });
    expect(within(pricePanel).getByText("University travel survey")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Destination Management" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Attraction / POI Management" })).not.toBeInTheDocument();
    expect(screen.getAllByText("1 supported POI")).toHaveLength(1);
    expect(screen.getAllByRole("region", { name: "Needs Attention" })).toHaveLength(1);
  });

  it("keeps an ordinary authenticated user out of the admin route", async () => {
    fetch.mockResolvedValue(response({ user: { ...admin, id: "user-1", role: "user" } }));
    render(<App initialPath="/admin" />);
    expect(await screen.findByRole("heading", { name: "Plan with the current Singapore pilot" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Nuogo Admin Console" })).not.toBeInTheDocument();
    expect(screen.queryByText("ADMIN")).not.toBeInTheDocument();
  });

  it("updates destination lifecycle and displays POI and cost evidence", async () => {
    installAdminApi();
    render(<App initialPath="/admin" />);
    await screen.findByRole("heading", { name: "Nuogo Admin Console" });
    await userEvent.click(screen.getByRole("tab", { name: "Destination Management" }));
    const row = screen.getByRole("row", { name: /Singapore/ });
    await userEvent.selectOptions(within(row).getByRole("combobox", { name: "Singapore status" }), "OUTDATED");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/destinations/singapore"), expect.objectContaining({ method: "PATCH" }));

    await userEvent.click(screen.getByRole("tab", { name: "Attraction / POI Management" }));
    expect(screen.getAllByText("poi-gallery").length).toBeGreaterThan(0);
    expect(screen.getByText("N123")).toBeInTheDocument();
    expect(screen.getByText("1.2903, 103.8514")).toBeInTheDocument();
    expect(screen.getByText("OpenTripMap API")).toBeInTheDocument();
    expect(screen.getByText("Attraction")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("OPENTRIPMAP");

    await userEvent.click(screen.getByRole("button", { name: "Retire National Gallery Singapore" }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/pois/poi-gallery"), expect.objectContaining({ method: "DELETE" }));
    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Price Reference Management" }));
    expect(screen.getByText("University travel survey")).toBeInTheDocument();
    expect(screen.getByText("2026-08-01")).toBeInTheDocument();
    expect(screen.getByText("GENERIC_FALLBACK")).toBeInTheDocument();
    expect(screen.getByText("Balanced daily food midpoint")).toBeInTheDocument();
  });

  it("renders POI coordinates from numbers, numeric strings, nulls, and invalid values", async () => {
    installAdminApi({ pois: [
      {
        id: "poi-number", name: { en: "Number POI", zh: "Number POI" },
        destinationId: "singapore", category: "ATTRACTION", status: "ACTIVE",
        coordinates: { latitude: 1.29034, longitude: 103.85144 },
        sources: [{ provider: "OPENTRIPMAP", sourceId: "N123", retrievedAt: "2026-08-14T00:00:00.000Z" }]
      },
      {
        id: "poi-string", name: { en: "String POI", zh: "String POI" },
        destinationId: "singapore", category: "ATTRACTION", status: "ACTIVE",
        coordinates: { latitude: "1.30004", longitude: "103.80015" },
        sources: [{ provider: "OPENTRIPMAP", sourceId: "S123", retrievedAt: "2026-08-14T00:00:00.000Z" }]
      },
      {
        id: "poi-null", name: { en: "Null POI", zh: "Null POI" },
        destinationId: "singapore", category: "ATTRACTION", status: "ACTIVE",
        coordinates: null,
        sources: [{ provider: "OPENTRIPMAP", sourceId: "NULL123", retrievedAt: "2026-08-14T00:00:00.000Z" }]
      },
      {
        id: "poi-invalid", name: { en: "Invalid POI", zh: "Invalid POI" },
        destinationId: "singapore", category: "ATTRACTION", status: "ACTIVE",
        coordinates: { latitude: "north", longitude: "" },
        sources: [{ provider: "OPENTRIPMAP", sourceId: "BAD123", retrievedAt: "2026-08-14T00:00:00.000Z" }]
      }
    ] });
    render(<App initialPath="/admin" />);
    await screen.findByRole("heading", { name: "Nuogo Admin Console" });

    await userEvent.click(screen.getByRole("tab", { name: "Attraction / POI Management" }));

    expect(screen.getByRole("heading", { name: "Operating Hours" })).toBeInTheDocument();
    expect(screen.getByText("1.2903, 103.8514")).toBeInTheDocument();
    expect(screen.getByText("1.3000, 103.8002")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Null POI/ })).toHaveTextContent("—");
    expect(screen.getByRole("row", { name: /Invalid POI/ })).toHaveTextContent("—, —");
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
    await screen.findByRole("heading", { name: "Nuogo Admin Console" });
    await userEvent.click(screen.getByRole("tab", { name: "Price Reference Management" }));
    await screen.findByText("University travel survey");

    await userEvent.click(screen.getByRole("button", { name: "Edit University travel survey" }));
    expect(screen.getByLabelText("Planning price")).toHaveValue(35);
    expect(screen.getByLabelText("Reference Type")).toHaveValue("GENERIC_FALLBACK");
    expect(screen.getByLabelText("Price Basis")).toHaveValue("Balanced daily food midpoint");
    const sourceName = screen.getByRole("textbox", { name: "Source Name" });
    await userEvent.clear(sourceName);
    await userEvent.type(sourceName, "Updated university survey");
    await userEvent.click(screen.getByRole("button", { name: "Save cost reference" }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/cost-references/cost-food"), expect.objectContaining({ method: "PUT" }));
    expect(await screen.findByText("Updated university survey")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retire Updated university survey" }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/cost-references/cost-food"), expect.objectContaining({ method: "DELETE" }));
    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
  });

  it("creates a source-backed attraction price reference from the admin dashboard", async () => {
    installAdminApi();
    render(<App initialPath="/admin" />);
    await screen.findByRole("heading", { name: "Nuogo Admin Console" });
    await userEvent.click(screen.getByRole("tab", { name: "Price Reference Management" }));

    await userEvent.click(screen.getByRole("button", { name: "Create price reference" }));
    await userEvent.selectOptions(screen.getByLabelText("Reference Type"), "EXACT");
    await userEvent.type(screen.getByLabelText("POI ID"), "demo-sg-singapore-zoo");
    await userEvent.clear(screen.getByLabelText("Planning price"));
    await userEvent.type(screen.getByLabelText("Planning price"), "49");
    await userEvent.selectOptions(screen.getByLabelText("Source Type"), "OFFICIAL");
    await userEvent.type(screen.getByLabelText("Price Basis"), "Non-Resident Adult");
    await userEvent.type(screen.getByLabelText("Source Name"), "Mandai Wildlife Reserve");
    await userEvent.type(screen.getByLabelText("Source URL"), "https://www.mandai.com/en/tickets-and-passes/single-attractions/singapore-zoo.html");
    await userEvent.click(screen.getByRole("button", { name: "Save cost reference" }));

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/cost-references/new-cost-reference"), expect.objectContaining({ method: "PUT" }));
    expect(await screen.findByText("Mandai Wildlife Reserve")).toBeInTheDocument();
    expect(screen.getByText("Non-Resident Adult")).toBeInTheDocument();
  });

  it("maintains source-backed POI operating hours and date exceptions", async () => {
    installAdminApi();
    render(<App initialPath="/admin" />);
    await screen.findByRole("heading", { name: "Nuogo Admin Console" });
    await userEvent.click(screen.getByRole("tab", { name: "Attraction / POI Management" }));

    expect(screen.getByRole("heading", { name: "Operating Hours" })).toBeInTheDocument();
    expect(screen.getByText("1 / 1 POIs with active operating-hour records (100%)")).toBeInTheDocument();
    expect(screen.getAllByText("Official gallery hours")).toHaveLength(2);
    expect(screen.getByText((text) => text.includes("Weekday 1") && text.includes("10:00 - 19:00"))).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes("2026-12-25 exception") && text.includes("Closed"))).toBeInTheDocument();
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Source for operating hours hours-gallery-monday" }))
      .toHaveAttribute("href", "https://example.edu/gallery-hours");
    await userEvent.click(screen.getByRole("button", { name: "Verify operating hours hours-gallery-monday" }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/poi-operating-hours/hours-gallery-monday/verification"), expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ verificationStatus: "VERIFIED" })
    }));
    expect(screen.queryByText("Pending Review")).not.toBeInTheDocument();
    expect(screen.getAllByText("Verified").length).toBeGreaterThanOrEqual(2);

    await userEvent.click(screen.getByRole("button", { name: "Create weekly operating hours" }));
    await userEvent.clear(screen.getByLabelText("Operating Hours Last Reviewed"));
    await userEvent.type(screen.getByLabelText("Operating Hours Last Reviewed"), "2026-09-28");
    await userEvent.type(screen.getByLabelText("Operating Hours Source Name"), "Updated gallery hours");
    await userEvent.type(screen.getByLabelText("Operating Hours Source URL"), "https://example.edu/updated-gallery-hours");
    await userEvent.click(screen.getByRole("button", { name: "Save operating hours" }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/poi-operating-hours/new-operating-hour"), expect.objectContaining({ method: "PUT" }));
    const savedHour = fetch.mock.calls
      .filter(([url, options]) => String(url).includes("/admin/poi-operating-hours/new-operating-hour") && options?.method === "PUT")
      .map(([, options]) => JSON.parse(options.body))
      .at(-1);
    expect(savedHour.lastReviewedDate).toBe("2026-09-28");
    expect(await screen.findByText("Updated gallery hours")).toBeInTheDocument();
    expect(screen.getByText("2026-09-28")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create operating hours exception" }));
    await userEvent.clear(screen.getByLabelText("Exception Date"));
    await userEvent.type(screen.getByLabelText("Exception Date"), "2026-09-28");
    await userEvent.clear(screen.getByLabelText("Exception Last Reviewed"));
    await userEvent.type(screen.getByLabelText("Exception Last Reviewed"), "2026-09-28");
    await userEvent.type(screen.getByLabelText("Exception Source Name"), "Official holiday closure");
    await userEvent.type(screen.getByLabelText("Exception Source URL"), "https://example.edu/holiday-closure");
    await userEvent.click(screen.getByRole("button", { name: "Save operating hours exception" }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/poi-operating-hour-exceptions/new-operating-hour-exception"), expect.objectContaining({ method: "PUT" }));
    const savedException = fetch.mock.calls
      .filter(([url, options]) => String(url).includes("/admin/poi-operating-hour-exceptions/new-operating-hour-exception") && options?.method === "PUT")
      .map(([, options]) => JSON.parse(options.body))
      .at(-1);
    expect(savedException.exceptionDate).toBe("2026-09-28");
    expect(savedException.lastReviewedDate).toBe("2026-09-28");
    expect(await screen.findByText("Official holiday closure")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retire operating hours hours-gallery-christmas" }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/poi-operating-hour-exceptions/hours-gallery-christmas"), expect.objectContaining({ method: "DELETE" }));
    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
  });

  it("creates weekly operating hours for multiple selected weekdays without marking them verified", async () => {
    installAdminApi();
    render(<App initialPath="/admin" />);
    await screen.findByRole("heading", { name: "Nuogo Admin Console" });
    await userEvent.click(screen.getByRole("tab", { name: "Attraction / POI Management" }));

    await userEvent.click(screen.getByRole("button", { name: "Create weekly operating hours" }));
    await userEvent.click(screen.getByRole("button", { name: "Select all weekdays" }));
    await userEvent.type(screen.getByLabelText("Operating Hours Source Name"), "Mandai Wildlife Reserve");
    await userEvent.type(screen.getByLabelText("Operating Hours Source URL"), "https://www.mandai.com/zh/singapore-zoo.html");
    await userEvent.click(screen.getByRole("button", { name: "Save operating hours" }));

    const weeklyPuts = fetch.mock.calls
      .filter(([url, options]) => String(url).includes("/admin/poi-operating-hours/new-operating-hour-") && options?.method === "PUT")
      .map(([, options]) => JSON.parse(options.body));
    expect(weeklyPuts).toHaveLength(7);
    expect(weeklyPuts.map((record) => record.dayOfWeek).sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(weeklyPuts.every((record) => record.verificationStatus === "PENDING_REVIEW")).toBe(true);
  });

  it("expands CSV weekday groups, rejects invalid rows, and imports only pending-review records", async () => {
    installAdminApi();
    render(<App initialPath="/admin" />);
    await screen.findByRole("heading", { name: "Nuogo Admin Console" });
    await userEvent.click(screen.getByRole("tab", { name: "Attraction / POI Management" }));

    const csv = [
      "poi-gallery,TUE|WED,08:30,18:00,false,Mandai Wildlife Reserve,https://www.mandai.com/zh/singapore-zoo.html,OFFICIAL,2026-09-28,ACTIVE,Daily operating hours",
      "unknown-poi,MON,08:30,18:00,false,Mandai Wildlife Reserve,https://www.mandai.com/zh/singapore-zoo.html,OFFICIAL,2026-09-28,ACTIVE,Unknown POI",
      "poi-gallery,FUNDAY,08:30,18:00,false,Mandai Wildlife Reserve,https://www.mandai.com/zh/singapore-zoo.html,OFFICIAL,2026-09-28,ACTIVE,Invalid weekday",
      "poi-gallery,THU,25:00,18:00,false,Mandai Wildlife Reserve,https://www.mandai.com/zh/singapore-zoo.html,OFFICIAL,2026-09-28,ACTIVE,Invalid time",
      "poi-gallery,FRI,08:30,18:00,false,,https://www.mandai.com/zh/singapore-zoo.html,OFFICIAL,2026-09-28,ACTIVE,Missing source name",
      "poi-gallery,SAT,08:30,18:00,false,Mandai Wildlife Reserve,,OFFICIAL,2026-09-28,ACTIVE,Missing source url",
      "poi-gallery,MON,10:00,19:00,false,Official gallery hours,https://example.edu/gallery-hours,OFFICIAL,2026-09-27,ACTIVE,Duplicate weekly record"
    ].join("\n");

    await userEvent.type(screen.getByLabelText("Bulk operating hours CSV"), csv);
    await userEvent.click(screen.getByRole("button", { name: "Preview operating hours CSV" }));

    expect(screen.getByText("Ready to import")).toBeInTheDocument();
    expect(screen.getByText("Unknown POI ID")).toBeInTheDocument();
    expect(screen.getByText("Invalid weekday")).toBeInTheDocument();
    expect(screen.getByText("Invalid time")).toBeInTheDocument();
    expect(screen.getByText("Missing source name")).toBeInTheDocument();
    expect(screen.getByText("Missing source URL")).toBeInTheDocument();
    expect(screen.getByText("Duplicate weekly record")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Import valid operating hours" }));

    const imported = fetch.mock.calls
      .filter(([url, options]) => String(url).includes("/admin/poi-operating-hours/import-poi-gallery-") && options?.method === "PUT")
      .map(([, options]) => JSON.parse(options.body));
    expect(imported).toHaveLength(2);
    expect(imported.map((record) => record.dayOfWeek).sort()).toEqual([2, 3]);
    expect(imported.every((record) => record.verificationStatus === "PENDING_REVIEW")).toBe(true);
  });

  it("verifies only the selected pending operating-hours group", async () => {
    installAdminApi({ pois: [
      {
        id: "poi-gallery", name: { en: "National Gallery Singapore", zh: "National Gallery Singapore" },
        destinationId: "singapore", category: "ATTRACTION", status: "ACTIVE",
        coordinates: { latitude: 1.2903, longitude: 103.8514 },
        sources: [{ provider: "OPENTRIPMAP", sourceId: "N123", retrievedAt: "2026-08-14T00:00:00.000Z" }]
      },
      {
        id: "poi-zoo", name: { en: "Singapore Zoo", zh: "Singapore Zoo" },
        destinationId: "singapore", category: "ATTRACTION", status: "ACTIVE",
        coordinates: { latitude: 1.4043, longitude: 103.793 },
        sources: [{ provider: "OPENTRIPMAP", sourceId: "ZOO123", retrievedAt: "2026-08-14T00:00:00.000Z" }]
      }
    ] });
    render(<App initialPath="/admin" />);
    await screen.findByRole("heading", { name: "Nuogo Admin Console" });
    await userEvent.click(screen.getByRole("tab", { name: "Attraction / POI Management" }));

    expect(screen.getByText("poi-gallery · Official gallery hours · 2026-09-27")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Verify group poi-gallery Official gallery hours" }));

    const verificationCalls = fetch.mock.calls.filter(([url, options]) => String(url).includes("/verification") && options?.method === "PATCH");
    expect(verificationCalls).toHaveLength(1);
    expect(String(verificationCalls[0][0])).toContain("/admin/poi-operating-hours/hours-gallery-monday/verification");
  });

  it("loads scoped POI and cost data for Singapore", async () => {
    installAdminApi();
    render(<App initialPath="/admin" />);
    await screen.findByRole("row", { name: /Singapore/ });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/pois?destinationId=singapore"), expect.any(Object));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/cost-references?city=singapore"), expect.any(Object));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/poi-operating-hours?destinationId=singapore"), expect.any(Object));
    expect(fetch.mock.calls.some(([url]) => String(url).includes("beijing"))).toBe(false);
  });
});
