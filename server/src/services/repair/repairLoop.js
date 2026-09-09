import { deterministicRepair } from "./deterministicRepair.js";

export async function repairUntilValid(context, { maxAttempts = 2 } = {}) {
  const attemptLimit = Math.max(1, Math.min(2, Math.trunc(maxAttempts) || 2));
  let itinerary = context.itinerary;
  let validation = { valid: false, issues: [] };
  let summary;
  let attempts = 0;
  const repairs = [];
  const finish = (state) => ({
    state,
    itinerary,
    summary,
    validation,
    attempts,
    repairs: repairs.map((repair) => ({ ...repair, finalState: state }))
  });

  while (attempts < attemptLimit) {
    attempts += 1;
    const evaluated = await context.evaluate(itinerary);
    itinerary = evaluated.itinerary;
    validation = evaluated.validation;
    summary = evaluated.summary ?? itinerary.budgetSummary;
    if (validation.valid) {
      return finish("FINAL_VALIDATED");
    }
    const issueCodes = [...new Set(validation.issues.map(({ code }) => code))];
    if (attempts >= attemptLimit) {
      repairs.push({ attempt: attempts, issueCodes, action: "ATTEMPT_LIMIT_REACHED" });
      break;
    }

    const repaired = deterministicRepair(itinerary, validation.issues, {
      candidatePool: context.candidatePool,
      preferences: context.preferences
    });
    if (repaired.changed) {
      repairs.push({ attempt: attempts, issueCodes, action: "DETERMINISTIC_REPAIR" });
      itinerary = repaired.itinerary;
      continue;
    }
    if (!context.semanticRepair) {
      repairs.push({ attempt: attempts, issueCodes, action: "NO_REPAIR_AVAILABLE" });
      break;
    }
    repairs.push({ attempt: attempts, issueCodes, action: "AI_REPAIR" });
    itinerary = await context.semanticRepair({
      itinerary,
      issues: validation.issues,
      allowedCandidateIds: [...context.candidatePool.candidateIds],
      candidatePool: context.candidatePool
    });
  }

  return finish("FAILED");
}
