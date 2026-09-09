const reasonForIssues = (issues) => {
  const codes = new Set(issues.map(({ code }) => code));
  if ([...codes].some((code) => code.includes("BUDGET"))) return "BUDGET_FEASIBILITY";
  if ([...codes].some((code) => code.includes("DENSITY"))) return "DENSITY_FEASIBILITY";
  if ([...codes].some((code) => code.includes("ROUTE") || code.includes("BACKTRACK"))) return "ROUTE_FEASIBILITY";
  if ([...codes].some((code) => code.includes("CONTINUITY") || code.includes("LEG"))) return "CONTINUITY_FEASIBILITY";
  if ([...codes].some((code) => code.includes("SCHEDULE") || code.includes("TIME"))) return "SCHEDULE_FEASIBILITY";
  return "COMBINED_FEASIBILITY";
};

function insertCandidate(itinerary, candidate, dayIndex, position) {
  const next = structuredClone(itinerary);
  const activities = next.days[dayIndex].activities;
  activities.splice(position, 0, {
    sequence: position + 1,
    xid: candidate.xid ?? candidate.candidateId,
    activityType: candidate.category ?? "CULTURE",
    plannedStartTime: activities[Math.max(0, position - 1)]?.plannedStartTime ?? "10:00",
    plannedDurationMinutes: candidate.suggestedVisitDurationMinutes ?? 90,
    reason: "This selected grounded attraction was added during itinerary reconciliation."
  });
  activities.forEach((activity, index) => { activity.sequence = index + 1; });
  return next;
}

export async function reconcileSelectedAttractions({ evaluation, requested, provisionallyDeferredSelected = [], candidatePool, evaluate }) {
  let accepted = evaluation; const finalEvaluationRejected = [];
  const included = () => new Set(accepted.itinerary.days.flatMap(({ activities }) => activities.map(({ xid }) => xid).filter(Boolean)));
  const deferredIds = new Set(provisionallyDeferredSelected.map(({ xid }) => xid));
  for (const request of requested) {
    if (included().has(request.xid)) continue;
    const candidate = candidatePool.candidates.find(({ xid, candidateId }) => (xid ?? candidateId) === request.xid);
    if (!candidate) continue;
    let best = null; const issues = [];
    for (let dayIndex = 0; dayIndex < accepted.itinerary.days.length && !best; dayIndex += 1) {
      for (let position = 0; position <= accepted.itinerary.days[dayIndex].activities.length; position += 1) {
        const probe = await evaluate(insertCandidate(accepted.itinerary, candidate, dayIndex, position));
        if (probe.validation.valid && probe.summary?.withinBudget !== false) { best = probe; break; }
        issues.push(...(probe.validation.issues ?? []));
      }
    }
    if (best) accepted = best;
    else finalEvaluationRejected.push({ requestId: request.requestId, reasonCode: reasonForIssues(issues.length ? issues : deferredIds.has(request.xid) ? [{ code: "COMBINED" }] : []) });
  }
  return { evaluation: accepted, finalEvaluationRejected };
}
