import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { DemoPlanProvider } from "../src/providers/demoProvider.js";
import { DemoTravelProvider } from "../src/providers/travel/demoTravelProvider.js";
import { MemoryRepository } from "../src/repositories/memory.js";
import { spendingProfileIds } from "../src/services/budget/spendingProfiles.js";
import { generateValidatedTrip } from "../src/services/itinerary/generateValidatedTrip.js";

const centres = {
  beijing: { longitude: 116.4074, latitude: 39.9042 },
  shanghai: { longitude: 121.4737, latitude: 31.2304 },
  xian: { longitude: 108.9398, latitude: 34.3416 }
};

function preferences(destination = "beijing", overrides = {}) {
  return {
    origin: "Main railway station",
    destination,
    startDate: "2026-10-10",
    endDate: "2026-10-11",
    travellerCount: 2,
    totalBudgetCny: 5000,
    interests: ["HISTORY", "FOOD"],
    preferredSights: [],
    accommodationPreference: "MID_RANGE",
    foodPreference: "LOCAL",
    localTransportPreference: "PUBLIC_TRANSIT",
    activityPreferences: ["HISTORY", "FOOD"],
    arrivalDateTime: "2026-10-10T08:00:00+08:00",
    departureDateTime: "2026-10-11T20:00:00+08:00",
    outboundTransportMode: "TRAIN",
    returnTransportMode: "TRAIN",
    outboundTransportCostCny: 300,
    returnTransportCostCny: 300,
    otherPreferences: "",
    language: "en",
    consentToLlmProcessing: true,
    ...overrides
  };
}

function rawPois(city) {
  const { longitude, latitude } = centres[city];
  return Array.from({ length: 18 }, (_, index) => ({
    id: `${city}-poi-${index + 1}`,
    name: city === "beijing" && index === 0 ? "Forbidden City" : `${city} place ${index + 1}`,
    category: index % 3 === 2 ? "RESTAURANT" : "ATTRACTION",
    typecode: index % 3 === 2 ? "050000" : "110000",
    address: city,
    cityname: city,
    location: `${longitude + index * 0.006},${latitude + index * 0.004}`,
    retrievedAt: "2026-08-14T00:00:00.000Z"
  }));
}

function draftProvider() {
  return {
    generateStructured: vi.fn(async ({ user }) => {
      const data = JSON.parse(user).UNTRUSTED_USER_DATA ?? JSON.parse(user).UNTRUSTED_REPAIR_DATA;
      const request = data.preferences ? data : data.draft;
      const profile = data.profile ?? request.variant;
      const ids = data.allowedCandidateIds;
      const offset = spendingProfileIds.indexOf(profile);
      const trip = request.preferences ?? request.trip;
      const start = new Date(`${trip.startDate}T00:00:00Z`);
      const end = new Date(`${trip.endDate}T00:00:00Z`);
      const dayCount = Math.round((end - start) / 86_400_000) + 1;
      const includesPreferredSight = (trip.preferredSights ?? []).includes("Forbidden City");
      const days = Array.from({ length: dayCount }, (_, dayIndex) => {
        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + dayIndex);
        const poiIndex = includesPreferredSight && dayIndex === 0 ? 0 : offset + dayIndex + (includesPreferredSight ? 1 : 0);
        return {
          dayNumber: dayIndex + 1,
          date: date.toISOString().slice(0, 10),
          startPoint: { locationId: dayIndex === 0 ? "origin" : "hotel", locationType: dayIndex === 0 ? "ORIGIN" : "HOTEL" },
          activities: [{
            sequence: 1,
            poiId: ids[poiIndex % ids.length],
            activityType: dayIndex === 1 ? "FOOD" : "HISTORY",
            plannedStartTime: dayIndex === 0 ? (trip.arrivalDateTime?.slice(11, 16) ?? "10:00") : "10:00",
            plannedDurationMinutes: dayIndex === 1 ? 60 : 90,
            reason: dayIndex === 1 ? "Nearby local meal." : "Profile-specific grounded stop."
          }],
          endPoint: {
            locationId: dayIndex === dayCount - 1 ? "destination" : "hotel",
            locationType: dayIndex === dayCount - 1 ? "DESTINATION" : "HOTEL"
          }
        };
      });
      return JSON.stringify({
        variant: profile,
        trip: {
          origin: trip.origin,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          travellerCount: trip.travellerCount,
          totalBudgetCny: trip.totalBudgetCny
        },
        days
      });
    })
  };
}

const references = {
  accommodationRoomNightFen: 20_000,
  foodPersonMealFen: 2_000,
  attractionPersonEntryFen: 3_000,
  entertainmentPersonEntryFen: 3_000,
  otherTripFen: 2_000,
  fuelLitreFen: 800,
  parkingDayFen: 2_000,
  provenance: {}
};

function dependencies(overrides = {}) {
  const travelProvider = {
    searchPois: vi.fn(async ({ city }) => rawPois(city)),
    enrichTourism: vi.fn(async () => []),
    getRoute: vi.fn(async ({ mode }) => ({
      provider: "DEMO",
      mode,
      distanceMeters: 1200,
      durationSeconds: 300,
      tollsCny: 0,
      taxiCostCny: 12,
      retrievedAt: "2026-08-14T00:00:00.000Z"
    }))
  };
  return {
    travelProvider,
    llmProvider: draftProvider(),
    getCostReferences: vi.fn(async () => references),
    resolveAnchors: vi.fn(async ({ destination }) => ({
      origin: centres[destination],
      hotel: centres[destination],
      destination: centres[destination]
    })),
    saveRun: vi.fn(async (run) => run),
    now: () => "2026-08-14T00:00:00.000Z",
    ...overrides
  };
}

describe("objective-aligned trip generation", () => {
  it("passes the five-day Kuala Lumpur to Beijing acceptance fixture for all three profiles", async () => {
    const input = preferences("beijing", {
      origin: "Kuala Lumpur",
      startDate: "2026-10-10",
      endDate: "2026-10-14",
      arrivalDateTime: "2026-10-10T10:00:00+08:00",
      departureDateTime: "2026-10-14T20:00:00+08:00",
      totalBudgetCny: 10_000,
      preferredSights: ["Forbidden City"],
      outboundTransportMode: "FLIGHT",
      returnTransportMode: "FLIGHT",
      outboundTransportCostCny: 1500,
      returnTransportCostCny: 1500
    });
    const result = await generateValidatedTrip(input, dependencies());

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(result.variants).toHaveLength(3);
    for (const variant of result.variants) {
      expect(variant.state).toBe("FINAL_VALIDATED");
      expect(variant.validation.valid).toBe(true);
      expect(variant.summary.totalFen).toBeLessThanOrEqual(1_000_000);
      expect(Object.keys(variant.summary.categoriesFen)).toHaveLength(8);
      expect(variant.itinerary.days).toHaveLength(5);
      expect(variant.itinerary.days[0].activities.some(({ poi }) => poi.name === "Forbidden City")).toBe(true);
      expect(variant.itinerary.days[0].activities[0].scheduledStartTime >= "10:00").toBe(true);
      expect(variant.itinerary.days.at(-1).activities.at(-1).scheduledEndTime <= "20:00").toBe(true);
      for (const [index, day] of variant.itinerary.days.entries()) {
        expect(day.legs).toHaveLength(day.activities.length + 1);
        expect(day.legs.every(({ durationMinutes }) => durationMinutes > 0)).toBe(true);
        expect(day.activities.every(({ poi }) => poi.primarySource === "AMAP")).toBe(true);
        if (index > 0) expect(day.startPoint.locationId).toBe(variant.itinerary.days[index - 1].endPoint.locationId);
      }
    }
  });

  it("creates dense, connected, and meaningfully different demo profiles", async () => {
    const input = preferences("beijing", {
      startDate: "2026-10-10",
      endDate: "2026-10-14",
      arrivalDateTime: "2026-10-10T10:00:00+08:00",
      departureDateTime: "2026-10-14T20:00:00+08:00",
      totalBudgetCny: 10_000,
      preferredSights: ["Forbidden City"]
    });
    const result = await generateValidatedTrip(input, dependencies({
      llmProvider: new DemoPlanProvider()
    }));

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(result.variants).toHaveLength(3);
    expect(result.variants.map(({ summary }) => summary.totalFen))
      .toEqual([...result.variants.map(({ summary }) => summary.totalFen)].sort((a, b) => a - b));
    expect(new Set(result.variants.map(({ variantMetrics }) =>
      JSON.stringify(variantMetrics.transportDistribution))).size).toBe(3);

    for (const variant of result.variants) {
      const allIds = variant.itinerary.days.flatMap((day) => day.activities.map(({ poiId }) => poiId));
      expect(new Set(allIds).size).toBe(allIds.length);
      expect(variant.itinerary.days[2].activities.length).toBeGreaterThanOrEqual(3);
      expect(variant.itinerary.days[0].activities.some(({ poi }) => poi.name === "Forbidden City")).toBe(true);
      expect(variant.variantMetrics.activityCount).toBe(allIds.length);
      expect(variant.variantMetrics.daySummaries).toHaveLength(5);
      expect(variant.summary.totalFen).toBeLessThanOrEqual(variant.summary.budgetFen);
    }
  });

  it("validates a dense five-day plan against the real demo travel catalogue", async () => {
    const travelProvider = new DemoTravelProvider({ now: () => "2026-08-14T00:00:00.000Z" });
    const input = preferences("beijing", {
      startDate: "2026-10-10",
      endDate: "2026-10-14",
      arrivalDateTime: "2026-10-10T08:00:00+08:00",
      departureDateTime: "2026-10-14T20:00:00+08:00",
      totalBudgetCny: 20_000,
      preferredSights: ["Forbidden City"]
    });
    const result = await generateValidatedTrip(input, dependencies({
      travelProvider,
      llmProvider: new DemoPlanProvider()
    }));

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(new Set(result.variants.map(({ summary }) => summary.totalFen)).size).toBe(3);
    expect(result.variants.every(({ variantMetrics }) => variantMetrics.activityCount === 15)).toBe(true);
  });

  for (const city of ["beijing", "shanghai", "xian"]) {
    it(`generates three independently validated hard-budget variants for ${city}`, async () => {
      const result = await generateValidatedTrip(preferences(city), dependencies());

      expect(result.state).toBe("FINAL_VALIDATED");
      expect(result.variants.map(({ itinerary }) => itinerary.variant)).toEqual(spendingProfileIds);
      expect(new Set(result.variants.map(({ itinerary }) => itinerary.days[0].activities[0].poiId)).size).toBe(3);
      for (const variant of result.variants) {
        expect(variant.state).toBe("FINAL_VALIDATED");
        expect(variant.validation.valid).toBe(true);
        expect(variant.summary.budgetFen).toBe(500_000);
        expect(variant.summary.totalFen).toBeLessThanOrEqual(500_000);
        expect(variant.itinerary.days[0].activities[0].poi).toMatchObject({
          primarySource: "AMAP",
          name: expect.any(String),
          coordinates: expect.any(Object)
        });
        expect(variant.itinerary.days[0].activities[0].estimatedActivityCostFen).toBe(6000);
        expect(variant.itinerary.days[0].startPoint).toMatchObject({
          locationType: "ORIGIN",
          coordinates: expect.any(Object),
          locationIsEstimated: true
        });
        expect(variant.itinerary.days[0].endPoint).toMatchObject({
          locationType: "HOTEL",
          coordinates: expect.any(Object),
          locationIsEstimated: true
        });
      }
    });
  }

  it("derives outbound driving cost without relaxing the shared budget", async () => {
    const deps = dependencies({
      resolveDrivingLeg: vi.fn(async () => ({ distanceKm: 120, tollCny: 30, parkingCny: 0 }))
    });
    const result = await generateValidatedTrip(preferences("beijing", {
      outboundTransportMode: "DRIVING",
      outboundTransportCostCny: undefined,
      fuelConsumptionLitresPer100Km: 8
    }), deps);

    expect(deps.resolveDrivingLeg).toHaveBeenCalledWith(expect.objectContaining({ direction: "outbound" }));
    expect(result.variants[0].summary.categoriesFen.outboundTransport).toBe(10_680);
  });

  it("returns and records a safe failure when the budget is impossible", async () => {
    const deps = dependencies();
    const result = await generateValidatedTrip(preferences("beijing", { totalBudgetCny: 100 }), deps);

    expect(result.state).toBe("FAILED");
    expect(result.variants.every(({ state }) => state === "FAILED")).toBe(true);
    const issueCodes = result.variants.flatMap(({ validation }) => validation.issues).map(({ code }) => code);
    expect(issueCodes).toContain("BUDGET_EXCEEDED");
    expect(deps.saveRun).toHaveBeenCalledWith(expect.objectContaining({ state: "FAILED" }));
  });

  it("fails closed and records the provider code when travel data is unavailable", async () => {
    const deps = dependencies({
      travelProvider: {
        searchPois: vi.fn().mockRejectedValue(Object.assign(new Error("offline"), { code: "PROVIDER_UNAVAILABLE" }))
      }
    });
    const result = await generateValidatedTrip(preferences(), deps);

    expect(result).toMatchObject({ state: "FAILED", variants: [] });
    expect(result.validation.issues).toEqual([
      expect.objectContaining({ code: "PROVIDER_UNAVAILABLE", severity: "ERROR" })
    ]);
    expect(deps.saveRun).toHaveBeenCalledWith(expect.objectContaining({ state: "FAILED" }));
  });

  it("routes the new preference schema through the validated planner", async () => {
    const objectivePlanner = vi.fn(async (input) => ({
      state: "FINAL_VALIDATED",
      trip: { id: "objective-trip", destination: input.destination },
      variants: [{ itinerary: { variant: "BALANCED" }, state: "FINAL_VALIDATED" }],
      validation: { valid: true, issues: [] }
    }));
    const repository = new MemoryRepository();
    const app = createApp({
      repository,
      planProvider: {},
      objectivePlanner,
      attractionCatalogue: { listApproved: () => [] },
      config: {
        jwtSecret: "test-secret-with-enough-length",
        demoMode: true,
        aiProvider: "demo",
        clientOrigin: "http://localhost:5173"
      }
    });
    const auth = await request(app).post("/api/auth/register").send({
      name: "Objective Student",
      email: "objective@nuogo.test",
      password: "Nuogo123!"
    });
    const response = await request(app).post("/api/trips/generate")
      .set("Authorization", `Bearer ${auth.body.token}`)
      .send(preferences())
      .expect(201);

    expect(response.body.trip.id).toBe("objective-trip");
    expect(objectivePlanner).toHaveBeenCalledWith(expect.objectContaining({
      destination: "beijing",
      totalBudgetCny: 5000
    }));
    expect(await repository.getTrip("objective-trip")).toMatchObject({
      id: "objective-trip",
      ownerId: auth.body.user.id,
      objectiveAligned: true,
      destination: "beijing"
    });
    const selected = await request(app).post("/api/trips/objective-trip/select-variant")
      .set("Authorization", `Bearer ${auth.body.token}`)
      .send({ variantId: "BALANCED", expectedRevision: 0 })
      .expect(200);
    expect(selected.body.trip).toMatchObject({ selectedVariantId: "BALANCED", revision: 1 });
  });
});
