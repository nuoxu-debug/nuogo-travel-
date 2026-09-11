import { itineraryDraftJsonSchema } from "@nuogo/shared/itinerary-draft-schema";
import { buildItineraryPrompt } from "./buildItineraryPrompt.js";
import { DraftBoundaryError, parseDraft } from "./parseDraft.js";

function normalizeInternalEndpoints(draft, allowedCandidateIds) {
  const allowed = new Set(["hotel", "origin", "destination", ...allowedCandidateIds]);
  const hotel = { locationId: "hotel", locationType: "HOTEL" };
  const endpoint = (point) => allowed.has(point.locationId) ? point : hotel;
  return {
    ...draft,
    days: draft.days.map((day) => ({
      ...day,
      startPoint: endpoint(day.startPoint),
      endPoint: endpoint(day.endPoint)
    }))
  };
}

export async function planDraft({ preferences, profilePlan, candidatePool }, { provider }) {
  if (!provider?.generateStructured) throw new TypeError("A structured itinerary provider is required.");
  const profile = preferences.travelStyle;
  const effectivePlan = profilePlan ?? { allowedCandidateIds: candidatePool.candidateIds, selectedCandidateIds: [], profileGuidance: "Follow the requested spending profile within the hard budget." };
  const prompt = buildItineraryPrompt(preferences, effectivePlan, candidatePool);
  const raw = await provider.generateStructured({
    ...prompt,
    jsonSchema: itineraryDraftJsonSchema,
    temperature: 0.2
  });
  const draft = normalizeInternalEndpoints(
    parseDraft(raw, effectivePlan.allowedCandidateIds),
    effectivePlan.allowedCandidateIds
  );
  const mismatched = draft.travelStyle !== profile ||
    draft.trip.destination !== preferences.destination ||
    draft.trip.startDate !== preferences.startDate ||
    draft.trip.endDate !== preferences.endDate ||
    draft.trip.travellerCount !== preferences.travellerCount ||
    draft.trip.budgetMinor !== preferences.budgetMinor ||
    draft.trip.currency !== "SGD";
  if (mismatched) {
    throw new DraftBoundaryError("AI itinerary draft changed locked trip constraints.", {
      code: "DRAFT_CONTEXT_MISMATCH"
    });
  }
  return draft;
}
