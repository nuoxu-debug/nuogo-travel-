import { itineraryDraftSchema } from "@nuogo/shared/schemas";
import { AppError } from "../../errors.js";
import { validateDraftStructure } from "./validateDraftStructure.js";

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

const attractionTypes = new Set([
  "CULTURE", "HISTORY", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"
]);

function validateAttractionXids(draft, allowedCandidateIds) {
  const activities = Array.isArray(draft?.days)
    ? draft.days.flatMap((day) => Array.isArray(day?.activities) ? day.activities : [])
    : [];
  const missing = activities.find((activity) =>
    attractionTypes.has(activity?.activityType) && !activity?.xid);
  if (missing) {
    throw new DraftBoundaryError("AI itinerary attraction is missing an xid.", {
      code: "MISSING_ATTRACTION_XID"
    });
  }
  const allowed = new Set(allowedCandidateIds);
  const unknown = [...new Set(activities
    .filter((activity) => attractionTypes.has(activity?.activityType))
    .map(({ xid }) => xid)
    .filter((xid) => !allowed.has(xid)))];
  if (unknown.length) {
    throw new DraftBoundaryError("AI itinerary draft contains unknown attraction xids.", {
      code: "UNKNOWN_ATTRACTION_XID",
      details: { xids: unknown }
    });
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
  validateAttractionXids(parsedJson, allowedCandidateIds);
  const structure = validateDraftStructure(parsedJson);
  if (!structure.valid) {
    throw new DraftBoundaryError("AI itinerary draft does not match the required JSON Schema.", {
      details: structure.errors
    });
  }
  const parsed = itineraryDraftSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new DraftBoundaryError("AI itinerary draft does not match the required schema.", {
      details: parsed.error.issues
    });
  }
  const referencedIds = parsed.data.days.flatMap((day) => [
    ...(day.startPoint.locationType === "POI" ? [day.startPoint.locationId] : []),
    ...(day.endPoint.locationType === "POI" ? [day.endPoint.locationId] : [])
  ]);
  const allowed = new Set(allowedCandidateIds);
  const unknown = [...new Set(referencedIds.filter((id) => !allowed.has(id)))];
  if (unknown.length) {
    throw new DraftBoundaryError("AI itinerary draft contains unknown POI IDs.", {
      code: "UNKNOWN_ATTRACTION_XID",
      details: { ids: unknown }
    });
  }
  return parsed.data;
}
