import { z } from "zod";
import {
  attractionSelectionModes,
  localTransportModes,
  spendingProfiles,
  supportedDestinationIds
} from "./constants.js";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const canonicalCoordinatesSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  coordinateSystem: z.literal("WGS84")
}).strict();

export const selectedAttractionPreferenceSchema = z.object({
  xid: z.string().trim().min(1).max(120),
  displayName: z.string().trim().min(1).max(160)
}).strict();

const localizedTextSchema = z.object({
  en: z.string().min(1).max(500),
  zh: z.string().min(1).max(500)
}).strict();

const selectedAttractionRecordSchema = z.object({
  requestId: z.string().min(1).max(180),
  xid: z.string().min(1).max(120).optional(),
  displayName: localizedTextSchema
}).strict();

export const selectedAttractionOutcomeSchema = z.object({
  requested: z.array(selectedAttractionRecordSchema).max(12),
  included: z.array(selectedAttractionRecordSchema).max(12),
  excluded: z.array(selectedAttractionRecordSchema.extend({
    reasonCode: z.string().min(1).max(80),
    reason: localizedTextSchema
  })).max(12)
}).strict();

export const profileBudgetSummarySchema = z.object({
  userBudgetMinor: z.number().int().nonnegative().optional(),
  baselineMandatoryCostMinor: z.number().int().nonnegative().optional(),
  profileControlledCostMinor: z.number().int().nonnegative().optional(),
  totalMinor: z.number().int().nonnegative().optional(),
  utilisationPercent: z.number().nonnegative().max(100).optional(),
  remainingMinor: z.number().int().optional(),
  currency: z.literal("SGD").optional()
}).strict();

export const travelPreferenceSchema = z.object({
  destination: z.enum(supportedDestinationIds),
  startDate: z.string().date(),
  endDate: z.string().date(),
  travellerCount: z.number().int().min(1).max(20),
  budgetMinor: z.number().int().min(1_000).max(100_000_000),
  currency: z.literal("SGD"),
  interests: z.array(z.enum(["CULTURE", "HISTORY", "FOOD", "NATURE", "SHOPPING", "ENTERTAINMENT", "FAMILY"])).min(1).max(7),
  preferredSights: z.array(z.string().trim().min(1).max(120)).max(12),
  travelStyle: z.enum(spendingProfiles),
  rainyDayBackupEnabled: z.boolean(),
  attractionSelectionMode: z.enum(attractionSelectionModes),
  selectedAttractions: z.array(selectedAttractionPreferenceSchema).max(12),
  otherPreferences: z.string().trim().max(500).optional(),
  language: z.enum(["en", "zh"]).default("zh"),
  consentToLlmProcessing: z.literal(true)
}).strict().superRefine((preferences, context) => {
  const ids = preferences.selectedAttractions.map(({ xid }) => xid);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["selectedAttractions"], message: "Selected attraction identifiers must be unique." });
  }
  if (preferences.attractionSelectionMode === "MANUAL" && !ids.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["selectedAttractions"], message: "Manual selection requires at least one attraction." });
  }
  if (preferences.attractionSelectionMode === "AUTO" && ids.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["selectedAttractions"], message: "Automatic recommendation cannot contain manual selections." });
  }
  if (preferences.endDate < preferences.startDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be on or after start date."
    });
  }
});

export function deriveTripDurationDays(startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new TypeError("Invalid trip date range.");
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function normalizeArchivedTravelPreferences(preferences, { travelStyle } = {}) {
  const selectedStyle = spendingProfiles.includes(preferences?.travelStyle)
    ? preferences.travelStyle
    : spendingProfiles.includes(travelStyle) ? travelStyle : "BALANCED";
  return {
    ...preferences,
    currency: preferences?.currency ?? (preferences?.totalBudgetCny !== undefined
      ? "CNY"
      : preferences?.budgetMinor !== undefined ? "SGD" : undefined),
    travelStyle: selectedStyle,
    rainyDayBackupEnabled: preferences?.rainyDayBackupEnabled === true
  };
}

export const tripLegSchema = z.object({
  id: z.string().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  mode: z.enum(localTransportModes),
  distanceMeters: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
  estimatedCostMinor: z.number().int().nonnegative(),
  routeSource: z.enum(["USER_PROVIDED", "REFERENCE", "DEMO", "ESTIMATED"]),
  sourceType: z.enum(["ESTIMATED"]).optional(),
  routeRetrievedAt: z.string().datetime().optional()
}).strict();

const draftPointSchema = z.object({
  locationId: z.string().min(1),
  locationType: z.enum(["ORIGIN", "HOTEL", "POI", "TRANSPORT_HUB", "DESTINATION"])
}).strict();

const draftActivityFields = {
  sequence: z.number().int().positive(),
  plannedStartTime: timeSchema,
  plannedDurationMinutes: z.number().int().min(15).max(720),
  reason: z.string().min(1).max(500)
};

const groundedDraftActivitySchema = z.object({
  ...draftActivityFields,
  xid: z.string().min(1),
  activityType: z.enum([
    "CULTURE",
    "HISTORY",
    "NATURE",
    "SHOPPING",
    "ENTERTAINMENT",
    "FAMILY"
  ])
}).strict();

const ungroundedDraftActivitySchema = z.object({
  ...draftActivityFields,
  activityType: z.enum(["MEAL", "TRANSFER", "ACCOMMODATION", "REST", "DEPARTURE"]),
  sourceType: z.enum(["AI_GENERATED", "ESTIMATED"])
}).strict();

export const itineraryDraftSchema = z.object({
  travelStyle: z.enum(spendingProfiles),
  trip: z.object({
    destination: z.enum(supportedDestinationIds),
    startDate: z.string().date(),
    endDate: z.string().date(),
    travellerCount: z.number().int().min(1).max(20),
    budgetMinor: z.number().int().positive(),
    currency: z.literal("SGD")
  }).strict(),
  days: z.array(z.object({
    dayNumber: z.number().int().positive(),
    date: z.string().date(),
    startPoint: draftPointSchema,
    activities: z.array(z.union([
      groundedDraftActivitySchema,
      ungroundedDraftActivitySchema
    ])).min(1).max(12),
    endPoint: draftPointSchema
  }).strict()).min(1).max(14)
}).strict();

export const passwordSchema = z.string().min(8).refine(
  (value) => new TextEncoder().encode(value).length <= 72,
  "Password must be at most 72 UTF-8 bytes."
);

export const authRegistrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  password: passwordSchema
}).strict().refine(
  ({ email }) => !/^guest\+.*@nuogo\.local$/i.test(email),
  { path: ["email"], message: "This email address is reserved." }
);

export const authLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  password: passwordSchema
}).strict();

export const tripRevisionSchema = z.object({
  expectedRevision: z.number().int().nonnegative()
}).strict();
