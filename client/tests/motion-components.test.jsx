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
          { label: "Huangshan North", meta: "08:10" },
          { label: "Hongcun", meta: "10:00" },
          { label: "Tunxi Old Street", meta: "17:20" }
        ]}
      />
    );

    expect(screen.getAllByRole("listitem").map((item) => item.textContent))
      .toEqual([
        expect.stringContaining("Huangshan North"),
        expect.stringContaining("Hongcun"),
        expect.stringContaining("Tunxi Old Street")
      ]);
  });

  it("keeps reveal content in the document", () => {
    render(<SectionReveal><h2>Build the route</h2></SectionReveal>);
    expect(screen.getByRole("heading", { name: "Build the route" })).toBeInTheDocument();
  });
});
