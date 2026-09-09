import { describe, expect, it, vi } from "vitest";
import { reconcileSelectedAttractions } from "../src/services/itinerary/reconcileSelectedAttractions.js";

const evaluation = { itinerary: { travelStyle: "BALANCED", days: [{ dayNumber: 1, date: "2026-10-10", activities: [{ sequence: 1, xid: "A", activityType: "HISTORY", plannedStartTime: "10:00", plannedDurationMinutes: 90 }], legs: [] }] }, summary: { withinBudget: true }, validation: { valid: true, issues: [] } };
const candidatePool = { candidates: [{ xid: "B", candidateId: "B", category: "CULTURE", suggestedVisitDurationMinutes: 90 }], candidateIds: ["A", "B"] };
const requested = [{ requestId: "structured:B", xid: "B", displayName: { en: "B", zh: "景点B" } }];

describe("selected attraction reconciliation", () => {
  it("attempts deterministic insertion through the complete evaluator", async () => {
    const evaluate = vi.fn(async (itinerary) => ({ ...evaluation, itinerary, validation: { valid: itinerary.days[0].activities.some(({ xid }) => xid === "B"), issues: [] } }));
    const result = await reconcileSelectedAttractions({ evaluation, requested, provisionallyDeferredSelected: requested, candidatePool, evaluate });
    expect(result.evaluation.itinerary.days.flatMap(({ activities }) => activities.map(({ xid }) => xid))).toContain("B");
    expect(evaluate).toHaveBeenCalled();
    expect(result.finalEvaluationRejected).toEqual([]);
  });
  it("rolls back failed probes and returns final feasibility evidence", async () => {
    const evaluate = vi.fn(async () => ({ ...evaluation, validation: { valid: false, issues: [{ code: "BUDGET_EXCEEDED" }] } }));
    const result = await reconcileSelectedAttractions({ evaluation, requested, provisionallyDeferredSelected: requested, candidatePool, evaluate });
    expect(result.evaluation).toBe(evaluation);
    expect(result.finalEvaluationRejected).toEqual([{ requestId: "structured:B", reasonCode: "BUDGET_FEASIBILITY" }]);
  });
});
