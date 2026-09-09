export function validateBudget(itinerary) {
  if (itinerary.budgetSummary?.withinBudget && itinerary.budgetSummary.totalMinor <= itinerary.budgetSummary.budgetMinor) return [];
  return [{
    code: "BUDGET_EXCEEDED",
    path: ["budgetSummary", "totalMinor"],
    severity: "ERROR",
    metadata: {
      totalMinor: itinerary.budgetSummary?.totalMinor,
      budgetMinor: itinerary.budgetSummary?.budgetMinor
    }
  }];
}
