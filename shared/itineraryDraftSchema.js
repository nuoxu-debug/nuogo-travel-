export const itineraryDraftJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://nuogo.local/schemas/itinerary-draft.json",
  title: "Nuogo Singapore itinerary draft",
  type: "object",
  additionalProperties: false,
  required: ["travelStyle", "trip", "days"],
  properties: {
    travelStyle: { type: "string", enum: ["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"] },
    trip: {
      type: "object", additionalProperties: false,
      required: ["destination", "startDate", "endDate", "travellerCount", "budgetMinor", "currency"],
      properties: {
        destination: { const: "singapore" }, startDate: { type: "string", format: "date" },
        endDate: { type: "string", format: "date" }, travellerCount: { type: "integer", minimum: 1, maximum: 20 },
        budgetMinor: { type: "integer", exclusiveMinimum: 0 }, currency: { const: "SGD" }
      }
    },
    days: { type: "array", minItems: 1, maxItems: 14, items: { $ref: "#/$defs/day" } }
  },
  $defs: {
    point: { type: "object", additionalProperties: false, required: ["locationId", "locationType"], properties: { locationId: { type: "string", minLength: 1 }, locationType: { type: "string", enum: ["HOTEL", "POI", "TRANSPORT_HUB", "DESTINATION"] } } },
    groundedActivity: { type: "object", additionalProperties: false, required: ["sequence", "xid", "activityType", "plannedStartTime", "plannedDurationMinutes", "reason"], properties: { sequence: { type: "integer", minimum: 1 }, xid: { type: "string", minLength: 1 }, activityType: { type: "string", enum: ["CULTURE", "HISTORY", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"] }, plannedStartTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" }, plannedDurationMinutes: { type: "integer", minimum: 15, maximum: 720 }, reason: { type: "string", minLength: 1, maxLength: 500 } } },
    genericActivity: { type: "object", additionalProperties: false, required: ["sequence", "activityType", "sourceType", "plannedStartTime", "plannedDurationMinutes", "reason"], properties: { sequence: { type: "integer", minimum: 1 }, activityType: { type: "string", enum: ["MEAL", "TRANSFER", "ACCOMMODATION", "REST", "DEPARTURE"] }, sourceType: { type: "string", enum: ["AI_GENERATED", "ESTIMATED"] }, plannedStartTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" }, plannedDurationMinutes: { type: "integer", minimum: 15, maximum: 720 }, reason: { type: "string", minLength: 1, maxLength: 500 } } },
    day: { type: "object", additionalProperties: false, required: ["dayNumber", "date", "startPoint", "activities", "endPoint"], properties: { dayNumber: { type: "integer", minimum: 1 }, date: { type: "string", format: "date" }, startPoint: { $ref: "#/$defs/point" }, activities: { type: "array", minItems: 1, maxItems: 12, items: { oneOf: [{ $ref: "#/$defs/groundedActivity" }, { $ref: "#/$defs/genericActivity" }] } }, endPoint: { $ref: "#/$defs/point" } } }
  }
};
