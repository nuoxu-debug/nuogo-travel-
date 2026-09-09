import { describe, expect, it } from "vitest";
import { buildProfileBudgetContext, summarizeProfileSpend, targetProfileControlledSpend } from "../src/services/budget/profileBudget.js";
import { demoCostReferenceFixtures } from "../src/services/budget/demoCostReferenceFixtures.js";
import { resolveCostReferences } from "../src/services/budget/costReferenceService.js";

const references = resolveCostReferences(demoCostReferenceFixtures("singapore"), { city: "singapore" });
const preferences = { startDate: "2026-10-10", endDate: "2026-10-12", travellerCount: 2, budgetMinor: 600_000 };

describe("profile budget decomposition", () => {
  it("calculates mandatory Singapore floors before drafting", () => {
    expect(buildProfileBudgetContext(preferences, references)).toMatchObject({
      userBudgetMinor: 600_000,
      baselineMandatoryCostMinor: 36_868,
      allocatableBudgetMinor: 563_132,
      dimensions: { days: 3, nights: 2, rooms: 1, meals: 9, travellers: 2 }
    });
  });

  it("sums baseline plus uplift exactly once", () => {
    const context = buildProfileBudgetContext(preferences, references);
    const summary = summarizeProfileSpend({ budgetContext: context, categoriesMinor: {
      ...context.baselineCategoriesMinor,
      accommodation: 60_000,
      foodAndBeverages: 50_000,
      localTransportation: 10_000,
      attractionTickets: 20_000
    } });
    expect(summary.totalMinor).toBe(summary.baselineMandatoryCostMinor + summary.profileControlledCostMinor);
    expect(summary.categoryComponentsMinor.accommodation.finalMinor).toBe(
      summary.categoryComponentsMinor.accommodation.baselineMinor + summary.categoryComponentsMinor.accommodation.profileUpliftMinor
    );
    expect(summary.withinBudget).toBe(true);
  });

  it("clamps profile targets when no allocatable budget remains", () => {
    const context = buildProfileBudgetContext({ ...preferences, budgetMinor: 100 }, references);
    expect(context.allocatableBudgetMinor).toBe(0);
    expect(targetProfileControlledSpend(context, [.9, 1])).toBe(0);
  });
});
