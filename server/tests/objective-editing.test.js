import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { MemoryRepository } from "../src/repositories/memory.js";
import { revalidateEditedTrip } from "../src/services/itinerary/revalidateEditedTrip.js";

const reference = (id, category, representativeMinor, tier = null) => ({
  id,
  city: "singapore",
  category,
  tier,
  minMinor: representativeMinor,
  maxMinor: representativeMinor,
  representativeMinor,
  currency: "SGD",
  sourceName: "Test reference",
  sourceUrl: "https://example.edu/reference",
  collectedOn: "2026-08-01",
  updatedAt: "2026-08-14T00:00:00.000Z",
  status: "ACTIVE"
});

function references() {
  return {
    accommodationBudget: reference("hotel-budget", "ACCOMMODATION_ROOM_NIGHT", 0, "BUDGET"),
    accommodation: reference("hotel", "ACCOMMODATION_ROOM_NIGHT", 0, "MID_RANGE"),
    accommodationComfort: reference("hotel-comfort", "ACCOMMODATION_ROOM_NIGHT", 0, "COMFORT"),
    localBudget: reference("local-budget", "LOCAL_TRANSPORT_PERSON_DAY", 0, "BUDGET"),
    localTransportation: reference("local", "LOCAL_TRANSPORT_PERSON_DAY", 190, "BALANCED"),
    localComfort: reference("local-comfort", "LOCAL_TRANSPORT_PERSON_DAY", 257, "COMFORT"),
    foodBudget: reference("food-budget", "FOOD_PERSON_DAY", 2_750, "ECONOMY"),
    foodAndBeverages: reference("food", "FOOD_PERSON_DAY", 4_750, "BALANCED"),
    foodComfort: reference("food-comfort", "FOOD_PERSON_DAY", 8_000, "COMFORT"),
    attractionTickets: reference("ticket", "ATTRACTION_PERSON_ENTRY", 100),
    entertainmentActivities: reference("entertainment", "ENTERTAINMENT_PERSON_ENTRY", 10_000),
    miscellaneousBudget: reference("misc-budget", "MISCELLANEOUS_PERSON_DAY", 0, "BUDGET"),
    other: reference("misc", "MISCELLANEOUS_PERSON_DAY", 2_000, "BALANCED"),
    miscellaneousComfort: reference("misc-comfort", "MISCELLANEOUS_PERSON_DAY", 3_000, "COMFORT")
  };
}

function poi(xid, longitude) {
  return {
    canonicalPoiId: `poi-${xid}`,
    name: xid,
    city: "singapore",
    category: "ATTRACTION",
    coordinates: { longitude, latitude: 1.2903 },
    primarySource: "OPENTRIPMAP",
    matchStatus: "MATCHED",
    verificationStatus: "SUPPORTING_ONLY",
    sourceRecords: [{
      provider: "OPENTRIPMAP",
      sourceId: xid,
      sourceUrl: `https://opentripmap.com/en/card/${xid}`,
      retrievedAt: "2026-08-14T00:00:00.000Z"
    }]
  };
}

function trip() {
  const costReferences = references();
  return {
    id: "trip-objective",
    ownerId: "owner-1",
    objectiveAligned: true,
    revision: 2,
    destination: "singapore",
    startDate: "2026-10-10",
    endDate: "2026-10-10",
    travellerCount: 2,
    budgetMinor: 30_000,
    preferences: {
      destination: "singapore",
      startDate: "2026-10-10",
      endDate: "2026-10-10",
      travellerCount: 2,
      budgetMinor: 30_000,
      currency: "SGD",
      interests: ["HISTORY"],
      preferredSights: [],
      attractionSelectionMode: "AUTO",
      selectedAttractions: [],
      travelStyle: "BALANCED",
      rainyDayBackupEnabled: false,
      language: "en",
      consentToLlmProcessing: true
    },
    itineraryRun: {
      state: "FINAL_VALIDATED",
      itinerary: {
        travelStyle: "BALANCED",
        trip: {
          destination: "singapore",
          startDate: "2026-10-10",
          endDate: "2026-10-10",
          travellerCount: 2,
          budgetMinor: 30_000,
          currency: "SGD"
        },
        nights: 0,
        rooms: 1,
        mealCount: 3,
        days: [{
          dayNumber: 1,
          date: "2026-10-10",
          startPoint: {
            locationId: "hotel",
            locationType: "HOTEL",
            coordinates: { longitude: 103.8514, latitude: 1.2903 }
          },
          activities: [{
            sequence: 1,
            xid: "xid-one",
            activityType: "HISTORY",
            plannedStartTime: "10:00",
            plannedDurationMinutes: 60,
            reason: "First grounded stop.",
            poi: poi("xid-one", 103.8534)
          }, {
            sequence: 2,
            activityType: "MEAL",
            sourceType: "AI_GENERATED",
            plannedStartTime: "12:00",
            plannedDurationMinutes: 60,
            reason: "Meal break."
          }, {
            sequence: 3,
            xid: "xid-two",
            activityType: "CULTURE",
            plannedStartTime: "14:00",
            plannedDurationMinutes: 60,
            reason: "Second grounded stop.",
            poi: poi("xid-two", 103.8594)
          }],
          endPoint: {
            locationId: "hotel",
            locationType: "HOTEL",
            coordinates: { longitude: 103.8514, latitude: 1.2903 }
          }
        }]
      },
      summary: { profile: "BALANCED", provenance: costReferences },
      provenance: [],
      validation: { valid: true, issues: [] }
    }
  };
}

describe("objective itinerary edit revalidation", () => {
  it("rebuilds routes, schedule, and budget for a valid duration edit", async () => {
    const result = await revalidateEditedTrip({
      trip: trip(),
      entryId: "BALANCED:1:1",
      patch: { plannedDurationMinutes: 45 }
    });

    expect(result.variant.validation.valid).toBe(true);
    expect(result.variant.itinerary.days[0].activities[0].plannedDurationMinutes).toBe(45);
    expect(result.variant.itinerary.days[0].activities[0].presentation)
      .toMatchObject({ durationMinutes: 45, durationSourceType: "ESTIMATED" });
    expect(result.variant.itinerary.days[0].presentation.transportLegCount).toBe(3);
    expect(result.variant.itinerary.days[0].legs).toHaveLength(3);
    expect(result.variant.summary.withinBudget).toBe(true);
  });

  it("rejects an xid that is not present in the trip's canonical candidates", async () => {
    await expect(revalidateEditedTrip({
      trip: trip(),
      entryId: "BALANCED:1:1",
      patch: { xid: "unknown-xid" }
    })).rejects.toMatchObject({ code: "ITINERARY_EDIT_INVALID", status: 422 });
  });

  it("rejects a planned time that conflicts with deterministic travel", async () => {
    await expect(revalidateEditedTrip({
      trip: trip(),
      entryId: "BALANCED:1:3",
      patch: { plannedStartTime: "08:00" }
    })).rejects.toMatchObject({
      code: "ITINERARY_EDIT_INVALID",
      status: 422,
      details: { issueCodes: expect.arrayContaining(["TRAVEL_TIME_CONFLICT"]) }
    });
  });

  it("rejects an edit that exceeds the shared hard budget", async () => {
    await expect(revalidateEditedTrip({
      trip: trip(),
      entryId: "BALANCED:1:3",
      patch: { activityType: "ENTERTAINMENT" }
    })).rejects.toMatchObject({
      code: "ITINERARY_EDIT_INVALID",
      status: 422,
      details: { issueCodes: expect.arrayContaining(["BUDGET_EXCEEDED"]) }
    });
  });
});

async function apiFixture() {
  const repository = new MemoryRepository();
  const objectivePlanner = vi.fn(async (input) => ({
    id: "generation-child",
    state: "FINAL_VALIDATED",
    trip: {
      id: "trip-child",
      title: "Regenerated Singapore journey",
      destination: input.destination,
      startDate: input.startDate,
      endDate: input.endDate,
      travellerCount: input.travellerCount,
      budgetMinor: input.budgetMinor,
      preferences: input
    },
    itineraryRun: trip().itineraryRun,
    validation: { valid: true, issues: [] }
  }));
  const app = createApp({
    repository,
    objectivePlanner,
    planProvider: {},
    attractionCatalogue: { listApproved: () => [] },
    config: {
      jwtSecret: "test-secret-with-enough-length",
      demoMode: true,
      aiProvider: "demo",
      enableLegacyFeatures: false,
      clientOrigin: "http://localhost:5173"
    }
  });
  const owner = await request(app).post("/api/auth/register").send({
    name: "Objective Owner",
    email: "objective-edit-owner@nuogo.test",
    password: "Nuogo123!"
  });
  const outsider = await request(app).post("/api/auth/register").send({
    name: "Objective Outsider",
    email: "objective-edit-outsider@nuogo.test",
    password: "Nuogo123!"
  });
  const saved = trip();
  saved.ownerId = owner.body.user.id;
  repository.trips.set(saved.id, saved);
  return { app, repository, objectivePlanner, owner, outsider };
}

describe("objective itinerary edit and regeneration API", () => {
  it("atomically saves a valid entry edit at the expected revision", async () => {
    const { app, repository, owner } = await apiFixture();
    const response = await request(app)
      .patch("/api/trips/trip-objective/entries/BALANCED%3A1%3A1")
      .set("Authorization", `Bearer ${owner.body.token}`)
      .send({ expectedRevision: 2, plannedDurationMinutes: 45 })
      .expect(200);

    expect(response.body.revision).toBe(3);
    expect(response.body.trip.itineraryRun.itinerary.days[0].activities[0].plannedDurationMinutes).toBe(45);
    expect((await repository.getTrip("trip-objective")).revision).toBe(3);
  });

  it("rejects invalid, stale, and cross-user edits without mutating the trip", async () => {
    const { app, repository, owner, outsider } = await apiFixture();
    await request(app)
      .patch("/api/trips/trip-objective/entries/BALANCED%3A1%3A1")
      .set("Authorization", `Bearer ${owner.body.token}`)
      .send({ expectedRevision: 2, xid: "unknown-xid" })
      .expect(422);
    await request(app)
      .patch("/api/trips/trip-objective/entries/BALANCED%3A1%3A1")
      .set("Authorization", `Bearer ${owner.body.token}`)
      .send({ expectedRevision: 1, plannedDurationMinutes: 45 })
      .expect(409);
    await request(app)
      .patch("/api/trips/trip-objective/entries/BALANCED%3A1%3A1")
      .set("Authorization", `Bearer ${outsider.body.token}`)
      .send({ expectedRevision: 2, plannedDurationMinutes: 45 })
      .expect(403);

    expect((await repository.getTrip("trip-objective")).revision).toBe(2);
  });

  it("creates a linked trip version from validated preference changes", async () => {
    const { app, repository, objectivePlanner, owner } = await apiFixture();
    vi.spyOn(repository, "saveObjectiveTrip").mockImplementation(async (ownerId, result) => ({
      ...result.trip,
      ownerId,
      objectiveAligned: true,
      variants: result.variants,
      validation: result.validation,
      generationState: result.state,
      revision: 0,
      selectedVariantId: null
    }));

    const response = await request(app)
      .post("/api/trips/trip-objective/regenerate")
      .set("Authorization", `Bearer ${owner.body.token}`)
      .send({ expectedRevision: 2, preferences: { budgetMinor: 40_000 } })
      .expect(201);

    expect(objectivePlanner).toHaveBeenCalledWith(expect.objectContaining({ budgetMinor: 40_000 }));
    expect(response.body.trip).toMatchObject({
      id: "trip-child",
      parentTripId: "trip-objective",
      budgetMinor: 40_000,
      revision: 0
    });
    expect((await repository.getTrip("trip-objective")).revision).toBe(2);
  });
});
