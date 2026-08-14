import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";

describe("structured China preference planner", () => {
  it("shows bounded China controls and a live daily budget", async () => {
    render(<App initialPath="/planner" />);
    expect(screen.getByRole("combobox", { name: "Destination" })).toHaveValue("huangshan");
    const budget = screen.getByLabelText("Total budget");
    await userEvent.clear(budget);
    await userEvent.type(budget, "6000");
    expect(screen.getByText("¥1,500 / day")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /chat/i })).not.toBeInTheDocument();
  });

  it("summarises the whole trip brief from the live form values", async () => {
    render(<App initialPath="/planner" />);
    const horizon = screen.getByRole("region", { name: "Trip brief progress" });

    ["Origin", "Destination", "Dates", "Travel party", "Interests", "Budget"]
      .forEach((label) => expect(within(horizon).getByText(label)).toBeInTheDocument());
    expect(within(horizon).getByText("Shanghai → Huangshan, Anhui")).toBeInTheDocument();
    expect(within(horizon).getByText("¥4,800 total")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Departure city" }), "beijing");
    expect(within(horizon).getByText("Beijing → Huangshan, Anhui")).toBeInTheDocument();
  });

  it("offers Huangshan in both supported interface languages", () => {
    const { unmount } = render(<App initialPath="/planner" />);
    expect(screen.getAllByRole("option", { name: "Huangshan, Anhui" })).toHaveLength(2);
    unmount();

    localStorage.setItem("nuogo-language", "zh");
    render(<App initialPath="/planner" />);
    expect(screen.getAllByRole("option", { name: "安徽黄山" })).toHaveLength(2);
    expect(screen.getByRole("region", { name: "行程概览" })).toBeInTheDocument();
  });

  it("cycles the six-stage pipeline while generating", async () => {
    const intervalSpy = vi.spyOn(window, "setInterval");
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        trip: { id: "trip-1" },
        variants: []
      })
    });
    render(<App initialPath="/planner" />);
    await userEvent.click(screen.getByRole("button", { name: "Generate 3 plans" }));
    expect(await screen.findByRole("dialog", { name: "Generating itinerary" }))
      .toBeInTheDocument();
    const advancePipeline = intervalSpy.mock.calls.find(([, delay]) => delay === 45)?.[0];
    await act(async () => {
      for (let stage = 0; stage < 5; stage += 1) advancePipeline();
    });
    expect(screen.getByText("Rendering timeline & map routes")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/trips/generate"),
      expect.objectContaining({ method: "POST" })
    );
  });
});
