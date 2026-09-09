import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { DemoPlanProvider } from "../src/providers/demoProvider.js";
import { MemoryRepository } from "../src/repositories/memory.js";
import { resolveCostReferences } from "../src/services/budget/costReferenceService.js";
import { demoCostReferenceFixtures } from "../src/services/budget/demoCostReferenceFixtures.js";
import { spendingProfileIds } from "../src/services/budget/spendingProfiles.js";
import { buildVariantMetrics } from "../src/services/itinerary/buildVariantMetrics.js";
import { generateValidatedTrip } from "../src/services/itinerary/generateValidatedTrip.js";

const centres = {
  singapore: { longitude: 103.8198, latitude: 1.3521 }
};

function preferences(destination = "singapore", overrides = {}) {
  return {
    destination,
    startDate: "2026-10-10",
    endDate: "2026-10-11",
    travellerCount: 2,
    budgetMinor: 500000,
    currency: "SGD",
    interests: ["HISTORY", "FOOD"],
    preferredSights: [],
    attractionSelectionMode: "AUTO",
    selectedAttractions: [],
    travelStyle: "BALANCED",
    rainyDayBackupEnabled: false,
    otherPreferences: "",
    language: "en",
    consentToLlmProcessing: true,
    ...overrides
  };
}

function attractionCandidates(city) {
  const { longitude, latitude } = centres[city];
  return Array.from({ length: 18 }, (_, index) => ({
    xid: `${city}-xid-${index + 1}`,
    name: city === "singapore" && index === 0 ? "Forbidden City" : `${city} place ${index + 1}`,
    kinds: "interesting_places,historic",
    coordinates: {
      longitude: longitude + index * 0.006,
      latitude: latitude + index * 0.004,
      coordinateSystem: "WGS84"
    },
    city,
    sourceUrl: `https://opentripmap.com/en/card/${city}-xid-${index + 1}`,
    retrievedAt: "2026-08-14T00:00:00.000Z",
    matchStatus: "MATCHED"
  }));
}

function draftProvider() {
  return {
    generateStructured: vi.fn(async ({ user }) => {
      const data = JSON.parse(user).UNTRUSTED_USER_DATA ?? JSON.parse(user).UNTRUSTED_REPAIR_DATA;
      const request = data.preferences ? data : data.draft;
      const profile = data.profile ?? request.travelStyle;
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
        const poiIndexes = Array.from({ length: 2 }, (_, activityIndex) => {
          if (includesPreferredSight && dayIndex === 0 && activityIndex === 0) return 0;
          return offset + dayIndex * 2 + activityIndex + (includesPreferredSight ? 1 : 0);
        });
        return {
          dayNumber: dayIndex + 1,
          date: date.toISOString().slice(0, 10),
          startPoint: { locationId: "hotel", locationType: "HOTEL" },
          activities: [
            {
              sequence: 1,
              xid: ids[poiIndexes[0] % ids.length],
              activityType: "HISTORY",
              plannedStartTime: "10:00",
              plannedDurationMinutes: 90,
              reason: "Profile-specific grounded stop."
            },
            {
              sequence: 2,
              activityType: "MEAL",
              sourceType: "AI_GENERATED",
              plannedStartTime: "12:00",
              plannedDurationMinutes: 60,
              reason: "Generic meal break near the preceding attraction."
            },
            {
              sequence: 3,
              xid: ids[poiIndexes[1] % ids.length],
              activityType: "CULTURE",
              plannedStartTime: "15:00",
              plannedDurationMinutes: 90,
              reason: "Profile-specific grounded stop."
            }
          ],
          endPoint: { locationId: "hotel", locationType: "HOTEL" }
        };
      });
      return JSON.stringify({
        travelStyle: profile,
        trip: {
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          travellerCount: trip.travellerCount,
          budgetMinor: trip.budgetMinor,
          currency: "SGD"
        },
        days
      });
    })
  };
}

const references = resolveCostReferences(demoCostReferenceFixtures("singapore"), { city: "singapore" });

function dependencies(overrides = {}) {
  return {
    retrieveAttractionCandidates: vi.fn(async ({ destination }) => attractionCandidates(destination)),
    getDestinationSettings: vi.fn(async ({ destination }) => ({
      center: centres[destination],
      radiusMeters: 20_000
    })),
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
  it("stops before LLM drafting when the validated candidate pool is empty", async () => {
    const provider = draftProvider();
    const result = await generateValidatedTrip(preferences(), dependencies({
      llmProvider: provider,
      retrieveAttractionCandidates: vi.fn(async () => [])
    }));

    expect(result).toMatchObject({
      state: "FAILED",
      variants: [],
      validation: { valid: false, issues: [expect.objectContaining({ code: "CANDIDATE_POOL_EMPTY" })] }
    });
    expect(provider.generateStructured).not.toHaveBeenCalled();
  });

  it("resolves structured selections once and drafts only the selected travel style", async () => {
    const provider = draftProvider();
    const selectedXid = "singapore-xid-1";
    const result = await generateValidatedTrip(preferences("singapore", { travelStyle: "COMFORT_FOCUSED", attractionSelectionMode: "MANUAL", selectedAttractions: [{ xid: selectedXid, displayName: "Untrusted label" }] }), dependencies({ llmProvider: provider }));
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0].itinerary.travelStyle).toBe("COMFORT_FOCUSED");
    const payloads = provider.generateStructured.mock.calls.filter(([call]) => JSON.parse(call.user).UNTRUSTED_USER_DATA?.preferences).map(([call]) => JSON.parse(call.user).UNTRUSTED_USER_DATA);
    expect(payloads).toHaveLength(1);
    expect(payloads[0].profile).toBe("COMFORT_FOCUSED");
    expect(payloads.every(({ selectedCandidateIds, allowedCandidateIds }) => selectedCandidateIds.includes(selectedXid) && allowedCandidateIds.includes(selectedXid))).toBe(true);
    expect(result.variants.every(({ summary }) => summary.totalMinor <= summary.budgetMinor && Number.isInteger(summary.baselineMandatoryCostMinor))).toBe(true);
    expect(result.variants.every(({ selectedAttractionOutcome }) => selectedAttractionOutcome.requested.length === 1 && selectedAttractionOutcome.included.length + selectedAttractionOutcome.excluded.length === 1)).toBe(true);
  });

  it("creates a localized title for a Chinese itinerary", async () => {
    const result = await generateValidatedTrip(
      preferences("singapore", { language: "zh" }),
      dependencies()
    );

    expect(result.trip.title).toBe("新加坡行程");
  });

  it("retains every spending-profile tier in derived variant metrics", () => {
    const profile = "BALANCED";
    const metrics = buildVariantMetrics({ travelStyle: profile, days: [] }, {
      totalMinor: 0,
      remainingMinor: 0
    }, {
      accommodationTier: "MID_RANGE",
      localTransportationTier: "BALANCED",
      foodTier: "BALANCED",
      pace: "MODERATE"
    });

    expect(metrics).toMatchObject({
      accommodationTier: "MID_RANGE",
      localTransportationTier: "BALANCED",
      foodTier: "BALANCED"
    });
  });

  it("passes the five-day Kuala Lumpur to Singapore acceptance fixture for the selected style", async () => {
    const input = preferences("singapore", {
      origin: "Kuala Lumpur",
      startDate: "2026-10-10",
      endDate: "2026-10-14",
      arrivalDateTime: "2026-10-10T10:00:00+08:00",
      departureDateTime: "2026-10-14T20:00:00+08:00",
      budgetMinor: 1_000_000,
      preferredSights: ["Forbidden City"],
      outboundTransportMode: "FLIGHT",
      returnTransportMode: "FLIGHT",
      outboundTransportCostCny: 1500,
      returnTransportCostCny: 1500
    });
    const result = await generateValidatedTrip(input, dependencies());

    expect(result.state, JSON.stringify(result.validation)).toBe("FINAL_VALIDATED");
    expect(result.variants).toHaveLength(1);
    for (const variant of result.variants) {
      expect(variant.state).toBe("FINAL_VALIDATED");
      expect(variant.validation.valid).toBe(true);
      expect(variant.summary.totalMinor).toBeLessThanOrEqual(1_000_000);
      expect(Object.keys(variant.summary.categoriesMinor)).toHaveLength(6);
      expect(variant.itinerary.days[0].presentation).toMatchObject({
        activityCount: expect.any(Number),
        mealCount: expect.any(Number),
        transportLegCount: expect.any(Number),
        estimatedDailyCostMinor: expect.any(Number)
      });
      expect(variant.itinerary.days[0].activities[0].presentation)
        .toHaveProperty("reasonSourceType", "AI_GENERATED");
      expect(variant.itinerary.days).toHaveLength(5);
      expect(variant.itinerary.days[0].activities.some(({ poi }) => poi.name === "Forbidden City")).toBe(true);
      expect(variant.itinerary.days[0].activities[0].scheduledStartTime >= "10:00").toBe(true);
      expect(variant.itinerary.days.at(-1).activities.at(-1).scheduledEndTime <= "20:00").toBe(true);
      for (const [index, day] of variant.itinerary.days.entries()) {
        expect(day.legs).toHaveLength(day.activities.filter(({ xid }) => xid).length + 1);
        expect(day.legs.every(({ durationMinutes }) => durationMinutes > 0)).toBe(true);
        expect(day.activities.filter(({ xid }) => xid)
          .every(({ poi }) => poi.primarySource === "OPENTRIPMAP")).toBe(true);
        expect(day.activities.filter(({ activityType }) => activityType === "MEAL")
          .every((entry) => !entry.xid && !entry.poi && entry.sourceType === "AI_GENERATED")).toBe(true);
        if (index > 0) expect(day.startPoint.locationId).toBe(variant.itinerary.days[index - 1].endPoint.locationId);
      }
    }
  });

  it("maps provider facts, AI rationale, estimates, preferences, and cost references to approved provenance categories", async () => {
    const result = await generateValidatedTrip(preferences(), dependencies());
    const variant = result.variants[0];
    const attraction = variant.itinerary.days[0].activities.find(({ xid }) => xid);
    const generic = variant.itinerary.days[0].activities.find(({ xid }) => !xid);
    const sourceTypes = new Set(variant.provenance.map(({ source }) => source.sourceType));

    expect(sourceTypes).toEqual(new Set([
      "USER_PROVIDED",
      "OPENTRIPMAP_API",
      "DATABASE_BACKED",
      "AI_GENERATED",
      "ESTIMATED"
    ]));
    expect(sourceTypes).not.toContain("CURRENTLY_VERIFIED");
    expect(variant.provenance).toContainEqual({
      path: `days.1.activities.${attraction.sequence}.poi`,
      source: {
        sourceType: "OPENTRIPMAP_API",
        xid: attraction.xid,
        provider: "OPENTRIPMAP",
        sourceUrl: `https://opentripmap.com/en/card/${attraction.xid}`,
        retrievedAt: "2026-08-14T00:00:00.000Z",
        city: "singapore",
        matchStatus: "MATCHED",
        verificationStatus: "SUPPORTING_ONLY"
      }
    });
    expect(variant.provenance).toContainEqual({
      path: `days.1.activities.${generic.sequence}.reason`,
      source: { sourceType: "AI_GENERATED" }
    });
    expect(variant.provenance).toContainEqual({
      path: "summary.categoriesMinor",
      source: { sourceType: "ESTIMATED" }
    });
    expect(variant.provenance).toContainEqual(expect.objectContaining({
      path: "summary.costReferences.attractionTickets",
      source: expect.objectContaining({
        sourceType: "DATABASE_BACKED",
        referenceId: expect.any(String)
      })
    }));
    expect(variant.provenance.some(({ path, source }) =>
      path === `days.1.activities.${generic.sequence}.poi` ||
      (source.sourceType === "OPENTRIPMAP_API" && source.xid === undefined))).toBe(false);
  });

  it("attaches a grounded rainy-day alternative without adding its unused cost to the trip total", async () => {
    const selectedXid = "singapore-xid-2";
    const candidates = attractionCandidates("singapore").map((item, index) => index === 0
      ? { ...item, category: "CULTURE", kinds: "museums,cultural" }
      : index === 1 ? { ...item, category: "NATURE", kinds: "gardens,natural" } : item);
    const result = await generateValidatedTrip(preferences("singapore", {
      rainyDayBackupEnabled: true
    }), dependencies({ retrieveAttractionCandidates: vi.fn(async () => candidates) }));
    const variant = result.variants[0];

    expect(variant.state).toBe("FINAL_VALIDATED");
    expect(variant.rainyDayBackups).toEqual([expect.objectContaining({
      replacesXid: selectedXid,
      alternative: expect.objectContaining({ xid: "singapore-xid-1", city: "singapore" })
    })]);
    expect(variant.summary.totalMinor).toBe(variant.itinerary.budgetSummary.totalMinor);
    expect(variant.provenance).toContainEqual(expect.objectContaining({
      path: "rainyDayBackups.0.alternative",
      source: expect.objectContaining({ sourceType: "OPENTRIPMAP_API", xid: "singapore-xid-1" })
    }));
  });

  it("creates a dense and connected demo itinerary for the selected style", async () => {
    const input = preferences("singapore", {
      startDate: "2026-10-10",
      endDate: "2026-10-14",
      arrivalDateTime: "2026-10-10T10:00:00+08:00",
      departureDateTime: "2026-10-14T20:00:00+08:00",
      budgetMinor: 1_000_000,
      preferredSights: ["Forbidden City"]
    });
    const result = await generateValidatedTrip(input, dependencies({
      llmProvider: new DemoPlanProvider()
    }));

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(result.variants).toHaveLength(1);

    for (const variant of result.variants) {
      const allIds = variant.itinerary.days.flatMap((day) =>
        day.activities.flatMap(({ xid }) => xid ? [xid] : []));
      expect(new Set(allIds).size).toBe(allIds.length);
      expect(variant.itinerary.days[2].activities.length).toBeGreaterThanOrEqual(3);
      expect(variant.itinerary.days[0].activities.some(({ poi }) => poi.name === "Forbidden City")).toBe(true);
      expect(variant.variantMetrics.activityCount).toBe(15);
      expect(variant.variantMetrics.attractionCount).toBe(allIds.length);
      expect(variant.variantMetrics.daySummaries).toHaveLength(5);
      expect(variant.summary.totalMinor).toBeLessThanOrEqual(variant.summary.budgetMinor);
    }
  });

  it("validates a dense five-day plan against the injected demo candidate catalogue", async () => {
    const input = preferences("singapore", {
      startDate: "2026-10-10",
      endDate: "2026-10-14",
      arrivalDateTime: "2026-10-10T08:00:00+08:00",
      departureDateTime: "2026-10-14T20:00:00+08:00",
      budgetMinor: 2_000_000,
      preferredSights: ["Forbidden City"]
    });
    const result = await generateValidatedTrip(input, dependencies({ llmProvider: new DemoPlanProvider() }));

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(new Set(result.variants.map(({ summary }) => summary.totalMinor)).size).toBe(1);
    expect(result.variants.every(({ variantMetrics }) => variantMetrics.activityCount === 15)).toBe(true);
  });

  for (const city of ["singapore"]) {
    for (const travelStyle of spendingProfileIds) {
      it(`generates one validated ${travelStyle} hard-budget itinerary for ${city}`, async () => {
      const result = await generateValidatedTrip(preferences(city, { travelStyle }), dependencies());

      expect(result.state).toBe("FINAL_VALIDATED");
      expect(result.variants.map(({ itinerary }) => itinerary.travelStyle)).toEqual([travelStyle]);
      for (const variant of result.variants) {
        expect(variant.state).toBe("FINAL_VALIDATED");
        expect(variant.validation.valid).toBe(true);
        expect(variant.summary.budgetMinor).toBe(500_000);
        expect(variant.summary.totalMinor).toBeLessThanOrEqual(500_000);
        expect(variant.itinerary.days[0].activities[0].poi).toMatchObject({
          primarySource: "OPENTRIPMAP",
          name: expect.any(String),
          coordinates: expect.any(Object)
        });
        expect(variant.itinerary.days[0].activities[0].estimatedActivityCostMinor).toBe(9200);
        expect(variant.itinerary.days[0].startPoint).toMatchObject({
          locationType: "HOTEL",
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
  }

  it("keeps provider-authored driving charges outside the authoritative budget", async () => {
    const deps = dependencies({
      resolveDrivingLeg: vi.fn(async () => ({ distanceKm: 120, tollCny: 30, parkingCny: 0 }))
    });
    const result = await generateValidatedTrip(preferences("singapore", {
      outboundTransportMode: "DRIVING",
      outboundTransportCostCny: undefined,
      fuelConsumptionLitresPer100Km: 8
    }), deps);

    expect(deps.resolveDrivingLeg).not.toHaveBeenCalled();
    expect(result.variants[0].summary.categoriesMinor).not.toHaveProperty("outboundTransport");
  });

  it("rejects a five-day request when the provider supplies only one chargeable day", async () => {
    const provider = draftProvider();
    const generate = provider.generateStructured;
    provider.generateStructured = vi.fn(async (request) => {
      const draft = JSON.parse(await generate(request));
      draft.days = [draft.days[0]];
      return JSON.stringify(draft);
    });
    const result = await generateValidatedTrip(preferences("singapore", {
      startDate: "2026-10-10",
      endDate: "2026-10-14",
      arrivalDateTime: "2026-10-10T08:00:00+08:00",
      departureDateTime: "2026-10-14T20:00:00+08:00",
      budgetMinor: 1_000_000
    }), dependencies({ llmProvider: provider }));

    expect(result.state).toBe("FAILED");
    expect(result.variants.every(({ validation }) => validation.issues
      .some(({ code }) => code === "SCHEDULE_DATE_MISSING"))).toBe(true);
    expect(result.variants.map(({ summary }) => summary.categoriesMinor.accommodation))
      .toEqual([66_000]);
    expect(result.variants.map(({ summary }) => summary.categoriesMinor.localTransportation))
      .toEqual([1_900]);
    expect(result.variants.map(({ summary }) => summary.categoriesMinor.foodAndBeverages))
      .toEqual([47_500]);
  });

  it("returns and records a safe failure when the budget is impossible", async () => {
    const deps = dependencies();
    const result = await generateValidatedTrip(preferences("singapore", { budgetMinor: 100 }), deps);

    expect(result.state).toBe("FAILED");
    expect(result.variants.every(({ state }) => state === "FAILED")).toBe(true);
    const issueCodes = result.variants.flatMap(({ validation }) => validation.issues).map(({ code }) => code);
    expect(issueCodes).toContain("BUDGET_EXCEEDED");
    expect(deps.saveRun).toHaveBeenCalledWith(expect.objectContaining({ state: "FAILED" }));
  });

  it("fails closed and records the provider code when travel data is unavailable", async () => {
    const deps = dependencies({
      retrieveAttractionCandidates: vi.fn()
        .mockRejectedValue(Object.assign(new Error("offline"), { code: "PROVIDER_UNAVAILABLE" }))
    });
    const result = await generateValidatedTrip(preferences(), deps);

    expect(result).toMatchObject({ state: "FAILED", variants: [] });
    expect(result.validation.issues).toEqual([
      expect.objectContaining({ code: "PROVIDER_UNAVAILABLE", severity: "ERROR" })
    ]);
    expect(deps.saveRun).toHaveBeenCalledWith(expect.objectContaining({ state: "FAILED" }));
  });

  it("keeps a valid itinerary when references do not create a distinct style total", async () => {
    const flatReferences = references.map((item) => {
      if (item.category === "ACCOMMODATION_ROOM_NIGHT") {
        return { ...item, minMinor: 24_900, representativeMinor: 25_000, maxMinor: 25_100 };
      }
      if (item.category === "LOCAL_TRANSPORT_PERSON_DAY") {
        return { ...item, minMinor: 1_900, representativeMinor: 2_000, maxMinor: 2_100 };
      }
      if (item.category === "FOOD_PERSON_MEAL") {
        return { ...item, minMinor: 2_400, representativeMinor: 2_500, maxMinor: 2_600 };
      }
      return item;
    });
    const result = await generateValidatedTrip(preferences(), dependencies({
      getCostReferences: vi.fn(async () => flatReferences)
    }));

    expect(result.state).toBe("FINAL_VALIDATED");
    expect(result.validation.issues).toEqual([]);
    expect(result).not.toHaveProperty("differentiationPairs");
  });

  it("fails before drafting when selected database references are unavailable", async () => {
    const getCostReferences = vi.fn(async () => {
      throw Object.assign(new Error("missing"), { code: "MISSING_COST_REFERENCE" });
    });
    const deps = dependencies({ getCostReferences });
    const result = await generateValidatedTrip(preferences(), deps);

    expect(result).toMatchObject({ state: "FAILED", variants: [] });
    expect(result.validation.issues).toEqual([
      expect.objectContaining({ code: "MISSING_COST_REFERENCE", severity: "ERROR" })
    ]);
    expect(deps.llmProvider.generateStructured).not.toHaveBeenCalled();
  });

  it("fails the itinerary when the model uses an xid outside the retrieved allow-list", async () => {
    const provider = draftProvider();
    const generate = provider.generateStructured;
    provider.generateStructured = vi.fn(async (request) => {
      const draft = JSON.parse(await generate(request));
      draft.days[0].activities[0].xid = "UNKNOWN-XID";
      return JSON.stringify(draft);
    });

    const result = await generateValidatedTrip(preferences(), dependencies({ llmProvider: provider }));

    expect(result.state).toBe("FAILED");
    expect(result.variants).toHaveLength(1);
    expect(result.variants.every(({ validation }) =>
      validation.issues.some(({ code }) => code === "UNKNOWN_ATTRACTION_XID"))).toBe(true);
  });

  it("routes the new preference schema through the validated planner", async () => {
    const objectivePlanner = vi.fn(async (input) => ({
      state: "FINAL_VALIDATED",
      trip: { id: "objective-trip", destination: input.destination },
      itineraryRun: { itinerary: { travelStyle: "BALANCED" }, state: "FINAL_VALIDATED" },
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
    expect(response.body.itineraryRun).toMatchObject({ itinerary: { travelStyle: "BALANCED" } });
    expect(response.body).not.toHaveProperty("variants");
    expect(objectivePlanner).toHaveBeenCalledWith(expect.objectContaining({
      destination: "singapore",
      budgetMinor: 500000
    }));
    expect(await repository.getTrip("objective-trip")).toMatchObject({
      id: "objective-trip",
      ownerId: auth.body.user.id,
      objectiveAligned: true,
      destination: "singapore"
    });
    await request(app).post("/api/trips/objective-trip/select-variant")
      .set("Authorization", `Bearer ${auth.body.token}`)
      .send({ variantId: "BALANCED", expectedRevision: 0 })
      .expect(404);
  });

  it("never dispatches incomplete generation requests to the legacy planner", async () => {
    const objectivePlanner = vi.fn();
    const legacyGenerate = vi.fn(async () => "not-used");
    const app = createApp({
      repository: new MemoryRepository(),
      planProvider: { generate: legacyGenerate },
      objectivePlanner,
      attractionCatalogue: { listApproved: () => [] },
      config: {
        jwtSecret: "test-secret-with-enough-length",
        demoMode: true,
        aiProvider: "demo",
        enableLegacyFeatures: false,
        clientOrigin: "http://localhost:5173"
      }
    });
    const auth = await request(app).post("/api/auth/register").send({
      name: "Objective Student",
      email: "objective-missing-budget@nuogo.test",
      password: "Nuogo123!"
    });

    const response = await request(app).post("/api/trips/generate")
      .set("Authorization", `Bearer ${auth.body.token}`)
      .send({
        destination: "singapore",
        departureCity: "singapore",
        days: 2,
        totalBudget: 5000,
        interests: ["historical_relics", "local_street_food"],
        groupType: "couple",
        accommodation: "budget_hotel",
        language: "en",
        startDate: "2026-10-10"
      })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(objectivePlanner).not.toHaveBeenCalled();
    expect(legacyGenerate).not.toHaveBeenCalled();
  });

  it("returns a standard actionable error when validated generation fails", async () => {
    const objectivePlanner = vi.fn(async () => ({
      state: "FAILED",
      variants: [],
      validation: {
        valid: false,
        issues: [{ code: "BUDGET_EXCEEDED", path: ["budget"], severity: "ERROR" }]
      }
    }));
    const app = createApp({
      repository: new MemoryRepository(),
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
      name: "Budget Student",
      email: "objective-budget-failure@nuogo.test",
      password: "Nuogo123!"
    });

    const response = await request(app).post("/api/trips/generate")
      .set("Authorization", `Bearer ${auth.body.token}`)
      .send(preferences())
      .expect(422);

    expect(response.body).toEqual({
      error: {
        code: "GENERATION_CONSTRAINTS_UNSATISFIED",
        message: "Nuogo could not create a valid itinerary within the current requirements and budget.",
        details: {
          issueCodes: ["BUDGET_EXCEEDED"],
          actionHints: ["ADJUST_BUDGET", "ADJUST_DATES_OR_PREFERENCES"]
        }
      }
    });
  });
});
