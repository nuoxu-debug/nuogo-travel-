import { z } from "zod";

const attractionCandidateSchema = z.object({
  xid: z.string().min(1),
  name: z.string().min(1),
  kinds: z.string(),
  coordinates: z.object({
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    coordinateSystem: z.literal("WGS84")
  }),
  displayName: z.object({ en: z.string().min(1), zh: z.string().min(1) }).optional(),
  description: z.object({ en: z.string().optional(), zh: z.string().optional() }).optional(),
  descriptionSourceType: z.enum(["OPENTRIPMAP_API", "DATABASE_BACKED"]).optional(),
  category: z.enum(["FOOD", "HISTORY", "CULTURE", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"]).optional(),
  suggestedVisitDurationMinutes: z.number().int().positive().optional(),
  durationSourceType: z.literal("ESTIMATED").optional(),
  verificationStatus: z.string().min(1).optional(),
  address: z.record(z.unknown()).optional(),
  previewUrl: z.string().url().optional(),
  city: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  providerMode: z.enum(["DEMO", "LIVE"]).optional(),
  sourceType: z.enum(["DEMO_FIXTURE", "OPENTRIPMAP_API"]).optional(),
  retrievedAt: z.string().datetime(),
  matchStatus: z.string().min(1)
}).strict();
const interestCategories = Object.freeze({
  FOOD: "RESTAURANT",
  HISTORY: "ATTRACTION",
  CULTURE: "ATTRACTION",
  NATURE: "ATTRACTION",
  SHOPPING: "OTHER",
  ENTERTAINMENT: "OTHER",
  FAMILY: "ATTRACTION"
});

export function buildCandidatePool(preferences, attractionCandidates) {
  const requestedCategories = new Set(
    (preferences.interests ?? preferences.activityPreferences ?? [])
      .map((interest) => interestCategories[interest])
      .filter(Boolean)
  );
  const candidates = [];
  const rejected = [];

  for (const input of attractionCandidates) {
    const poi = attractionCandidateSchema.parse(input);
    if (poi.city !== preferences.destination) {
      rejected.push({ xid: poi.xid, reason: "WRONG_CITY" });
      continue;
    }
    if (poi.matchStatus !== "MATCHED") {
      rejected.push({ xid: poi.xid, reason: poi.matchStatus });
      continue;
    }
    candidates.push({
      ...poi,
      candidateId: poi.xid,
      category: poi.category ?? "CULTURE",
      canonicalPoiId: poi.sourceType === "DEMO_FIXTURE" ? `demo:${poi.city}:${poi.xid}` : `opentripmap:${poi.city}:${poi.xid}`,
      primarySource: poi.sourceType === "DEMO_FIXTURE" ? "DEMO_FIXTURE" : "OPENTRIPMAP",
      ...(poi.sourceType === "DEMO_FIXTURE" ? {} : { openTripMapXid: poi.xid }),
      matchStatus: poi.matchStatus,
      verificationStatus: poi.verificationStatus ?? "SUPPORTING_ONLY",
      sourceRecords: [{
        provider: poi.sourceType === "DEMO_FIXTURE" ? "DEMO" : "OPENTRIPMAP",
        sourceId: poi.xid,
        ...(poi.sourceUrl ? { sourceUrl: poi.sourceUrl } : {}),
        retrievedAt: poi.retrievedAt
      }],
      interestMatch: requestedCategories.size === 0 ||
        requestedCategories.has(interestCategories[poi.category] ?? poi.category)
    });
  }

  candidates.sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  rejected.sort((left, right) => left.xid.localeCompare(right.xid));
  return {
    city: preferences.destination,
    candidateIds: candidates.map(({ candidateId: id }) => id),
    candidates,
    rejected
  };
}
