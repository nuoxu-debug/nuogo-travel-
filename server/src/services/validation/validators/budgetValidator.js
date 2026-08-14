export function validateBudget(itinerary) {
  if (itinerary.budgetSummary?.withinBudget && itinerary.budgetSummary.totalFen <= itinerary.budgetSummary.budgetFen) return [];
  return [{
    code: "BUDGET_EXCEEDED",
    path: ["budgetSummary", "totalFen"],
    severity: "ERROR",
    metadata: {
      totalFen: itinerary.budgetSummary?.totalFen,
      budgetFen: itinerary.budgetSummary?.budgetFen
    }
  }];
}
