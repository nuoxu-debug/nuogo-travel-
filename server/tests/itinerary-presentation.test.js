import { describe, expect, it } from "vitest";
import { enrichItineraryPresentation } from "../src/services/itinerary/enrichItineraryPresentation.js";

function context(overrides = {}) {
  const itinerary = {
    variant: "BALANCED",
    days: [{
      dayNumber: 1,
      date: "2026-10-10",
      startPoint: { locationId: "origin", locationType: "ORIGIN" },
      activities: [{
        sequence: 1,
        xid: "Q1",
        activityType: "HISTORY",
        plannedStartTime: "09:00",
        plannedDurationMinutes: 90,
        scheduledStartTime: "09:10",
        scheduledEndTime: "10:40",
        estimatedActivityCostMinor: 4_000,
        reason: "A strong match for the traveller's interest in history.",
        poi: {
          name: "Forbidden City",
          displayName: { en: "Forbidden City", zh: "故宫博物院" },
          description: { en: "A historic palace complex.", zh: "历史悠久的皇家宫殿建筑群。" },
          descriptionSourceType: "OPENTRIPMAP_API",
          suggestedVisitDurationMinutes: 90,
          durationSourceType: "ESTIMATED",
          primarySource: "OPENTRIPMAP",
          verificationStatus: "SUPPORTING_ONLY"
        }
      }, {
        sequence: 2,
        activityType: "MEAL",
        sourceType: "AI_GENERATED",
        plannedStartTime: "12:15",
        plannedDurationMinutes: 60,
        scheduledStartTime: "12:15",
        scheduledEndTime: "13:15",
        reason: "Pause for a convenient meal near the day's sights."
      }, {
        sequence: 3,
        xid: "Q2",
        activityType: "CULTURE",
        plannedStartTime: "14:00",
        plannedDurationMinutes: 60,
        scheduledStartTime: "14:00",
        scheduledEndTime: "15:00",
        estimatedActivityCostMinor: 2_000,
        reason: "Adds a cultural highlight.",
        poi: {
          name: "Jingshan Park",
          displayName: { en: "Jingshan Park", zh: "景山公园" },
          primarySource: "OPENTRIPMAP",
          verificationStatus: "SUPPORTING_ONLY"
        }
      }],
      endPoint: { locationId: "hotel", locationType: "HOTEL" },
      legs: [{
        fromLocationId: "origin", toLocationId: "Q1", mode: "PUBLIC_TRANSIT",
        distanceMeters: 2_500, durationMinutes: 20, estimatedCostMinor: 400,
        routeSource: "ESTIMATED", sourceType: "ESTIMATED"
      }, {
        fromLocationId: "Q1", toLocationId: "Q2", mode: "WALK",
        distanceMeters: 900, durationMinutes: 14, estimatedCostMinor: 0,
        routeSource: "ESTIMATED", sourceType: "ESTIMATED"
      }, {
        fromLocationId: "Q2", toLocationId: "hotel", mode: "PUBLIC_TRANSIT",
        distanceMeters: 3_100, durationMinutes: 25, estimatedCostMinor: 400,
        routeSource: "ESTIMATED", sourceType: "ESTIMATED"
      }]
    }]
  };
  return {
    itinerary,
    preferences: { language: "zh", travellerCount: 2, foodPreference: "BALANCED" },
    summary: { categoriesMinor: { foodAndBeverages: 12_000 } },
    ...overrides
  };
}

describe("localized itinerary presentation enrichment", () => {
  it("summarizes a day and preserves provider description provenance", () => {
    const enriched = enrichItineraryPresentation(context());
    const day = enriched.days[0];
    expect(day.presentation).toMatchObject({
      activityCount: 3,
      attractionCount: 2,
      mealCount: 1,
      transportLegCount: 3,
      estimatedDailyCostMinor: 18_800,
      theme: { en: expect.any(String), zh: expect.any(String) }
    });
    expect(day.activities[0].presentation).toMatchObject({
      name: { en: "Forbidden City", zh: "故宫博物院" },
      description: { en: "A historic palace complex.", zh: "历史悠久的皇家宫殿建筑群。" },
      descriptionSourceType: "OPENTRIPMAP_API",
      reasonSourceType: "AI_GENERATED",
      durationMinutes: 90,
      durationSourceType: "ESTIMATED",
      startTime: "09:10",
      endTime: "10:40",
      estimatedCostMinor: 4_000
    });
  });

  it("keeps controlled bilingual descriptions database-backed", () => {
    const input = context();
    input.itinerary.days[0].activities[0].poi.descriptionSourceType = "DATABASE_BACKED";
    expect(enrichItineraryPresentation(input).days[0].activities[0].presentation.descriptionSourceType)
      .toBe("DATABASE_BACKED");
  });

  it("uses localized unavailable copy without fabricating provenance", () => {
    const presentation = enrichItineraryPresentation(context()).days[0].activities[2].presentation;
    expect(presentation.description).toEqual({
      en: "Description unavailable",
      zh: "暂无景点介绍"
    });
    expect(presentation).not.toHaveProperty("descriptionSourceType");
  });

  it("presents meals without inventing a named restaurant", () => {
    const meal = enrichItineraryPresentation(context()).days[0].activities[1];
    expect(meal).not.toHaveProperty("poi");
    expect(meal.presentation).toMatchObject({
      name: { en: "Lunch", zh: "午餐" },
      startTime: "12:15",
      endTime: "13:15",
      durationMinutes: 60,
      area: { en: "Near Forbidden City", zh: "故宫博物院附近" },
      style: { en: expect.any(String), zh: expect.any(String) },
      estimatedCostMinor: 12_000,
      estimatedCostPerTravellerMinor: 6_000,
      reasonSourceType: "AI_GENERATED",
      costSourceType: "ESTIMATED"
    });
    expect(`${meal.presentation.name.en} ${meal.presentation.name.zh}`).not.toMatch(/restaurant|餐厅/i);
  });

  it("labels generic non-POI activities by their actual purpose instead of Attraction", () => {
    const input = context();
    input.itinerary.days[0].activities = [{
      sequence: 1,
      activityType: "TRANSFER",
      sourceType: "AI_GENERATED",
      plannedStartTime: "09:00",
      plannedDurationMinutes: 30,
      scheduledStartTime: "09:00",
      scheduledEndTime: "09:30",
      reason: "Move from the hotel toward the first area."
    }, {
      sequence: 2,
      activityType: "REST",
      sourceType: "AI_GENERATED",
      plannedStartTime: "11:00",
      plannedDurationMinutes: 20,
      scheduledStartTime: "11:00",
      scheduledEndTime: "11:20",
      reason: "Leave time for a short break."
    }, {
      sequence: 3,
      activityType: "ACCOMMODATION",
      sourceType: "ESTIMATED",
      plannedStartTime: "21:00",
      plannedDurationMinutes: 60,
      scheduledStartTime: "21:00",
      scheduledEndTime: "22:00",
      reason: "Return to the accommodation."
    }];
    input.itinerary.days[0].legs = [];

    const names = enrichItineraryPresentation(input).days[0].activities
      .map((activity) => activity.presentation.name.en);

    expect(names).toEqual(["Transfer", "Rest stop", "Accommodation"]);
    expect(names).not.toContain("Attraction");
  });

  it("adds localized estimated transport rows and next transport", () => {
    const day = enrichItineraryPresentation(context()).days[0];
    expect(day.presentation.transport[0]).toMatchObject({
      origin: { en: "Departure point", zh: "出发地" },
      destination: { en: "Forbidden City", zh: "故宫博物院" },
      mode: { en: "Public transit", zh: "公共交通" },
      distanceMeters: 2_500,
      durationMinutes: 20,
      estimatedCostMinor: 400,
      sourceType: "ESTIMATED"
    });
    expect(day.activities[0].presentation.nextTransport).toMatchObject({
      destination: { en: "Jingshan Park", zh: "景山公园" },
      mode: { en: "Walk", zh: "步行" }
    });
  });

  it("does not mutate provider facts or expose raw profile enums", () => {
    const input = context();
    const original = structuredClone(input.itinerary.days[0].activities[0].poi);
    const enriched = enrichItineraryPresentation(input);
    expect(input.itinerary.days[0].activities[0].poi).toEqual(original);
    expect(JSON.stringify(enriched.days[0].presentation)).not.toContain("BALANCED");
  });

  it("reports requested versus scheduled attraction target using sightseeing activities only", () => {
    const input = context();
    input.preferences.dailyAttractionTarget = 6;
    input.itinerary.days[0].activities = [
      ...Array.from({ length: 5 }, (_, index) => ({
        sequence: index + 1,
        xid: `Q${index + 1}`,
        activityType: "CULTURE",
        plannedStartTime: `${String(9 + index).padStart(2, "0")}:00`,
        plannedDurationMinutes: 60,
        scheduledStartTime: `${String(9 + index).padStart(2, "0")}:00`,
        scheduledEndTime: `${String(10 + index).padStart(2, "0")}:00`,
        estimatedActivityCostMinor: 0,
        reason: "Sightseeing.",
        poi: {
          name: `POI ${index + 1}`,
          displayName: { en: `POI ${index + 1}`, zh: `POI ${index + 1}` },
          primarySource: "OPENTRIPMAP",
          verificationStatus: "SUPPORTING_ONLY"
        }
      })),
      {
        sequence: 6,
        activityType: "MEAL",
        sourceType: "AI_GENERATED",
        plannedStartTime: "12:30",
        plannedDurationMinutes: 60,
        scheduledStartTime: "12:30",
        scheduledEndTime: "13:30",
        reason: "Lunch."
      }
    ];

    const day = enrichItineraryPresentation(input).days[0];

    expect(day.presentation.attractionTarget).toMatchObject({
      requestedAttractionCount: 6,
      scheduledAttractionCount: 5,
      targetSatisfied: false,
      omissionReasons: [expect.objectContaining({
        code: "REQUESTED_ATTRACTION_TARGET_NOT_FULLY_SCHEDULED"
      })]
    });
  });

  it("marks the attraction target satisfied when the requested sightseeing count is scheduled", () => {
    const input = context();
    input.preferences.dailyAttractionTarget = 6;
    input.itinerary.days[0].activities = Array.from({ length: 6 }, (_, index) => ({
      sequence: index + 1,
      xid: `Q${index + 1}`,
      activityType: "CULTURE",
      plannedStartTime: `${String(9 + index).padStart(2, "0")}:00`,
      plannedDurationMinutes: 60,
      scheduledStartTime: `${String(9 + index).padStart(2, "0")}:00`,
      scheduledEndTime: `${String(10 + index).padStart(2, "0")}:00`,
      estimatedActivityCostMinor: 0,
      reason: "Sightseeing.",
      poi: {
        name: `POI ${index + 1}`,
        displayName: { en: `POI ${index + 1}`, zh: `POI ${index + 1}` },
        primarySource: "OPENTRIPMAP",
        verificationStatus: "SUPPORTING_ONLY"
      }
    }));

    const day = enrichItineraryPresentation(input).days[0];

    expect(day.presentation.attractionTarget).toEqual({
      requestedAttractionCount: 6,
      scheduledAttractionCount: 6,
      targetSatisfied: true,
      omissionReasons: []
    });
  });
});
