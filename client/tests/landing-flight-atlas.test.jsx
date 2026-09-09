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
    expect(screen.getByRole("heading", { name: "Let Singapore unfold at your pace." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continue as Guest/ })).toHaveAttribute("href", "/login?returnTo=%2Fdiscover%2Fsingapore");
    expect(screen.getAllByRole("link", { name: "Start Planning" })[0]).toHaveAttribute("href", "/discover/singapore");
  });

  it("presents local Singapore attraction stories without leaving the MVP scope", () => {
    renderEnglishLanding();
    expect(screen.getByTestId("singapore-attraction-story")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /Singapore travel chapter/i })).toHaveLength(6);
    expect(screen.getByText("Marina Bay Sands")).toBeInTheDocument();
    expect(screen.getByText("Gardens by the Bay")).toBeInTheDocument();
    expect(screen.getAllByText("Chinatown").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sentosa").length).toBeGreaterThan(0);
    expect(document.body).not.toHaveTextContent(/\bChina\b|CNY|Compare Plans/i);
  });

  it("renders an accessible Singapore journey map and five-step planning story", () => {
    renderEnglishLanding();
    expect(screen.getByTestId("singapore-journey-map")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Singapore illustrated journey map" })).toBeInTheDocument();
    expect(screen.getByTestId("journey-carriage")).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: "\u628a\u65b0\u52a0\u5761\uff0c\u8d70\u6210\u5c5e\u4e8e\u4f60\u7684\u8282\u594f\u3002" })).toBeInTheDocument();
    expect(screen.getByText("\u6ee8\u6d77\u6e7e\u91d1\u6c99")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("zh-CN");
  });
});
