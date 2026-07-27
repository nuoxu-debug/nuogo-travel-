import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";
import { demoTrip } from "./fixtures.js";

vi.mock("../src/components/Timeline.jsx", () => ({
  default: ({
    day,
    onAdd,
    onDelete,
    onRegenerate,
    onReorder
  }) => (
    <div>
      <button type="button" onClick={onAdd}>Test add</button>
      <button type="button" onClick={() => onDelete(day.activities[0])}>Test delete</button>
      <button type="button" onClick={() => onRegenerate(day.activities[0])}>
        Test regenerate activity
      </button>
      <button
        type="button"
        onClick={() => onReorder([...day.activities].reverse())}
      >
        Test reorder
      </button>
    </div>
  )
}));

vi.mock("../src/components/DayTabs.jsx", () => ({
  default: ({ onRegenerate }) => (
    <button type="button" onClick={onRegenerate}>Test regenerate day</button>
  )
}));

vi.mock("../src/components/BudgetPanel.jsx", async () => {
  const actual = await vi.importActual("../src/components/BudgetPanel.jsx");
  return {
    ...actual,
    default: ({ onCheaper }) => (
      <button type="button" onClick={onCheaper}>Test cheaper</button>
    )
  };
});

vi.mock("../src/components/ActivityModal.jsx", () => ({
  default: ({ activity, open, onSave }) => open ? (
    <button type="button" onClick={() => onSave(activity)}>Test save modal</button>
  ) : null
}));

describe("workspace collaborative mutation revisions", () => {
  let trip;
  let activity;
  let day;

  beforeEach(() => {
    trip = demoTrip();
    activity = trip.variants[0].days[0].activities[0];
    day = trip.variants[0].days[0];
    sessionStorage.setItem("nuogo-trip-trip-1", JSON.stringify(trip));

    fetch.mockImplementation(async (url, options) => {
      const request = JSON.parse(options.body);
      const revision = request.expectedRevision + 1;
      const budget = {
        categories: trip.variants[0].budget,
        total: 1470,
        remaining: 3330,
        limit: 4800,
        overBudget: false
      };
      if (url.endsWith("/activities")) {
        return {
          ok: true,
          json: async () => ({
            activity: { ...activity, id: "activity-new" },
            budget,
            revision
          })
        };
      }
      if (options.method === "DELETE") {
        return {
          ok: true,
          json: async () => ({ deletedId: activity.id, budget, revision })
        };
      }
      if (url.endsWith("/reorder") || url.endsWith("/regenerate") && url.includes("/days/")) {
        return {
          ok: true,
          json: async () => ({ day, budget, revision })
        };
      }
      return {
        ok: true,
        json: async () => ({ activity, budget, revision })
      };
    });
  });

  it("sends and consumes revisions for every non-edit workspace mutation", async () => {
    render(<App initialPath="/trip/trip-1" />);

    const actions = [
      "Test regenerate activity",
      "Test cheaper",
      "Test reorder",
      "Test regenerate day",
      "Test delete",
      "Test add",
      "Test save modal"
    ];
    const expectedUrls = [
      "/api/activities/jinli-budget/regenerate",
      "/api/activities/jinli-budget/cheaper-alternative",
      "/api/trips/trip-1/days/day-budget-1/reorder",
      "/api/trips/trip-1/days/day-budget-1/regenerate",
      "/api/activities/jinli-budget",
      "/api/trips/trip-1/days/day-budget-1/activities"
    ];

    for (const [index, action] of actions.entries()) {
      await userEvent.click(screen.getByRole("button", { name: action }));
      if (action === "Test add") continue;
      const expectedRevision = action === "Test save modal" ? 6 : index + 1;
      await waitFor(() => {
        expect(JSON.parse(sessionStorage.getItem("nuogo-trip-trip-1")).revision)
          .toBe(expectedRevision);
      });
    }

    expect(fetch).toHaveBeenCalledTimes(6);
    for (const [index, expectedUrl] of expectedUrls.entries()) {
      expect(fetch.mock.calls[index][0]).toBe(expectedUrl);
      expect(JSON.parse(fetch.mock.calls[index][1].body).expectedRevision).toBe(index);
    }
    expect(JSON.parse(fetch.mock.calls[2][1].body).activityIds)
      .toEqual([...day.activities].reverse().map(({ id }) => id));
  });
});
