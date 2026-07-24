import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../src/App.jsx";
import { demoTrip } from "./fixtures.js";

describe("map, collaboration, and archive", () => {
  beforeEach(() => {
    sessionStorage.setItem("nuogo-trip-trip-1", JSON.stringify(demoTrip()));
  });

  it("selects the matching timeline activity from a map marker", async () => {
    render(<App initialPath="/trip/trip-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Map marker: People's Park" }));
    expect(screen.getByTestId("activity-people-park-budget")).toHaveAttribute("data-selected", "true");
  });

  it("creates an editable share link", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "sharetoken",
        permission: "edit",
        url: "http://localhost:5173/shared/sharetoken"
      })
    });
    render(<App initialPath="/trip/trip-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Share trip" }));
    await userEvent.click(screen.getByLabelText("Can edit"));
    await userEvent.click(screen.getByRole("button", { name: "Create link" }));
    expect(await screen.findByDisplayValue("http://localhost:5173/shared/sharetoken")).toBeInTheDocument();
  });

  it("classifies saved trips in the archive", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ trips: [demoTrip()] })
    });
    render(<App initialPath="/archive" />);
    expect(await screen.findByText("Chengdu food and culture")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Drafts" })).toHaveAttribute("aria-selected", "true");
  });

  it("lets members vote inside an editable shared trip", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trip: demoTrip(), permission: "edit", token: "sharetoken" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activityId: "jinli-budget", votes: 1 })
      });
    render(<App initialPath="/shared/sharetoken" />);
    await userEvent.click(await screen.findByRole("button", { name: "Vote for Jinli Ancient Street" }));
    expect(await screen.findByRole("button", { name: "Vote for Jinli Ancient Street (1 vote)" })).toBeInTheDocument();
  });
});
