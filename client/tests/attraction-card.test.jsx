import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AttractionCard from "../src/components/AttractionCard.jsx";

describe("AttractionCard", () => {
  const sampleAttraction = {
    xid: "demo-sg-artscience-museum",
    name: { zh: "艺术科学博物馆", en: "ArtScience Museum" },
    description: { zh: "以莲花造型闻名的博物馆。", en: "Lotus-shaped museum." },
    category: "CULTURE",
    suggestedVisitDurationMinutes: 120,
    providerMode: "DEMO",
    sourceType: "DEMO_FIXTURE"
  };

  it("renders authentic attraction photo with alt text", () => {
    render(
      <AttractionCard
        attraction={sampleAttraction}
        language="zh"
        selected={false}
        selectionEnabled={true}
        onToggle={vi.fn()}
        onFocus={vi.fn()}
      />
    );

    const img = screen.getByRole("img", { name: "艺术科学博物馆" });
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toContain("artscience-museum.jpg");
    expect(screen.getByText("艺术科学博物馆")).toBeInTheDocument();
    expect(screen.getByText("演示资料")).toBeInTheDocument();
  });

  it("falls back to icon if image fails to load", () => {
    render(
      <AttractionCard
        attraction={sampleAttraction}
        language="zh"
        selected={false}
        selectionEnabled={true}
        onToggle={vi.fn()}
        onFocus={vi.fn()}
      />
    );

    const img = screen.getByRole("img", { name: "艺术科学博物馆" });
    fireEvent.error(img);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
