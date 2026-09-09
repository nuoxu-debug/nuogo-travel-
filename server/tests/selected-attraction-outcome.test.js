import { describe, expect, it } from "vitest";
import { buildSelectedAttractionOutcome } from "../src/services/itinerary/selectedAttractionOutcome.js";

const requested = [
  { requestId: "structured:A", xid: "A", displayName: { en: "Attraction A", zh: "景点A" } },
  { requestId: "structured:B", xid: "B", displayName: { en: "Attraction B", zh: "景点B" } }
];

describe("selected-attraction outcomes", () => {
  it("accounts for every request exactly once with localized natural reasons", () => {
    const outcome = buildSelectedAttractionOutcome({ requested, itinerary: { days: [{ activities: [{ xid: "A" }] }] }, structurallyExcluded: [], finalEvaluationRejected: [{ requestId: "structured:B", reasonCode: "SCHEDULE_FEASIBILITY" }] });
    expect(outcome.included.length + outcome.excluded.length).toBe(outcome.requested.length);
    expect(new Set([...outcome.included, ...outcome.excluded].map(({ requestId }) => requestId)).size).toBe(outcome.requested.length);
    expect(outcome.excluded[0].reason.zh).not.toMatch(/SCHEDULE|validator|score/i);
    expect(outcome.excluded[0].reason.en).toContain("was not included");
  });
  it.each(["UNAVAILABLE_ATTRACTION", "UNMATCHED_ATTRACTION", "AMBIGUOUS_ATTRACTION", "WRONG_CITY", "INVALID_GROUNDING", "BUDGET_FEASIBILITY", "ROUTE_FEASIBILITY", "DENSITY_FEASIBILITY", "CONTINUITY_FEASIBILITY", "COMBINED_FEASIBILITY"])("localizes %s", (reasonCode) => {
    const outcome = buildSelectedAttractionOutcome({ requested: [requested[1]], itinerary: { days: [] }, structurallyExcluded: reasonCode.includes("ATTRACTION") || ["WRONG_CITY", "INVALID_GROUNDING"].includes(reasonCode) ? [{ ...requested[1], reason: reasonCode }] : [], finalEvaluationRejected: reasonCode.includes("FEASIBILITY") ? [{ requestId: requested[1].requestId, reasonCode }] : [] });
    expect(outcome.excluded[0].reason).toEqual({ en: expect.any(String), zh: expect.any(String) });
  });
  it("refuses provisional deferral without final deterministic evidence", () => {
    expect(() => buildSelectedAttractionOutcome({ requested: [requested[1]], itinerary: { days: [] }, structurallyExcluded: [], finalEvaluationRejected: [] })).toThrow(/final outcome/i);
  });
});
