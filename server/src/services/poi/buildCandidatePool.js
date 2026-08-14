import { canonicalPoiSchema } from "@nuogo/shared/schemas";

const allowedStatuses = new Set(["MATCHED", "PRIMARY_ONLY"]);
const interestCategories = Object.freeze({
  FOOD: "RESTAURANT",
  HISTORY: "ATTRACTION",
  CULTURE: "ATTRACTION",
  NATURE: "ATTRACTION",
  SHOPPING: "OTHER",
  ENTERTAINMENT: "OTHER",
  FAMILY: "ATTRACTION"
});

function candidateId(poi) {
  const sourceId = poi.amapPoiId ?? poi.openTripMapXid ?? poi.canonicalPoiId.split(":").at(-1);
  return `candidate:${poi.city}:${sourceId}`;
}

export function buildCandidatePool(preferences, canonicalPois) {
  const requestedCategories = new Set(
    (preferences.interests ?? preferences.activityPreferences ?? [])
      .map((interest) => interestCategories[interest])
      .filter(Boolean)
  );
  const candidates = [];
  const rejected = [];

  for (const input of canonicalPois) {
    const poi = canonicalPoiSchema.parse(input);
    if (poi.city !== preferences.destination) {
      rejected.push({ canonicalPoiId: poi.canonicalPoiId, reason: "WRONG_CITY" });
      continue;
    }
    if (!allowedStatuses.has(poi.verificationStatus)) {
      rejected.push({ canonicalPoiId: poi.canonicalPoiId, reason: poi.verificationStatus });
      continue;
    }
    candidates.push({
      ...poi,
      candidateId: candidateId(poi),
      interestMatch: requestedCategories.size === 0 || requestedCategories.has(poi.category)
    });
  }

  candidates.sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  rejected.sort((left, right) => left.canonicalPoiId.localeCompare(right.canonicalPoiId));
  return {
    city: preferences.destination,
    candidateIds: candidates.map(({ candidateId: id }) => id),
    candidates,
    rejected
  };
}
