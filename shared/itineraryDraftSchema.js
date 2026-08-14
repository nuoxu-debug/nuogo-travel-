export const itineraryDraftJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://nuogo.local/schemas/itinerary-draft.json",
  title: "Nuogo itinerary draft",
  type: "object",
  additionalProperties: false,
  required: ["variant", "trip", "days"],
  properties: {
    variant: {
      type: "string",
      enum: ["BUDGET_SAVING", "BALANCED", "COMFORT_FOCUSED"]
    },
    trip: {
      type: "object",
      additionalProperties: false,
      required: [
        "origin",
        "destination",
        "startDate",
        "endDate",
        "travellerCount",
        "totalBudgetCny"
      ],
      properties: {
        origin: { type: "string", minLength: 1, maxLength: 120 },
        destination: { type: "string", enum: ["beijing", "shanghai", "xian"] },
        startDate: { type: "string", format: "date" },
        endDate: { type: "string", format: "date" },
        travellerCount: { type: "integer", minimum: 1, maximum: 20 },
        totalBudgetCny: { type: "integer", exclusiveMinimum: 0 }
      }
    },
    days: {
      type: "array",
      minItems: 1,
      maxItems: 14,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dayNumber", "date", "startPoint", "activities", "endPoint"],
        properties: {
          dayNumber: { type: "integer", minimum: 1 },
          date: { type: "string", format: "date" },
          startPoint: { $ref: "#/$defs/point" },
          activities: {
            type: "array",
            minItems: 1,
            maxItems: 12,
            items: { $ref: "#/$defs/activity" }
          },
          endPoint: { $ref: "#/$defs/point" }
        }
      }
    }
  },
  $defs: {
    point: {
      type: "object",
      additionalProperties: false,
      required: ["locationId", "locationType"],
      properties: {
        locationId: { type: "string", minLength: 1 },
        locationType: {
          type: "string",
          enum: ["ORIGIN", "HOTEL", "POI", "TRANSPORT_HUB", "DESTINATION"]
        }
      }
    },
    activity: {
      type: "object",
      additionalProperties: false,
      required: [
        "sequence",
        "poiId",
        "activityType",
        "plannedStartTime",
        "plannedDurationMinutes",
        "reason"
      ],
      properties: {
        sequence: { type: "integer", minimum: 1 },
        poiId: { type: "string", minLength: 1 },
        activityType: {
          type: "string",
          enum: ["CULTURE", "HISTORY", "FOOD", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY", "HOTEL"]
        },
        plannedStartTime: {
          type: "string",
          pattern: "^([01]\\d|2[0-3]):[0-5]\\d$"
        },
        plannedDurationMinutes: { type: "integer", minimum: 15, maximum: 720 },
        reason: { type: "string", minLength: 1, maxLength: 500 }
      }
    }
  }
};
