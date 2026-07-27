import { z } from "zod";
import {
  accommodationTypes,
  cityIds,
  expenseCategories,
  groupTypes,
  invitationStatuses,
  poiCategories,
  tripMemberRoles,
  tripStyles
} from "./constants.js";

const bilingualTextSchema = z.object({
  en: z.string().min(1).max(800),
  zh: z.string().min(1).max(800)
}).strict();

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

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
  createdByUserId: z.string().min(1),
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
