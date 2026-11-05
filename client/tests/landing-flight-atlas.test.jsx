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
    expect(screen.getByText(/supported Singapore attraction entries/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /See How It Works/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Start Planning" })[0]).toHaveAttribute("href", "/discover/singapore");
    expect(screen.getByRole("link", { name: "Continue as guest" })).toHaveAttribute("href", "/discover/singapore");
    const collage = document.querySelector(".atlas-hero__destination-collage");
    expect([...collage.querySelectorAll("figcaption")].map((caption) => caption.textContent)).toEqual([
      "Paris, France", "Mount Fuji, Japan", "Great Wall, China", "New York, USA"
    ]);
    expect(collage.querySelectorAll("img")).toHaveLength(4);
  });

  it("presents the current Singapore story below the platform hero", () => {
    renderEnglishLanding();
    expect(screen.getByRole("heading", { name: "One city, more than one way to arrive." })).toBeInTheDocument();
    expect(screen.getAllByText("Gardens by the Bay").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chinatown").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kampong Glam").length).toBeGreaterThan(0);
    expect(screen.getByText(/From the bay's architecture/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore Singapore attractions" })).toHaveAttribute("href", "/discover/singapore");
    expect(document.body).not.toHaveTextContent(/Worldwide destinations available|Plan anywhere/i);
  });

  it("presents local Singapore attraction stories without leaving the MVP scope", () => {
    renderEnglishLanding();
    expect(screen.getByTestId("singapore-attraction-story")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /Singapore travel chapter/i })).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Explore Singapore attractions: Gardens by the Bay", exact: true })).toHaveAttribute("href", "/discover/singapore");
    expect(screen.queryByText("Marina Bay Sands")).not.toBeInTheDocument();
    expect(screen.getAllByText("Gardens by the Bay").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chinatown").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kampong Glam").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Little India").length).toBeGreaterThan(0);
    expect(document.body).not.toHaveTextContent(/CNY|Compare Plans/i);
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
    expect(screen.getByRole("heading", { name: "\u628a\u65b0\u52a0\u5761\uff0c\u8d70\u6210\u5c5e\u4e8e\u4f60\u7684\u8282\u594f\u3002" })).toBeInTheDocument();
    expect(screen.getAllByText("\u6ee8\u6d77\u6e7e\u82b1\u56ed").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: "\u95fa\u871c\u3001\u5bb6\u5ead\u4e0e\u60c5\u4fa3\u4f7f\u7528 Nuogo \u89c4\u5212\u65c5\u884c\u7684\u63d2\u753b\u62fc\u8d34" })).toHaveAttribute("src", "/images/landing/how-nuogo-works-collage.png");
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(document.querySelector(".atlas-hero__destination-collage")).toHaveTextContent("\u5df4\u9ece\uff0c\u6cd5\u56fd");
  });
});
