import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";

function setReducedMotion(matches = true) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
}

function renderEnglishLanding() {
  localStorage.setItem("nuogo-language", "en");
  localStorage.setItem("nuogo-language-default", "zh-v4");
  setReducedMotion();
  return render(<App initialPath="/" />);
}

describe("Singapore landing experience", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("keeps direct planning and Guest Mode actions on the hero", () => {
    renderEnglishLanding();
    expect(screen.getByRole("heading", { name: "Plan Smarter. Travel Your Way." })).toBeInTheDocument();
    expect(screen.getByText(/personalised, budget-aware travel itineraries/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /See How It Works/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Start Planning" })[0]).toHaveAttribute("href", "/discover/singapore");
  });

  it("presents Singapore as the available pilot destination below the platform hero", () => {
    renderEnglishLanding();
    expect(screen.getByRole("heading", { name: "Available pilot destination" })).toBeInTheDocument();
    expect(screen.getAllByText("Singapore").length).toBeGreaterThan(0);
    expect(screen.getByText("Pilot Destination")).toBeInTheDocument();
    expect(screen.getByText(/current validated pilot destination/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plan a Singapore Trip" })).toHaveAttribute("href", "/discover/singapore");
    expect(document.body).not.toHaveTextContent(/Worldwide destinations available|Plan anywhere/i);
  });

  it("presents local Singapore attraction stories without leaving the MVP scope", () => {
    renderEnglishLanding();
    expect(screen.getByTestId("singapore-attraction-story")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /Singapore travel chapter/i })).toHaveLength(4);
    expect(screen.queryByText("Marina Bay Sands")).not.toBeInTheDocument();
    expect(screen.getAllByText("Gardens by the Bay").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chinatown").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kampong Glam").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Little India").length).toBeGreaterThan(0);
    expect(document.body).not.toHaveTextContent(/\bChina\b|CNY|Compare Plans/i);
  });

  it("renders an accessible Singapore journey map and five-step planning story", () => {
    renderEnglishLanding();
    expect(screen.getByTestId("singapore-journey-map")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Singapore MRT network map" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open official MRT map" })).toHaveAttribute("href", "https://journey.smrt.com.sg/journey/mrt_network_map/");
    expect(screen.getByRole("img", { name: "Illustrated collage of friends, family and couple trips planned with Nuogo" })).toHaveAttribute("src", "/images/landing/how-nuogo-works-collage.png");
    expect(screen.getByText("Enter travel preferences")).toBeInTheDocument();
    expect(screen.getByText("Browse/select attractions")).toBeInTheDocument();
    expect(screen.getByText("Generate itinerary")).toBeInTheDocument();
    expect(screen.getByText("Validate budget and structure")).toBeInTheDocument();
    expect(screen.getByText("Save and manage itinerary")).toBeInTheDocument();
  });

  it("defaults to Chinese Singapore copy", () => {
    localStorage.clear();
    setReducedMotion();
    render(<App initialPath="/" />);
    expect(screen.getByRole("heading", { name: /\u806a\u660e\u89c4\u5212\uff0c\s*\u81ea\u5728\u51fa\u53d1\u3002/ })).toBeInTheDocument();
    expect(screen.getAllByText("\u6ee8\u6d77\u6e7e\u82b1\u56ed").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: "\u95fa\u871c\u3001\u5bb6\u5ead\u4e0e\u60c5\u4fa3\u4f7f\u7528 Nuogo \u89c4\u5212\u65c5\u884c\u7684\u63d2\u753b\u62fc\u8d34" })).toHaveAttribute("src", "/images/landing/how-nuogo-works-collage.png");
    expect(document.documentElement.lang).toBe("zh-CN");
  });
});
