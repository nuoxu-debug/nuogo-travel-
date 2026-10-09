import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../src/App.jsx";
import { LanguageProvider } from "../src/context/LanguageContext.jsx";
import DailyItinerarySummary from "../src/components/DailyItinerarySummary.jsx";
import ItineraryActivityDetails from "../src/components/ItineraryActivityDetails.jsx";
import MealDetails from "../src/components/MealDetails.jsx";
import ProfileBudgetSummary from "../src/components/ProfileBudgetSummary.jsx";
import SelectedAttractionOutcome from "../src/components/SelectedAttractionOutcome.jsx";

function renderLocalized(ui, language = "zh") {
  localStorage.setItem("nuogo-language", language);
  localStorage.setItem("nuogo-language-default", "zh-v4");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("assessed MVP scope", () => {
  it.each(["/shared/legacy-token", "/invite/legacy-token"])("does not expose the removed route %s", async (path) => {
    render(<App initialPath={path} />);
    expect(await screen.findByRole("heading", { name: /Plan Smarter\. Travel Your Way\./i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Shared trip workspace")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /invitation/i })).not.toBeInTheDocument();
  });

  it("renders localized selected-attraction outcomes without developer codes", () => {
    renderLocalized(<SelectedAttractionOutcome outcome={{
      included: [{ requestId: "one", displayName: { en: "National Gallery Singapore", zh: "新加坡国家美术馆" } }],
      excluded: [{ requestId: "two", displayName: { en: "Singapore Botanic Gardens", zh: "新加坡植物园" }, reasonCode: "SCHEDULE_LIMIT", reason: { en: "It could not fit without excessive travel.", zh: "若加入会造成过度赶路，因此未能安排。" } }]
    }} mode="MANUAL" />);

    expect(screen.getByText("已加入的已选景点")).toBeVisible();
    expect(screen.getByText("未加入的已选景点")).toBeVisible();
    expect(screen.getByText("新加坡国家美术馆")).toBeVisible();
    expect(screen.getByText(/若加入会造成过度赶路/)).toBeVisible();
    expect(document.body).not.toHaveTextContent("SCHEDULE_LIMIT");
  });

  it("explains AUTO mode and preserves historical attraction preferences", () => {
    const auto = renderLocalized(<SelectedAttractionOutcome mode="AUTO" />);
    expect(screen.getByText(/已根据经过验证的目的地景点资料自动推荐/)).toBeVisible();
    auto.unmount();
    renderLocalized(<SelectedAttractionOutcome legacyPreferredSights={["Gardens by the Bay"]} />);
    expect(screen.getByText("历史偏好景点")).toBeVisible();
    expect(screen.getByText("Gardens by the Bay")).toBeVisible();
  });

  it("fills the AUTO attraction area with a useful recommendation preview", () => {
    renderLocalized(<SelectedAttractionOutcome mode="AUTO" />, "en");

    expect(screen.getByText("Recommendation pool preview")).toBeVisible();
    expect(screen.getByText("Gardens by the Bay")).toBeVisible();
    expect(screen.getByText("National Gallery Singapore")).toBeVisible();
    expect(screen.getByRole("link", { name: /Open Singapore discovery/i })).toHaveAttribute("href", "/discover/singapore");
  });

  it("shows reconciled profile budget arithmetic and hides a meaningless baseline", () => {
    const { rerender } = renderLocalized(<ProfileBudgetSummary summary={{
      budgetMinor: 600_000,
      baselineMandatoryCostMinor: 120_000,
      profileControlledCostMinor: 360_000,
      totalMinor: 480_000,
      remainingMinor: 120_000,
      utilisationPercent: 80
    }} />, "en");
    expect(screen.getByText("User budget")).toBeVisible();
    expect(screen.getByText("Baseline estimated cost")).toBeVisible();
    expect(screen.getByText("Planned experience cost")).toBeVisible();
    expect(screen.getByText("Budget utilization")).toBeVisible();
    expect(screen.getByText("80%")).toBeVisible();

    rerender(<LanguageProvider><ProfileBudgetSummary summary={{ budgetMinor: 600_000, baselineMandatoryCostMinor: 0, profileControlledCostMinor: 480_000, totalMinor: 480_000, remainingMinor: 120_000, utilisationPercent: 80 }} /></LanguageProvider>);
    expect(screen.queryByText("Baseline estimated cost")).not.toBeInTheDocument();
  });

  it("renders daily, attraction, and meal presentation without inventing a restaurant", () => {
    const presentation = {
      theme: { en: "Historic Singapore" }, activityCount: 3, attractionCount: 2,
      mealCount: 1, transportLegCount: 3, estimatedDailyCostMinor: 18_800
    };
    const attraction = { activityType: "HISTORY", presentation: {
      name: { en: "National Gallery Singapore" },
      description: { en: "A civic-district art museum." },
      reason: { en: "Fits the history and culture interests." }, startTime: "09:10", endTime: "10:40",
      durationMinutes: 90, estimatedCostMinor: 4_000, descriptionSourceType: "OPENTRIPMAP_API",
      reasonSourceType: "AI_GENERATED", costSourceType: "ESTIMATED"
    }};
    const meal = { activityType: "MEAL", presentation: {
      name: { en: "Lunch" }, area: { en: "Near the Civic District" },
      style: { en: "Balanced local meal" }, startTime: "12:15", endTime: "13:15",
      durationMinutes: 60, estimatedCostPerTravellerMinor: 6_000, reason: { en: "Adds a reasonable meal break." },
      reasonSourceType: "AI_GENERATED", costSourceType: "ESTIMATED"
    }};
    renderLocalized(<><DailyItinerarySummary day={{ dayNumber: 1, date: "2026-10-10", presentation }} /><ItineraryActivityDetails activity={attraction} /><MealDetails activity={meal} /></>, "en");
    expect(screen.getByText("Historic Singapore")).toBeVisible();
    expect(screen.getByText("A civic-district art museum.")).toBeVisible();
    expect(screen.getByText("OpenTripMap API")).toBeVisible();
    expect(screen.getByText("Near the Civic District")).toBeVisible();
    expect(document.body).toHaveTextContent("Estimated");
    expect(document.body).not.toHaveTextContent(/restaurant/i);
  });
});
