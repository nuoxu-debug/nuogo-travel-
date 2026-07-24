import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RootErrorBoundary } from "../src/components/RootErrorBoundary.jsx";

function BrokenChild() {
  throw new Error("render failed");
}

describe("RootErrorBoundary", () => {
  it("shows a recovery screen for unexpected render errors", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <RootErrorBoundary>
        <BrokenChild />
      </RootErrorBoundary>
    );

    expect(screen.getByText("页面暂时无法显示")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回规划页" })).toBeInTheDocument();
  });
});
