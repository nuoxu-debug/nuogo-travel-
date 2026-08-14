import { z } from "zod";
import {
  accommodationTypes,
  cityIds,
  expenseCategories,
  groupTypes,
  invitationStatuses,
  poiCategories,
  localTransportModes,
  spendingProfiles,
  supportedDestinationIds,
  transportModes,
  tripMemberRoles,
  tripStyles
} from "./constants.js";

const bilingualTextSchema = z.object({
  en: z.string().min(1).max(800),
  zh: z.string().min(1).max(800)
}).strict();

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const isoDateTimeSchema = z.string().datetime({ offset: true });

const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
}).strict();

const sourceRecordSchema = z.object({
  provider: z.enum(["AMAP", "OPENTRIPMAP", "DATABASE", "USER_PROVIDED", "DEMO"]),
  sourceId: z.string().min(1).max(160),
  sourceUrl: z.string().url().optional(),
  retrievedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional()
}).strict();

export const travelPreferenceSchema = z.object({
  origin: z.string().trim().min(2).max(120),
  destination: z.enum(supportedDestinationIds),
  startDate: z.string().date(),
  endDate: z.string().date(),
  travellerCount: z.number().int().min(1).max(20),
  totalBudgetCny: z.number().int().min(100).max(1_000_000),
  interests: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
  preferredSights: z.array(z.string().trim().min(1).max(120)).max(12),
  accommodationPreference: z.enum(["BUDGET", "MID_RANGE", "COMFORT"]),
  foodPreference: z.enum(["ECONOMY", "LOCAL", "BALANCED", "COMFORT"]),
  localTransportPreference: z.enum(localTransportModes),
  activityPreferences: z.array(z.enum([
    "CULTURE",
    "HISTORY",
    "FOOD",
    "NATURE",
    "SHOPPING",
    "ENTERTAINMENT",
    "FAMILY"
  ])).min(1).max(7),
  arrivalDateTime: isoDateTimeSchema,
  departureDateTime: isoDateTimeSchema,
  outboundTransportMode: z.enum(transportModes),
  returnTransportMode: z.enum(transportModes),
  outboundTransportCostCny: z.number().nonnegative().max(500_000).optional(),
  returnTransportCostCny: z.number().nonnegative().max(500_000).optional(),
  fuelConsumptionLitresPer100Km: z.number().positive().max(40).optional(),
  otherPreferences: z.string().trim().max(500).optional(),
  language: z.enum(["en", "zh"]).default("en"),
  consentToLlmProcessing: z.literal(true)
}).strict().superRefine((preferences, context) => {
  if (preferences.endDate < preferences.startDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be on or after start date."
    });
  }
  if (new Date(preferences.departureDateTime) <= new Date(preferences.arrivalDateTime)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["departureDateTime"],
      message: "Departure must be after arrival."
    });
  }
});

export const canonicalPoiSchema = z.object({
  canonicalPoiId: z.string().min(1).max(160),
  name: z.string().min(1).max(240),
  city: z.enum(supportedDestinationIds),
  category: z.enum(["ATTRACTION", "HOTEL", "RESTAURANT", "TRANSPORT_HUB", "OTHER"]),
  coordinates: coordinatesSchema,
  address: z.string().max(500).optional(),
  primarySource: z.enum(["AMAP", "OPENTRIPMAP", "DATABASE", "DEMO"]),
  amapPoiId: z.string().min(1).max(160).optional(),
  openTripMapXid: z.string().min(1).max(160).optional(),
  sourceRecords: z.array(sourceRecordSchema).min(1),
  retrievedAt: z.string().datetime(),
  verificationStatus: z.enum([
    "MATCHED",
    "PRIMARY_ONLY",
    "SUPPORTING_ONLY",
    "AMBIGUOUS",
    "UNMATCHED"
  ])
}).strict();

export const tripLegSchema = z.object({
  id: z.string().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  mode: z.enum(localTransportModes),
  distanceMeters: z.number().int().nonnegative(),
  durationMinutes: z.number().int().positive(),
  estimatedCostFen: z.number().int().nonnegative(),
  routeSource: z.enum(["AMAP", "USER_PROVIDED", "REFERENCE", "DEMO"]),
  routeRetrievedAt: z.string().datetime()
}).strict();

const draftPointSchema = z.object({
  locationId: z.string().min(1),
  locationType: z.enum(["ORIGIN", "HOTEL", "POI", "TRANSPORT_HUB", "DESTINATION"])
}).strict();

const draftActivitySchema = z.object({
  sequence: z.number().int().positive(),
  poiId: z.string().min(1),
  activityType: z.enum([
    "CULTURE",
    "HISTORY",
    "FOOD",
    "NATURE",
    "SHOPPING",
    "ENTERTAINMENT",
    "FAMILY",
    "HOTEL"
  ]),
  plannedStartTime: timeSchema,
  plannedDurationMinutes: z.number().int().min(15).max(720),
  reason: z.string().min(1).max(500)
}).strict();

export const itineraryDraftSchema = z.object({
  variant: z.enum(spendingProfiles),
  trip: z.object({
    origin: z.string().min(1).max(120),
    destination: z.enum(supportedDestinationIds),
    startDate: z.string().date(),
    endDate: z.string().date(),
    travellerCount: z.number().int().min(1).max(20),
    totalBudgetCny: z.number().int().positive()
  }).strict(),
  days: z.array(z.object({
    dayNumber: z.number().int().positive(),
    date: z.string().date(),
    startPoint: draftPointSchema,
    activities: z.array(draftActivitySchema).min(1).max(12),
    endPoint: draftPointSchema
  }).strict()).min(1).max(14)
}).strict();

const visitDetailsSchema = z.object({
  suggestedDuration: bilingualTextSchema,
  bestTime: bilingualTextSchema,
  openingHours: bilingualTextSchema,
  ticketAdvice: bilingualTextSchema,
  popularity: z.object({
    reviews: z.number().int().nonnegative(),
    travelNotes: z.number().int().nonnegative(),
    images: z.number().int().nonnegative()
  }).strict(),
  highlights: z.object({
    en: z.array(z.string().min(1).max(160)).min(1).max(4),
    zh: z.array(z.string().min(1).max(160)).min(1).max(4)
  }).strict()
}).strict();

export const preferenceSchema = z.object({
  destination: z.enum(cityIds),
  departureCity: z.enum(cityIds),
  days: z.number().int().min(1).max(10),
  totalBudget: z.number().int().min(500).max(50000),
  interests: z.array(z.enum(poiCategories)).min(1).max(6),
  groupType: z.enum(groupTypes),
  accommodation: z.enum(accommodationTypes),
  language: z.enum(["en", "zh"]).default("en"),
  startDate: z.string().date()
}).strict();

export const activitySchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(0),
  startTime: timeSchema,
  endTime: timeSchema,
  name: bilingualTextSchema,
  description: bilingualTextSchema,
  category: z.enum(poiCategories),
  address: bilingualTextSchema,
  location: z.object({
    longitude: z.number().min(73).max(135),
    latitude: z.number().min(18).max(54)
  }).strict(),
  estimatedCost: z.number().min(0).max(50000),
  transportNote: bilingualTextSchema,
  guide: z.object({
    culture: bilingualTextSchema,
    food: bilingualTextSchema,
    crowd: bilingualTextSchema,
    visit: bilingualTextSchema
  }).strict(),
  sourceAttractionId: z.string().min(1).optional(),
  sourceProvider: z.string().min(1).max(80).optional(),
  sourceUrl: z.string().url().refine((url) => url.startsWith("https://"), {
    message: "Source URL must use HTTPS."
  }).optional(),
  imageUrl: z.string()
    .refine((value) =>
      /^\/api\/attractions\/[A-Za-z0-9-]+\/image$/.test(value) ||
      value.startsWith("https://"), {
        message: "Image URL must be a cached attraction API path or HTTPS URL."
      })
    .optional(),
  imageAttribution: z.string().min(1).max(255).optional(),
  visitDetails: visitDetailsSchema.optional(),
  locationIsEstimated: z.boolean().optional(),
  routeCluster: z.string().min(1).max(40).optional(),
  votes: z.number().int().min(0).default(0),
  isFavorite: z.boolean().default(false)
}).strict();

export const tripDaySchema = z.object({
  id: z.string().min(1),
  dayNumber: z.number().int().min(1).max(10),
  date: z.string().date(),
  title: bilingualTextSchema,
  activities: z.array(activitySchema)
}).strict();

export const itineraryVariantSchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  style: z.enum(tripStyles),
  title: bilingualTextSchema,
  summary: bilingualTextSchema,
  destination: z.enum(cityIds),
  startDate: z.string().date(),
  totalBudget: z.number().min(0).max(50000),
  pace: z.enum(["active", "balanced", "slow"]),
  highlights: z.object({
    en: z.array(z.string().min(1)).min(1),
    zh: z.array(z.string().min(1)).min(1)
  }).strict(),
  budget: z.object({
    scenicTickets: z.number().min(0),
    localFood: z.number().min(0),
    transportation: z.number().min(0),
    accommodation: z.number().min(0)
  }).strict(),
  days: z.array(tripDaySchema).min(1),
  isFallback: z.boolean().default(false)
}).strict();

export const authRegistrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(8).max(72)
}).strict();

export const authLoginSchema = authRegistrationSchema.pick({
  email: true,
  password: true
});

export const tripMemberSchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1).max(80),
  role: z.enum(tripMemberRoles),
  status: z.enum(["active", "removed"]),
  joinedAt: z.string().datetime(),
  removedAt: z.string().datetime().optional()
}).strict();

export const tripInvitationSchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  role: z.enum(["editor", "viewer"]),
  status: z.enum(invitationStatuses),
  expiresAt: z.string().datetime(),
  invitedByUserId: z.string().min(1).optional(),
  acceptedByUserId: z.string().min(1).optional(),
  createdAt: z.string().datetime().optional(),
  acceptedAt: z.string().datetime().optional()
}).strict();

export const tripRevisionSchema = z.object({
  expectedRevision: z.number().int().nonnegative()
}).strict();

export const expenseInputSchema = z.object({
  description: z.string().trim().min(1).max(120),
  category: z.enum(expenseCategories),
  amountFen: z.number().int().positive().max(5_000_000),
  expenseDate: z.string().date(),
  paidByUserId: z.string().min(1),
  participantUserIds: z.array(z.string().min(1)).min(1).max(50)
    .refine((ids) => new Set(ids).size === ids.length, "Participants must be unique."),
  note: z.string().trim().max(500).default("")
}).strict();

const expenseParticipantSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(80),
  shareFen: z.number().int().nonnegative()
}).strict();

export const tripExpenseSchema = z.object({
  id: z.string().min(1),
  tripId: z.string().min(1),
  description: z.string().min(1).max(120),
  category: z.enum(expenseCategories),
  amountFen: z.number().int().positive().max(5_000_000),
  expenseDate: z.string().date(),
  paidByUserId: z.string().min(1),
  paidByName: z.string().min(1).max(80),
  createdByUserId: z.string().min(1),
  createdByName: z.string().min(1).max(80),
  note: z.string().max(500),
  participants: z.array(expenseParticipantSchema).min(1).max(50),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
}).strict().superRefine((expense, context) => {
  const userIds = expense.participants.map(({ userId }) => userId);
  if (new Set(userIds).size !== userIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["participants"],
      message: "Expense participants must be unique."
    });
  }

  if (expense.participants.reduce((total, { shareFen }) => total + shareFen, 0) !== expense.amountFen) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["participants"],
      message: "Participant shares must total the expense amount."
    });
  }
});

const expenseBalanceSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(80),
  paidFen: z.number().int().nonnegative(),
  shareFen: z.number().int().nonnegative(),
  netFen: z.number().int()
}).strict();

const settlementSchema = z.object({
  fromUserId: z.string().min(1),
  fromName: z.string().min(1).max(80),
  toUserId: z.string().min(1),
  toName: z.string().min(1).max(80),
  amountFen: z.number().int().positive()
}).strict();

export const expenseSummarySchema = z.object({
  totalSpentFen: z.number().int().nonnegative(),
  members: z.array(expenseBalanceSchema),
  settlements: z.array(settlementSchema)
}).strict();
