import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RouteRail from "../src/components/RouteRail.jsx";
import ScrollProgress from "../src/components/ScrollProgress.jsx";
import SectionReveal from "../src/components/SectionReveal.jsx";

describe("Nuogo wayfinding motion components", () => {
  it("renders a decorative page progress indicator", () => {
    render(<ScrollProgress />);
    expect(screen.getByTestId("scroll-progress")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders route stops in travel order", () => {
    render(
      <RouteRail
        stops={[
          { label: "Marina Bay", meta: "08:10" },
          { label: "Gardens by the Bay", meta: "10:00" },
          { label: "Chinatown", meta: "17:20" }
        ]}
      />
    );

    expect(screen.getAllByRole("listitem").map((item) => item.textContent))
      .toEqual([
        expect.stringContaining("Marina Bay"),
        expect.stringContaining("Gardens by the Bay"),
        expect.stringContaining("Chinatown")
      ]);
  });

  it("keeps reveal content in the document", () => {
    render(<SectionReveal><h2>Build the route</h2></SectionReveal>);
    expect(screen.getByRole("heading", { name: "Build the route" })).toBeInTheDocument();
  });
});
