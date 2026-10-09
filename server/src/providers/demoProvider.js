import { getSpendingProfile } from "../services/budget/spendingProfiles.js";

function addDays(dateString, offset) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export class DemoPlanProvider {
  async generateStructured({ user }) {
    const payload = JSON.parse(user);
    const data = payload.UNTRUSTED_USER_DATA ?? payload.UNTRUSTED_REPAIR_DATA;
    const source = data.preferences ? data.preferences : data.draft.trip;
    const profile = data.profile ?? data.draft.travelStyle;
    const rawCandidates = (data.allowedCandidates ?? data.allowedCandidateIds.map((candidateId) => ({ candidateId })))
      .filter(({ candidateId }) => data.allowedCandidateIds.includes(candidateId));
    const broadAreaIds = new Set(["demo-sg-sentosa"]);
    const specificCandidates = rawCandidates.filter(({ candidateId }) => !broadAreaIds.has(candidateId));
    const candidates = specificCandidates.length >= 2 ? specificCandidates : rawCandidates;
    const strategy = getSpendingProfile(profile);
    const dayCount = Math.round(
      (new Date(`${source.endDate}T00:00:00Z`) - new Date(`${source.startDate}T00:00:00Z`)) / 86_400_000
    ) + 1;
    if (candidates.length < dayCount) throw new Error("The demo candidate pool is too small for this trip duration.");

    const selectedIds = new Set(data.selectedCandidateIds ?? []);
    const preferredNames = new Set((data.preferences?.preferredSights ?? []).map((name) => name.toLowerCase()));
    const preferred = candidates.filter(({ candidateId, name }) => selectedIds.has(candidateId) || preferredNames.has(String(name).toLowerCase()));
    const queue = [
      ...preferred,
      ...candidates.filter((item) => !preferred.includes(item))
    ];
    const used = new Set();
    const distance = (left, right) => {
      if (!left?.coordinates || !right?.coordinates) return Number.MAX_SAFE_INTEGER;
      const longitude = left.coordinates.longitude - right.coordinates.longitude;
      const latitude = left.coordinates.latitude - right.coordinates.latitude;
      return longitude * longitude + latitude * latitude;
    };
    const tooClose = (left, right) => distance(left, right) < 0.0000005;
    const eveningIds = new Set([
      "demo-sg-clarke-quay",
      "demo-sg-marina-bay-sands",
      "demo-sg-singapore-flyer",
      "demo-sg-wings-of-time",
      "demo-sg-skyhelix-sentosa"
    ]);
    const isEvening = ({ candidateId, name }) =>
      eveningIds.has(candidateId) || /clarke quay|marina bay sands|singapore flyer|wings of time|skyhelix/i.test(String(name));
    const take = (near, { evening = false } = {}) => {
      const available = queue.filter((candidate) => !used.has(candidate.candidateId) && (evening ? isEvening(candidate) : !isEvening(candidate)));
      const meaningful = near ? available.filter((candidate) => !tooClose(candidate, near)) : available;
      const options = meaningful.length ? meaningful : available;
      const item = near
        ? options.sort((left, right) => distance(left, near) - distance(right, near))[0]
        : available[0];
      if (item) used.add(item.candidateId);
      return item;
    };
    const toMinutes = (value) => {
      const [hours, minutes] = value.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const toTime = (value) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
    const activityType = (index) => ["HISTORY", "CULTURE", "NATURE"][index % 3];

    return JSON.stringify({
      travelStyle: profile,
      trip: {
        destination: source.destination,
        startDate: source.startDate,
        endDate: source.endDate,
        travellerCount: source.travellerCount,
        budgetMinor: source.budgetMinor,
        currency: "SGD"
      },
      days: Array.from({ length: dayCount }, (_, index) => {
        const dayStart = toMinutes("09:00");
        const requestedTarget = data.dayTargets?.find(({ dayNumber }) => dayNumber === index + 1)?.activityTarget ??
          source.dailyAttractionTarget ??
          strategy.fullDayActivityTarget;
        const target = Math.max(1, Number(requestedTarget) || strategy.fullDayActivityTarget);
        const selected = [];
        const attractionTarget = Math.max(1, target);
        while (selected.length < attractionTarget) {
          const attraction = take(selected.at(-1));
          if (!attraction) break;
          selected.push(attraction);
        }
        while (selected.length < attractionTarget) {
          const attraction = take(selected.at(-1), { evening: true });
          if (!attraction) break;
          selected.push(attraction);
        }
        if (selected.length >= attractionTarget && !selected.some(isEvening)) {
          const eveningAttraction = take(selected.at(-1), { evening: true });
          if (eveningAttraction) {
            const replaced = selected[selected.length - 1];
            if (replaced) used.delete(replaced.candidateId);
            selected[selected.length - 1] = eveningAttraction;
          }
        }
        const activities = selected.map((candidate, activityIndex) => ({
          sequence: activityIndex + 1,
          xid: candidate.candidateId,
          activityType: activityType(activityIndex),
          plannedStartTime: toTime(isEvening(candidate) ? 18 * 60 : Math.min(21 * 60, dayStart + 90 + activityIndex * 180)),
          plannedDurationMinutes: strategy.activityDurationMinutes,
          reason: source.language === "zh" ? "该景点与本次旅行偏好和当天路线相符。" : "This grounded attraction fits the trip preferences and the day's route."
        }));
        if (target > selected.length) {
          activities.splice(Math.min(1, activities.length), 0, {
            sequence: 2,
            activityType: "MEAL",
            sourceType: "AI_GENERATED",
            plannedStartTime: toTime(Math.min(21 * 60, dayStart + 180)),
            plannedDurationMinutes: 60,
            reason: source.language === "zh" ? "在当天行程中安排合理的用餐与休息时间。" : "Provides a practical meal and rest break within the day's schedule."
          });
        }
        activities.forEach((activity, activityIndex) => { activity.sequence = activityIndex + 1; });
        return {
          dayNumber: index + 1,
          date: addDays(source.startDate, index),
          startPoint: { locationId: "hotel", locationType: "HOTEL" },
          activities,
          endPoint: { locationId: "hotel", locationType: "HOTEL" }
        };
      })
    });
  }
}
