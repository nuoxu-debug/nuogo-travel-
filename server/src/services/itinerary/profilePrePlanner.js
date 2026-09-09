import { getSpendingProfile, profileWeights } from "../budget/spendingProfiles.js";
import { buildCandidateFeatures } from "../poi/buildCandidateFeatures.js";

const utilisationBands = Object.freeze({ BUDGET_SAVING: [.55, .70], BALANCED: [.75, .90], COMFORT_FOCUSED: [.90, 1] });
const guidance = Object.freeze({
  BUDGET_SAVING: "Prioritise good-value grounded experiences and efficient public transport without artificial spending.",
  BALANCED: "Balance grounded sights, route continuity, food, and rest within the hard budget.",
  COMFORT_FOCUSED: "Use available budget for meaningful comfort, convenience, and experience value without exceeding it."
});

export function buildProfilePlan({ profile, preferences, candidatePool, resolvedPreferences, budgetContext, anchors }) {
  const definition = getSpendingProfile(profile); const weights = profileWeights[profile];
  const selectedCandidateIds = resolvedPreferences.supported.map(({ xid, candidateId }) => xid ?? candidateId);
  const provisionallyDeferredSelected = resolvedPreferences.supported.filter((candidate) => candidate.approximateScheduleFeasible === false || (Number.isFinite(candidate.estimatedCostMinor) && candidate.estimatedCostMinor > budgetContext.allocatableBudgetMinor)).map((candidate) => ({ xid: candidate.xid ?? candidate.candidateId, displayName: candidate.displayName?.en ?? candidate.name }));
  const selectedSet = new Set(selectedCandidateIds); const ranked = []; const selectedCandidates = [...resolvedPreferences.supported];
  const remaining = candidatePool.candidates.filter((candidate) => !selectedSet.has(candidate.xid ?? candidate.candidateId));
  while (remaining.length) {
    const scored = remaining.map((candidate) => { const features = buildCandidateFeatures(candidate, { preferences, selectedIds: selectedSet, selectedCandidates, routeContext: { currentLocation: selectedCandidates.at(-1)?.coordinates ?? anchors?.hotel } }); const score = Object.entries(features).reduce((sum, [key, value]) => sum + value * weights[key], 0); return { candidate, score }; });
    scored.sort((left, right) => right.score - left.score || (left.candidate.xid ?? left.candidate.candidateId).localeCompare(right.candidate.xid ?? right.candidate.candidateId));
    const next = scored[0].candidate; ranked.push(next.xid ?? next.candidateId); selectedCandidates.push(next); remaining.splice(remaining.indexOf(next), 1);
  }
  const dayCount = Math.floor((Date.parse(`${preferences.endDate}T00:00:00Z`) - Date.parse(`${preferences.startDate}T00:00:00Z`)) / 86400000) + 1;
  const capacity = Math.max(selectedCandidateIds.length, dayCount * definition.fullDayActivityTarget);
  return { profile, selectedCandidateIds, structurallyExcludedSelected: [...resolvedPreferences.unresolved], provisionallyDeferredSelected, rankedSupplementalIds: ranked, allowedCandidateIds: [...selectedCandidateIds, ...ranked].slice(0, capacity), dayTargets: Array.from({ length: dayCount }, (_, index) => ({ dayNumber: index + 1, activityTarget: definition.fullDayActivityTarget })), softUtilisationBand: utilisationBands[profile], profileGuidance: guidance[profile] };
}
