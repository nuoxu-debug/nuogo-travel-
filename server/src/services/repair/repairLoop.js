import { deterministicRepair } from "./deterministicRepair.js";

function toMinutes(value) {
  if (!value) return undefined;
  const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : undefined;
}

function toTime(value) {
  if (value === undefined) return undefined;
  const bounded = Math.max(0, Math.min((24 * 60) - 1, Math.trunc(value)));
  const hours = Math.floor(bounded / 60);
  const minutes = bounded % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function activityEndTime(activity) {
  if (activity.scheduledEndTime) return activity.scheduledEndTime;
  const start = toMinutes(activity.plannedStartTime);
  if (start === undefined) return undefined;
  return toTime(start + (Number(activity.plannedDurationMinutes) || 0));
}

function scheduleSignature(itinerary) {
  return JSON.stringify((itinerary.days ?? []).flatMap((day, dayIndex) =>
    (day.activities ?? []).map((activity, activityIndex) => [
      dayIndex,
      day.date ?? null,
      activityIndex,
      activity.xid ?? activity.poi?.canonicalPoiId ?? activity.activityType ?? null,
      activity.plannedStartTime ?? activity.scheduledStartTime ?? null,
      activityEndTime(activity) ?? null
    ])));
}

function validationErrorSignature(issues = []) {
  return JSON.stringify(issues
    .filter(({ severity }) => severity !== "WARNING")
    .map(({ code, path }) => ({ code, path }))
    .sort((left, right) =>
      String(left.code).localeCompare(String(right.code)) ||
      JSON.stringify(left.path).localeCompare(JSON.stringify(right.path))));
}

export async function repairUntilValid(context, { maxAttempts = 20 } = {}) {
  const attemptLimit = Math.max(1, Math.min(20, Math.trunc(maxAttempts) || 20));
  let itinerary = context.itinerary;
  let validation = { valid: false, issues: [] };
  let summary;
  let attempts = 0;
  const repairs = [];
  const seenFailureSignatures = new Set();
  let semanticRepairUsed = false;
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
    const convergenceSignature = `${scheduleSignature(itinerary)}|${validationErrorSignature(validation.issues)}`;
    if (seenFailureSignatures.has(convergenceSignature) && repairs.at(-1)?.action === "DETERMINISTIC_REPAIR") {
      repairs.push({ attempt: attempts, issueCodes, action: "REPAIR_CYCLE_DETECTED" });
      break;
    }
    seenFailureSignatures.add(convergenceSignature);

    const repaired = deterministicRepair(itinerary, validation.issues, {
      candidatePool: context.candidatePool,
      preferences: context.preferences
    });
    if (repaired.changed) {
      if (attempts >= attemptLimit) {
        repairs.push({ attempt: attempts, issueCodes, action: "ATTEMPT_LIMIT_REACHED" });
        break;
      }
      repairs.push({ attempt: attempts, issueCodes, action: "DETERMINISTIC_REPAIR" });
      itinerary = repaired.itinerary;
      continue;
    }
    if (attempts >= attemptLimit) {
      repairs.push({ attempt: attempts, issueCodes, action: "ATTEMPT_LIMIT_REACHED" });
      break;
    }
    if (issueCodes.every((code) => code === "MEAL_CADENCE_MISSING")) {
      repairs.push({ attempt: attempts, issueCodes, action: "NO_REPAIR_AVAILABLE" });
      break;
    }
    if (!context.semanticRepair) {
      repairs.push({ attempt: attempts, issueCodes, action: "NO_REPAIR_AVAILABLE" });
      break;
    }
    if (semanticRepairUsed) {
      repairs.push({ attempt: attempts, issueCodes, action: "NO_REPAIR_AVAILABLE" });
      break;
    }
    semanticRepairUsed = true;
    repairs.push({ attempt: attempts, issueCodes, action: "AI_REPAIR" });
    itinerary = await context.semanticRepair({
      itinerary,
      issues: validation.issues,
      allowedCandidateIds: [...context.candidatePool.candidateIds],
      candidates: [...(context.candidatePool.candidates ?? [])],
      candidatePool: context.candidatePool
    });
  }

  return finish("FAILED");
}
