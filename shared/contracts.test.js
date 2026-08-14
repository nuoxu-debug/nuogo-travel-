import { describe, expect, it } from "vitest";
import {
  chinaCities,
  spendingProfiles,
  supportedDestinations
} from "./constants.js";
import {
  canonicalPoiSchema,
  expenseInputSchema,
  expenseSummarySchema,
  itineraryDraftSchema,
  itineraryVariantSchema,
  preferenceSchema,
  travelPreferenceSchema,
  tripLegSchema,
  tripInvitationSchema,
  tripExpenseSchema,
  tripMemberSchema,
  tripRevisionSchema
} from "./schemas.js";
import { itineraryDraftJsonSchema } from "./itineraryDraftSchema.js";

const validActivity = {
  id: "activity-1",
  order: 0,
  startTime: "09:00",
  endTime: "11:00",
  name: { en: "People's Park", zh: "人民公园" },
  description: { en: "Tea-house morning", zh: "茶馆慢生活" },
  category: "city_landmarks",
  address: { en: "Chengdu", zh: "成都市" },
  location: { longitude: 104.058, latitude: 30.659 },
  estimatedCost: 35,
  transportNote: { en: "Metro Line 2", zh: "地铁2号线" },
  guide: {
    culture: { en: "Local tea culture", zh: "本地茶文化" },
    food: { en: "Try gaiwan tea", zh: "试试盖碗茶" },
    crowd: { en: "Arrive before 10", zh: "十点前到达" },
    visit: { en: "Sit near the garden", zh: "选择靠园林座位" }
  },
  votes: 0,
  isFavorite: false
};

const validVariant = {
  id: "variant-1",
  tripId: "trip-1",
  style: "budget",
  title: { en: "Chengdu in 4 days", zh: "成都四日游" },
  summary: { en: "A balanced city plan.", zh: "平衡的城市行程。" },
  destination: "chengdu",
  startDate: "2026-08-10",
  totalBudget: 4800,
  pace: "balanced",
  highlights: { en: ["Tea culture"], zh: ["茶文化"] },
  budget: {
    scenicTickets: 0,
    localFood: 35,
    transportation: 8,
    accommodation: 0
  },
  days: [{
    id: "day-1",
    dayNumber: 1,
    date: "2026-08-10",
    title: { en: "Old Chengdu", zh: "老成都" },
    activities: [validActivity]
  }],
  isFallback: false
};

const validPreferences = {
  destination: "chengdu",
  departureCity: "shanghai",
  days: 4,
  totalBudget: 4800,
  interests: ["local_street_food", "historical_relics"],
  groupType: "student_group",
  accommodation: "budget_hotel",
  language: "en",
  startDate: "2026-08-10"
};

describe("Nuogo shared contracts", () => {
  it("limits the objective-aligned planner to three supported destinations", () => {
    expect(supportedDestinations.map(({ id }) => id)).toEqual([
      "beijing",
      "shanghai",
      "xian"
    ]);
    expect(spendingProfiles).toEqual([
      "BUDGET_SAVING",
      "BALANCED",
      "COMFORT_FOCUSED"
    ]);
  });

  it("accepts the complete objective-aligned preference contract", () => {
    const preferences = travelPreferenceSchema.parse({
      origin: "Kuala Lumpur",
      destination: "beijing",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      travellerCount: 2,
      totalBudgetCny: 10000,
      interests: ["history", "food"],
      preferredSights: ["Forbidden City"],
      accommodationPreference: "BUDGET",
      foodPreference: "LOCAL",
      localTransportPreference: "PUBLIC_TRANSIT",
      activityPreferences: ["CULTURE", "FOOD"],
      arrivalDateTime: "2026-09-01T10:00:00+08:00",
      departureDateTime: "2026-09-05T20:00:00+08:00",
      outboundTransportMode: "FLIGHT",
      returnTransportMode: "FLIGHT",
      outboundTransportCostCny: 1200,
      returnTransportCostCny: 1200,
      language: "en",
      consentToLlmProcessing: true
    });

    expect(preferences.travellerCount).toBe(2);
    expect(preferences.destination).toBe("beijing");
  });

  it("rejects unsupported cities and inconsistent travel dates", () => {
    const base = {
      origin: "Kuala Lumpur",
      destination: "beijing",
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      travellerCount: 2,
      totalBudgetCny: 10000,
      interests: ["history"],
      preferredSights: [],
      accommodationPreference: "MID_RANGE",
      foodPreference: "BALANCED",
      localTransportPreference: "MIXED",
      activityPreferences: ["CULTURE"],
      arrivalDateTime: "2026-09-01T10:00:00+08:00",
      departureDateTime: "2026-09-05T20:00:00+08:00",
      outboundTransportMode: "TRAIN",
      returnTransportMode: "TRAIN",
      language: "en",
      consentToLlmProcessing: true
    };

    expect(() => travelPreferenceSchema.parse({ ...base, destination: "huangshan" })).toThrow();
    expect(() => travelPreferenceSchema.parse({ ...base, endDate: "2026-08-31" })).toThrow();
  });

  it("validates canonical POI provenance and a sourced trip leg", () => {
    const poi = canonicalPoiSchema.parse({
      canonicalPoiId: "POI_BJ_001",
      name: "Forbidden City",
      city: "beijing",
      category: "ATTRACTION",
      coordinates: { latitude: 39.9163, longitude: 116.3972 },
      primarySource: "AMAP",
      amapPoiId: "B000A8UIN8",
      openTripMapXid: "N123",
      sourceRecords: [{
        provider: "AMAP",
        sourceId: "B000A8UIN8",
        retrievedAt: "2026-08-14T02:00:00.000Z"
      }],
      retrievedAt: "2026-08-14T02:00:00.000Z",
      verificationStatus: "MATCHED"
    });
    const leg = tripLegSchema.parse({
      id: "leg-1",
      fromLocationId: "hotel-1",
      toLocationId: poi.canonicalPoiId,
      mode: "PUBLIC_TRANSIT",
      distanceMeters: 7200,
      durationMinutes: 31,
      estimatedCostFen: 500,
      routeSource: "AMAP",
      routeRetrievedAt: "2026-08-14T02:00:00.000Z"
    });

    expect(leg.estimatedCostFen).toBe(500);
  });

  it("keeps authoritative coordinates and prices outside the LLM draft", () => {
    const draft = {
      variant: "BALANCED",
      trip: {
        origin: "Kuala Lumpur",
        destination: "beijing",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
        travellerCount: 2,
        totalBudgetCny: 10000
      },
      days: [{
        dayNumber: 1,
        date: "2026-09-01",
        startPoint: { locationId: "hotel-1", locationType: "HOTEL" },
        activities: [{
          sequence: 1,
          poiId: "POI_BJ_001",
          activityType: "CULTURE",
          plannedStartTime: "11:30",
          plannedDurationMinutes: 120,
          reason: "Matches the requested history interest."
        }],
        endPoint: { locationId: "hotel-1", locationType: "HOTEL" }
      }]
    };

    expect(itineraryDraftSchema.parse(draft).variant).toBe("BALANCED");
    expect(() => itineraryDraftSchema.parse({
      ...draft,
      days: [{
        ...draft.days[0],
        activities: [{
          ...draft.days[0].activities[0],
          estimatedCostCny: 100,
          coordinates: { latitude: 39.9, longitude: 116.4 }
        }]
      }]
    })).toThrow();
    expect(itineraryDraftJsonSchema.additionalProperties).toBe(false);
  });

  it("accepts bounded mainland-China preferences", () => {
    expect(preferenceSchema.parse(validPreferences).destination).toBe("chengdu");
  });

  it("rejects destinations outside the supported mainland list", () => {
    expect(() => preferenceSchema.parse({ ...validPreferences, destination: "tokyo" })).toThrow();
    expect(chinaCities.every((city) => city.countryCode === "CN")).toBe(true);
  });

  it("validates a complete itinerary variant", () => {
    const variant = itineraryVariantSchema.parse(validVariant);
    expect(variant.days[0].activities[0].location.latitude).toBeTypeOf("number");
  });

  it("accepts Huangshan preferences and grounded activity metadata", () => {
    const preferences = preferenceSchema.parse({
      ...validPreferences,
      destination: "huangshan"
    });
    const variant = itineraryVariantSchema.parse({
      ...validVariant,
      destination: "huangshan",
      days: [{
        ...validVariant.days[0],
        activities: [{
          ...validActivity,
          sourceAttractionId: "attraction-huangshan-1",
          sourceProvider: "Mafengwo",
          sourceUrl: "https://m.mafengwo.cn/poi/123.html",
          imageUrl: "/api/attractions/attraction-huangshan-1/image",
          imageAttribution: "Image source: Mafengwo",
          visitDetails: {
            suggestedDuration: { en: "1-2 hours", zh: "1-2\u5c0f\u65f6" },
            bestTime: { en: "Early morning", zh: "\u6e05\u6668" },
            openingHours: { en: "Confirm current hours.", zh: "\u8bf7\u786e\u8ba4\u6700\u65b0\u5f00\u653e\u65f6\u95f4\u3002" },
            ticketAdvice: { en: "Confirm ticket rules.", zh: "\u8bf7\u786e\u8ba4\u95e8\u7968\u89c4\u5219\u3002" },
            popularity: { reviews: 100, travelNotes: 20, images: 300 },
            highlights: {
              en: ["Mountain views", "Ancient pines"],
              zh: ["\u5c71\u5cb3\u98ce\u5149", "\u9ec4\u5c71\u5947\u677e"]
            }
          },
          locationIsEstimated: true
        }]
      }]
    });

    expect(preferences.destination).toBe("huangshan");
    expect(variant.days[0].activities[0].sourceAttractionId).toBe("attraction-huangshan-1");
    expect(variant.days[0].activities[0].imageUrl)
      .toBe("/api/attractions/attraction-huangshan-1/image");
    expect(variant.days[0].activities[0].locationIsEstimated).toBe(true);
  });

  it("validates an editor membership and a pending invitation", () => {
    expect(tripMemberSchema.parse({
      id: "member-1",
      tripId: "trip-1",
      userId: "user-2",
      name: "Li Wei",
      role: "editor",
      status: "active",
      joinedAt: "2026-07-27T10:00:00.000Z"
    }).role).toBe("editor");

    expect(tripInvitationSchema.parse({
      id: "invite-1",
      tripId: "trip-1",
      role: "viewer",
      status: "pending",
      expiresAt: "2026-08-03T10:00:00.000Z"
    }).status).toBe("pending");

    expect(() => tripInvitationSchema.parse({
      id: "invite-owner",
      tripId: "trip-1",
      role: "owner",
      status: "pending",
      expiresAt: "2026-08-03T10:00:00.000Z"
    })).toThrow();
  });

  it("accepts an equal expense with a participant exclusion", () => {
    const value = expenseInputSchema.parse({
      description: "Tunxi dinner",
      category: "food",
      amountFen: 30000,
      expenseDate: "2026-08-10",
      paidByUserId: "user-1",
      participantUserIds: ["user-1", "user-2", "user-3"],
      note: ""
    });
    expect(value.participantUserIds).not.toContain("user-4");
  });

  it("rejects empty expense participants and invalid revisions", () => {
    expect(() => expenseInputSchema.parse({
      description: "Taxi",
      category: "transportation",
      amountFen: 8000,
      expenseDate: "2026-08-10",
      paidByUserId: "user-1",
      participantUserIds: []
    })).toThrow();
    expect(() => tripRevisionSchema.parse({ expectedRevision: -1 })).toThrow();
  });

  it("validates a per-member balance summary", () => {
    const summary = expenseSummarySchema.parse({
      totalSpentFen: 30000,
      members: [{
        userId: "user-1",
        name: "Chen",
        paidFen: 30000,
        shareFen: 10000,
        netFen: 20000
      }],
      settlements: []
    });
    expect(summary.members[0].netFen).toBe(20000);
  });

  it("accepts expense payer and creator display names", () => {
    const expense = tripExpenseSchema.parse({
      id: "expense-1",
      tripId: "trip-1",
      description: "Tunxi dinner",
      category: "food",
      amountFen: 30000,
      expenseDate: "2026-08-10",
      paidByUserId: "user-1",
      paidByName: "Chen",
      createdByUserId: "user-2",
      createdByName: "Li",
      note: "",
      participants: [
        { userId: "user-1", name: "Chen", shareFen: 15000 },
        { userId: "user-2", name: "Li", shareFen: 15000 }
      ]
    });
    expect(expense).toMatchObject({
      paidByName: "Chen",
      createdByName: "Li"
    });
  });

  it("rejects duplicate expense participants", () => {
    expect(() => tripExpenseSchema.parse({
      id: "expense-1",
      tripId: "trip-1",
      description: "Tunxi dinner",
      category: "food",
      amountFen: 30000,
      expenseDate: "2026-08-10",
      paidByUserId: "user-1",
      paidByName: "Chen",
      createdByUserId: "user-1",
      createdByName: "Chen",
      note: "",
      participants: [
        { userId: "user-1", name: "Chen", shareFen: 15000 },
        { userId: "user-1", name: "Chen", shareFen: 15000 }
      ]
    })).toThrow();
  });

  it("rejects expense participant shares that do not total the expense", () => {
    expect(() => tripExpenseSchema.parse({
      id: "expense-1",
      tripId: "trip-1",
      description: "Tunxi dinner",
      category: "food",
      amountFen: 30000,
      expenseDate: "2026-08-10",
      paidByUserId: "user-1",
      paidByName: "Chen",
      createdByUserId: "user-1",
      createdByName: "Chen",
      note: "",
      participants: [
        { userId: "user-1", name: "Chen", shareFen: 10000 },
        { userId: "user-2", name: "Li", shareFen: 10000 }
      ]
    })).toThrow();
  });

  it("rejects negative paid balances", () => {
    expect(() => expenseSummarySchema.parse({
      totalSpentFen: 30000,
      members: [{
        userId: "user-1",
        name: "Chen",
        paidFen: -1,
        shareFen: 10000,
        netFen: -10001
      }],
      settlements: []
    })).toThrow();
  });
});
