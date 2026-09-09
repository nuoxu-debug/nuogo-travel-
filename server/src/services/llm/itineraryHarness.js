import { itineraryDraftJsonSchema } from "@nuogo/shared/itinerary-draft-schema";
import { buildItineraryPrompt } from "./buildItineraryPrompt.js";
import { DraftBoundaryError, parseDraft } from "./parseDraft.js";

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
  const draft = parseDraft(raw, effectivePlan.allowedCandidateIds);
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
