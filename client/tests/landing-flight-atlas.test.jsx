import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";

function setReducedMotion(matches) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));
}

describe("Flight Atlas landing experience", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens with an English route-planning promise and generic journey labels", () => {
    setReducedMotion(true);
    render(<App initialPath="/" />);

    expect(screen.getByRole("heading", { name: /Plan the whole journey/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start planning/i })).toHaveAttribute("href", "/planner");
    expect(screen.getAllByText("Departure").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stop 01").length).toBeGreaterThan(0);
    expect(screen.queryByText("Kuala Lumpur")).not.toBeInTheDocument();
    expect(screen.queryByText("Beijing")).not.toBeInTheDocument();
  });

  it("includes an accessible label-free journey map", () => {
    setReducedMotion(true);
    render(<App initialPath="/" />);

    expect(screen.getByRole("img", { name: "Animated journey across China" }))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Your journey, drawn as you move/i }))
      .toBeInTheDocument();
  });

  it("explains the three spending approaches without claiming live prices", () => {
    setReducedMotion(true);
    render(<App initialPath="/" />);

    expect(screen.getByText("Budget-Saving")).toBeInTheDocument();
    expect(screen.getByText("Balanced")).toBeInTheDocument();
    expect(screen.getByText("Comfort-Focused")).toBeInTheDocument();
    expect(screen.queryByText(/live price/i)).not.toBeInTheDocument();
  });
});
