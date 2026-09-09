const clamp = (value) => Math.max(0, Math.min(1, value));
function distanceKm(left, right) {
  const radians = (value) => value * Math.PI / 180;
  const dLat = radians(right.latitude - left.latitude); const dLon = radians(right.longitude - left.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(left.latitude)) * Math.cos(radians(right.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildCandidateFeatures(candidate, { preferences, selectedIds, routeContext, selectedCandidates }) {
  const costEfficiency = Number.isFinite(candidate.estimatedCostMinor) ? clamp(1 - candidate.estimatedCostMinor / 20000) : .5;
  const canMeasureRoute = routeContext?.currentLocation && candidate.coordinates;
  const travelEfficiency = canMeasureRoute ? clamp(1 - distanceKm(routeContext.currentLocation, candidate.coordinates) / 30) : .5;
  const priorCategories = new Set((selectedCandidates ?? []).map(({ category }) => category));
  const preferenceMatch = candidate.interestMatch ?? (preferences.interests ?? []).includes(candidate.category);
  return {
    selectedAttractionPriority: selectedIds?.has(candidate.xid ?? candidate.candidateId) ? 1 : 0,
    preferenceMatch: preferenceMatch ? 1 : 0,
    costEfficiency,
    travelEfficiency,
    categoryDiversity: priorCategories.has(candidate.category) ? .25 : 1,
    comfortScore: Number.isFinite(candidate.comfortScore) ? clamp(candidate.comfortScore) : .5,
    activityValue: Number.isFinite(candidate.activityValue) ? clamp(candidate.activityValue) : .5
  };
}
