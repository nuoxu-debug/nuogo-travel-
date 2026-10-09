import { resolveOperatingHours } from "../operatingHours/operatingHoursService.js";
import { estimateTravelLeg as defaultEstimateTravelLeg } from "../travel/estimateTravelTime.js";

const weatherSensitiveKinds = /natural|garden|park|beach|viewpoint|mountain/i;
const lessSensitiveKinds = /museum|gallery|theatre|indoor|covered|aquarium|library/i;
const lessSensitiveName = /\b(museum|gallery|aquarium|library|theatre|theater|indoor|covered)\b/i;

function minutes(value) {
  if (!value) return undefined;
  const [hours, mins] = String(value).slice(0, 5).split(":").map(Number);
  return Number.isInteger(hours) && Number.isInteger(mins) ? hours * 60 + mins : undefined;
}

function candidateName(candidate) {
  return [
    candidate.name,
    candidate.displayName?.en,
    candidate.displayName?.zh
  ].filter(Boolean).join(" ");
}

function isWeatherSensitive(candidate, activity) {
  return candidate?.category === "NATURE" || activity.activityType === "NATURE" ||
    weatherSensitiveKinds.test(candidate?.kinds ?? "");
}

function isLessWeatherSensitive(candidate) {
  if (candidate.category === "NATURE") return false;
  return lessSensitiveKinds.test(candidate.kinds ?? "") || lessSensitiveName.test(candidateName(candidate));
}

function suitabilityRule(candidate) {
  if (candidate.category === "NATURE") return undefined;
  if (lessSensitiveKinds.test(candidate.kinds ?? "")) return "KINDS_LESS_WEATHER_SENSITIVE";
  if (lessSensitiveName.test(candidateName(candidate))) return "NAME_LESS_WEATHER_SENSITIVE";
  return undefined;
}

function rainyDayCostMinor(candidate, estimateCostMinor) {
  return Number.isFinite(candidate.estimatedCostMinor)
    ? candidate.estimatedCostMinor
    : estimateCostMinor(candidate);
}

function poiCoordinates(activity) {
  return activity?.poi?.coordinates ?? activity?.coordinates;
}

function candidateCoordinates(candidate) {
  return candidate?.coordinates;
}

function endpointCoordinates(point) {
  return point?.coordinates;
}

function backupOpeningHoursValid({ candidate, activity, day, candidatePool }) {
  if (!candidatePool.operatingHours) return true;
  const result = resolveOperatingHours({
    poiId: candidate.canonicalPoiId ?? candidate.candidateId ?? candidate.xid,
    date: day.date,
    scheduledStartTime: activity.scheduledStartTime ?? activity.plannedStartTime,
    scheduledEndTime: activity.scheduledEndTime,
    weeklyHours: candidatePool.operatingHours.weeklyHours ?? [],
    exceptions: candidatePool.operatingHours.exceptions ?? []
  });
  return result.state === "VERIFIED_OPEN";
}

function backupTravelTimeValid({
  candidate,
  activity,
  day,
  activityIndex,
  estimateTravelLeg,
  travelMode
}) {
  const coordinates = candidateCoordinates(candidate);
  if (!coordinates) return false;

  const start = minutes(activity.scheduledStartTime ?? activity.plannedStartTime);
  const end = minutes(activity.scheduledEndTime);
  if (start === undefined || end === undefined || end <= start) return true;

  const previous = day.activities[activityIndex - 1];
  const previousCoordinates = previous ? poiCoordinates(previous) : endpointCoordinates(day.startPoint);
  const previousEnd = previous ? minutes(previous.scheduledEndTime) : undefined;
  if (previousCoordinates) {
    const incoming = estimateTravelLeg({ from: previousCoordinates, to: coordinates, mode: travelMode });
    if (previousEnd !== undefined && previousEnd + incoming.durationMinutes > start) return false;
  }

  const next = day.activities[activityIndex + 1];
  const nextCoordinates = next ? poiCoordinates(next) : endpointCoordinates(day.endPoint);
  const nextStart = next ? minutes(next.scheduledStartTime ?? next.plannedStartTime) : undefined;
  if (nextCoordinates) {
    const outgoing = estimateTravelLeg({ from: coordinates, to: nextCoordinates, mode: travelMode });
    if (nextStart !== undefined && end + outgoing.durationMinutes > nextStart) return false;
  }

  return true;
}

function backupCandidateValid({
  candidate,
  activity,
  day,
  activityIndex,
  candidatePool,
  estimateTravelLeg,
  travelMode
}) {
  if (!candidate.canonicalPoiId && !candidate.candidateId && !candidate.xid) return false;
  if (candidate.city !== candidatePool.city) return false;
  if (candidate.matchStatus && candidate.matchStatus !== "MATCHED") return false;
  if (!backupOpeningHoursValid({ candidate, activity, day, candidatePool })) return false;
  return backupTravelTimeValid({
    candidate,
    activity,
    day,
    activityIndex,
    estimateTravelLeg,
    travelMode
  });
}

export function buildRainyDayBackups({
  enabled,
  itinerary,
  candidatePool,
  remainingBudgetMinor = 0,
  estimateCostMinor = () => 0,
  estimateTravelLeg = defaultEstimateTravelLeg,
  travelMode = "PUBLIC_TRANSIT"
}) {
  if (!enabled) return [];
  const byId = new Map(candidatePool.candidates.map((item) => [item.xid ?? item.candidateId, item]));
  const used = new Set(itinerary.days.flatMap((day) => day.activities.map(({ xid }) => xid).filter(Boolean)));
  const alternatives = candidatePool.candidates.filter((item) =>
    item.city === candidatePool.city && !used.has(item.xid ?? item.candidateId) && isLessWeatherSensitive(item));
  const backups = [];

  for (const day of itinerary.days) {
    for (const [activityIndex, activity] of day.activities.entries()) {
      const current = byId.get(activity.xid);
      if (!current || !isWeatherSensitive(current, activity)) continue;
      const index = alternatives.findIndex((item) => {
        const cost = rainyDayCostMinor(item, estimateCostMinor);
        return cost <= (activity.estimatedActivityCostMinor ?? 0) + remainingBudgetMinor &&
          backupCandidateValid({
            candidate: item,
            activity,
            day,
            activityIndex,
            candidatePool,
            estimateTravelLeg,
            travelMode
          });
      });
      if (index < 0) continue;
      const [alternative] = alternatives.splice(index, 1);
      const rule = suitabilityRule(alternative);
      used.add(alternative.xid ?? alternative.candidateId);
      backups.push({
        dayNumber: day.dayNumber,
        activitySequence: activity.sequence,
        replacesXid: activity.xid,
        replacesDisplayName: activity.displayName ?? activity.poi?.displayName ?? activity.poi?.name,
        estimatedCostMinor: rainyDayCostMinor(alternative, estimateCostMinor),
        costSourceType: "ESTIMATED",
        suitabilityRule: rule,
        openingHoursValid: candidatePool.operatingHours ? true : undefined,
        surroundingTravelTimeValid: true,
        alternative
      });
    }
  }
  return backups;
}
