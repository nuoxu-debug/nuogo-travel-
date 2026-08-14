import { itineraryDraftJsonSchema } from "@nuogo/shared/itinerary-draft-schema";
import { buildItineraryPrompt } from "./buildItineraryPrompt.js";
import { DraftBoundaryError, parseDraft } from "./parseDraft.js";

export async function planDraft({ preferences, profile, candidatePool }, { provider }) {
  if (!provider?.generateStructured) throw new TypeError("A structured itinerary provider is required.");
  const prompt = buildItineraryPrompt(preferences, profile, candidatePool);
  const raw = await provider.generateStructured({
    ...prompt,
    jsonSchema: itineraryDraftJsonSchema,
    temperature: 0.2
  });
  const draft = parseDraft(raw, candidatePool.candidateIds);
  const mismatched = draft.variant !== profile ||
    draft.trip.destination !== preferences.destination ||
    draft.trip.origin !== preferences.origin ||
    draft.trip.startDate !== preferences.startDate ||
    draft.trip.endDate !== preferences.endDate ||
    draft.trip.travellerCount !== preferences.travellerCount ||
    draft.trip.totalBudgetCny !== preferences.totalBudgetCny;
  if (mismatched) {
    throw new DraftBoundaryError("AI itinerary draft changed locked trip constraints.", {
      code: "DRAFT_CONTEXT_MISMATCH"
    });
  }
  return draft;
}
