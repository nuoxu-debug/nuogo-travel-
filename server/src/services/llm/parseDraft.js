import { itineraryDraftSchema } from "@nuogo/shared/schemas";
import { AppError } from "../../errors.js";

function jsonCandidate(raw) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  if (fenced) return fenced;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

export class DraftBoundaryError extends AppError {
  constructor(message, { code = "INVALID_ITINERARY_DRAFT", details } = {}) {
    super(message, { code, status: 422 });
    this.details = details;
  }
}

export function parseDraft(raw, allowedCandidateIds) {
  if (typeof raw !== "string" || !raw.trim()) throw new DraftBoundaryError("AI itinerary draft is empty.");
  let parsedJson;
  try {
    parsedJson = JSON.parse(jsonCandidate(raw));
  } catch (cause) {
    throw new DraftBoundaryError("AI itinerary draft is not valid JSON.", { details: cause.message });
  }
  const parsed = itineraryDraftSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new DraftBoundaryError("AI itinerary draft does not match the required schema.", {
      details: parsed.error.issues
    });
  }
  const allowed = new Set(allowedCandidateIds);
  const referencedIds = parsed.data.days.flatMap((day) => [
    ...day.activities.map(({ poiId }) => poiId),
    ...(day.startPoint.locationType === "POI" ? [day.startPoint.locationId] : []),
    ...(day.endPoint.locationType === "POI" ? [day.endPoint.locationId] : [])
  ]);
  const unknown = [...new Set(referencedIds.filter((id) => !allowed.has(id)))];
  if (unknown.length) {
    throw new DraftBoundaryError("AI itinerary draft contains unknown POI IDs.", {
      code: "UNKNOWN_POI",
      details: { ids: unknown }
    });
  }
  return parsed.data;
}
