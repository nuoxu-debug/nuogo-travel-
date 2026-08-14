import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../src/App.jsx";

describe("assessed MVP scope", () => {
  it("does not expose the legacy public-share route", async () => {
    render(<App initialPath="/shared/legacy-token" enableLegacyFeatures={false} />);
    expect(await screen.findByRole("heading", { name: /Plan the whole journey/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Shared trip workspace")).not.toBeInTheDocument();
  });
});
