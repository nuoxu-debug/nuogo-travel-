const weatherSensitiveKinds = /natural|garden|park|beach|viewpoint|mountain/i;
const lessSensitiveKinds = /museum|gallery|theatre|indoor|covered|aquarium|library/i;

function isWeatherSensitive(candidate, activity) {
  return candidate?.category === "NATURE" || activity.activityType === "NATURE" ||
    weatherSensitiveKinds.test(candidate?.kinds ?? "");
}

function isLessWeatherSensitive(candidate) {
  return candidate.category !== "NATURE" && lessSensitiveKinds.test(candidate.kinds ?? "");
}

export function buildRainyDayBackups({
  enabled,
  itinerary,
  candidatePool,
  remainingBudgetMinor = 0,
  estimateCostMinor = () => 0
}) {
  if (!enabled) return [];
  const byId = new Map(candidatePool.candidates.map((item) => [item.xid ?? item.candidateId, item]));
  const used = new Set(itinerary.days.flatMap((day) => day.activities.map(({ xid }) => xid).filter(Boolean)));
  const alternatives = candidatePool.candidates.filter((item) =>
    item.city === candidatePool.city && !used.has(item.xid ?? item.candidateId) && isLessWeatherSensitive(item));
  const backups = [];

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      const current = byId.get(activity.xid);
      if (!current || !isWeatherSensitive(current, activity)) continue;
      const index = alternatives.findIndex((item) => {
        const cost = estimateCostMinor(item);
        return cost <= (activity.estimatedActivityCostMinor ?? 0) + remainingBudgetMinor;
      });
      if (index < 0) continue;
      const [alternative] = alternatives.splice(index, 1);
      used.add(alternative.xid ?? alternative.candidateId);
      backups.push({
        dayNumber: day.dayNumber,
        activitySequence: activity.sequence,
        replacesXid: activity.xid,
        estimatedCostMinor: estimateCostMinor(alternative),
        costSourceType: "ESTIMATED",
        alternative
      });
    }
  }
  return backups;
}
