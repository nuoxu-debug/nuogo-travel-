import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TripLegRow from "../src/components/TripLegRow.jsx";
import { LanguageProvider } from "../src/context/LanguageContext.jsx";

function renderLeg(leg, language = "en") {
  localStorage.setItem("nuogo-language-default", "zh-v4");
  localStorage.setItem("nuogo-language", language);
  render(
    <LanguageProvider>
      <TripLegRow leg={leg} />
    </LanguageProvider>
  );
}

const baseLeg = {
  id: "leg-1",
  fromLocationId: "origin",
  toLocationId: "poi",
  mode: "PUBLIC_TRANSIT",
  distanceMeters: 6830,
  durationMinutes: 31,
  estimatedCostMinor: 354,
  routeSource: "ONEMAP",
  sourceType: "ESTIMATED",
  presentation: {
    origin: { en: "Hotel", zh: "酒店" },
    destination: { en: "Museum", zh: "博物馆" }
  }
};

function oneMapLeg(overrides = {}) {
  return {
    ...baseLeg,
    mrtRoute: {
      accessStation: { id: "bayfront", name: { en: "Bayfront", zh: "海湾舫" }, lineCodes: ["DT"] },
      egressStation: { id: "city-hall", name: { en: "City Hall", zh: "政府大厦" }, lineCodes: ["EW"] },
      stations: [],
      lines: [],
      segments: [],
      stationCount: 3,
      transferCount: 1,
      railMinutes: 22,
      walkMinutes: 7,
      provider: "ONEMAP",
      source: { name: "OneMap public transport routing", url: "https://www.onemap.gov.sg/apidocs/routing" },
      legs: [
        { mode: "WALK", durationMinutes: 5 },
        { mode: "SUBWAY", route: "DT", durationMinutes: 12 },
        { mode: "SUBWAY", route: "EW", durationMinutes: 10 },
        { mode: "WALK", durationMinutes: 2 }
      ],
      ...overrides
    }
  };
}

describe("TripLegRow transport detail display", () => {
  it("shows detailed OneMap walk and MRT sequence", () => {
    renderLeg(oneMapLeg());

    expect(screen.getByText("Walk 5 min \u2192 MRT DT 12 min \u2192 MRT EW 10 min \u2192 Walk 2 min \u00b7 OneMap route")).toBeInTheDocument();
    expect(screen.getByText("6.8 km \u00b7 31 min")).toBeInTheDocument();
    expect(screen.getByText("S$ 3.54")).toBeInTheDocument();
  });

  it("wraps long transport details instead of truncating them", () => {
    renderLeg(oneMapLeg({
      legs: [
        { mode: "WALK", durationMinutes: 18 },
        { mode: "SUBWAY", route: "DT", durationMinutes: 12 },
        { mode: "SUBWAY", route: "TE", durationMinutes: 9 },
        { mode: "BUS", route: "36", durationMinutes: 16 },
        { mode: "WALK", durationMinutes: 7 }
      ]
    }));

    const detail = screen.getByText("Walk 18 min \u2192 MRT DT 12 min \u2192 MRT TE 9 min \u2192 Bus 36 16 min \u2192 Walk 7 min \u00b7 OneMap route");
    expect(detail.closest("p")).not.toHaveClass("truncate");
  });

  it("shows multiple MRT lines from OneMap details", () => {
    renderLeg(oneMapLeg({
      legs: [
        { mode: "SUBWAY", route: "TE", durationMinutes: 8 },
        { mode: "SUBWAY", route: "NS", durationMinutes: 6 },
        { mode: "SUBWAY", route: "CC", durationMinutes: 9 }
      ]
    }));

    expect(screen.getByText("MRT TE 8 min \u2192 MRT NS 6 min \u2192 MRT CC 9 min \u00b7 OneMap route")).toBeInTheDocument();
  });

  it("shows static MRT fallback summary when OneMap leg details are unavailable", () => {
    renderLeg({
      ...baseLeg,
      routeSource: "STATIC_REFERENCE",
      mrtRoute: {
        accessStation: { id: "city-hall", name: { en: "City Hall", zh: "政府大厦" }, lineCodes: ["NS", "EW"] },
        egressStation: { id: "bayfront", name: { en: "Bayfront", zh: "海湾舫" }, lineCodes: ["DT"] },
        stations: [],
        lines: [],
        segments: [],
        stationCount: 2,
        transferCount: 1,
        railMinutes: 13,
        walkMinutes: 11,
        provider: "STATIC_REFERENCE",
        source: { name: "LTA rail network static reference", url: "https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html" }
      }
    });

    expect(screen.getByText("MRT: City Hall \u2192 Bayfront \u00b7 1 transfer \u00b7 11 min walking connection \u00b7 Static reference")).toBeInTheDocument();
  });

  it("keeps generic public transport fallback without MRT details", () => {
    renderLeg({ ...baseLeg, routeSource: "ESTIMATED", mrtRoute: undefined });

    expect(screen.getByText("Public transport \u00b7 Estimated")).toBeInTheDocument();
  });

  it("keeps generic taxi fallback", () => {
    renderLeg({ ...baseLeg, mode: "TAXI", routeSource: "ESTIMATED", mrtRoute: undefined });

    expect(screen.getByText("Taxi \u00b7 Estimated")).toBeInTheDocument();
  });

  it("keeps generic walking fallback", () => {
    renderLeg({ ...baseLeg, mode: "WALK", estimatedCostMinor: 0, routeSource: "ESTIMATED", mrtRoute: undefined });

    expect(screen.getByText("Walk \u00b7 Estimated")).toBeInTheDocument();
  });

  it("ignores missing or malformed OneMap detail without crashing or leaking raw values", () => {
    renderLeg(oneMapLeg({
      legs: [
        { mode: "WALK" },
        { mode: "SECRET_INTERNAL_MODE", route: undefined, durationMinutes: 9 },
        { mode: "SUBWAY", route: undefined, durationMinutes: 12 }
      ]
    }));

    expect(screen.getByText("MRT 12 min \u00b7 OneMap route")).toBeInTheDocument();
    expect(screen.queryByText(/SECRET_INTERNAL_MODE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  });

  it("localizes transport detail labels in Chinese", () => {
    renderLeg(oneMapLeg(), "zh");

    expect(screen.getByText("步行 5 分钟 \u2192 MRT DT 12 分钟 \u2192 MRT EW 10 分钟 \u2192 步行 2 分钟 \u00b7 OneMap 路线")).toBeInTheDocument();
  });
});
