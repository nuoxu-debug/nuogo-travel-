import { deterministicRepair } from "./deterministicRepair.js";

export async function repairUntilValid(context, { maxAttempts = 3 } = {}) {
  const attemptLimit = Math.max(1, Math.min(3, Math.trunc(maxAttempts) || 3));
  let itinerary = context.itinerary;
  let validation = { valid: false, issues: [] };
  let summary;
  let attempts = 0;

  while (attempts < attemptLimit) {
    attempts += 1;
    const evaluated = await context.evaluate(itinerary);
    itinerary = evaluated.itinerary;
    validation = evaluated.validation;
    summary = evaluated.summary ?? itinerary.budgetSummary;
    if (validation.valid) {
      return { state: "FINAL_VALIDATED", itinerary, summary, validation, attempts };
    }
    if (attempts >= attemptLimit) break;

    const repaired = deterministicRepair(itinerary, validation.issues, {
      candidatePool: context.candidatePool,
      preferences: context.preferences
    });
    if (repaired.changed) {
      itinerary = repaired.itinerary;
      continue;
    }
    if (!context.semanticRepair) break;
    itinerary = await context.semanticRepair({
      itinerary,
      issues: validation.issues,
      allowedCandidateIds: [...context.candidatePool.candidateIds],
      candidatePool: context.candidatePool
    });
  }

  return { state: "FAILED", itinerary, summary, validation, attempts };
}
