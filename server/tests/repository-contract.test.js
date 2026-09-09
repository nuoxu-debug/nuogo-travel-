import { describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "../src/repositories/memory.js";
import { MySqlRepository } from "../src/repositories/mysql.js";

const requiredMethods = [
  "createUser", "findUserByEmail", "findUserById", "touchGuestSession", "updateUserProfile",
  "updateUserPassword", "recordPrivacyConsent", "deleteAccount", "getUserRole",
  "setUserRole", "listSupportedDestinations",
  "upsertCanonicalPoi", "listCanonicalPois", "putRouteCache", "getRouteCache",
  "upsertCostReference", "listCostReferences", "saveItineraryRun", "getItineraryRun",
  "saveObjectiveTrip", "listTrips", "getTrip", "claimGuestTrip", "updateTrip",
  "deleteTrip", "duplicateTrip", "selectObjectiveVariant", "updateObjectiveVariant",
  "listUsers", "setUserStatus", "appendSystemRecord", "listSystemRecords"
];

const retiredMethods = [
  "createShare", "getShare", "vote", "listFavorites", "addFavorite", "deleteFavorite",
  "getMember", "listMembers", "createInvitation", "getInvitationByTokenHash",
  "listInvitations", "updateInvitation", "acceptInvitation", "updateMember", "removeMember",
  "listExpenses", "getExpense", "createExpense", "updateExpense", "deleteExpense",
  "createTrip", "insertActivity", "findActivityContext", "selectVariant"
];

function objectiveResult() {
  const sourceUrl = "https://opentripmap.com/en/card/otm-bj-palace";
  const provenance = [
    { path: "trip.preferences", source: { sourceType: "USER_PROVIDED" } },
    {
      path: "days.1.activities.1.poi",
      source: {
        sourceType: "OPENTRIPMAP_API",
        xid: "otm-bj-palace",
        provider: "OPENTRIPMAP",
        sourceUrl,
        retrievedAt: "2026-08-14T00:00:00.000Z",
        city: "singapore",
        matchStatus: "MATCHED",
        verificationStatus: "SUPPORTING_ONLY"
      }
    },
    { path: "days.1.activities.1.reason", source: { sourceType: "AI_GENERATED" } },
    { path: "days.1.legs.0", source: { sourceType: "ESTIMATED" } },
    {
      path: "summary.costReferences.attractionTickets",
      source: { sourceType: "DATABASE_BACKED", referenceId: "cost-attraction" }
    }
  ];
  return {
    id: "generation-1",
    state: "FINAL_VALIDATED",
    trip: {
      id: "objective-trip-1",
      title: "Singapore journey",
      destination: "singapore",
      startDate: "2026-10-10",
      endDate: "2026-10-10",
      travellerCount: 2,
      budgetMinor: 5000,
      preferences: { destination: "singapore", budgetMinor: 5000 }
    },
    variants: [{
      state: "FINAL_VALIDATED",
      itinerary: {
        variant: "BALANCED",
        days: [{
          dayNumber: 1,
          activities: [{
            sequence: 1,
            xid: "otm-bj-palace",
            reason: "Fits the requested history interest.",
            poi: {
              primarySource: "OPENTRIPMAP",
              city: "singapore",
              matchStatus: "MATCHED",
              verificationStatus: "SUPPORTING_ONLY",
              sourceRecords: [{
                provider: "OPENTRIPMAP",
                sourceId: "otm-bj-palace",
                sourceUrl,
                retrievedAt: "2026-08-14T00:00:00.000Z"
              }]
            }
          }],
          legs: [{
            id: "leg-1",
            distanceMeters: 1200,
            durationMinutes: 7,
            estimatedCostMinor: 300,
            sourceType: "ESTIMATED"
          }]
        }]
      },
      summary: { profile: "BALANCED", totalMinor: 10000 },
      provenance,
      validation: {
        valid: true,
        issues: [{
          code: "SOURCE_SUPPORTING_ONLY",
          path: ["days", 0, "activities", 0, "poi"],
          severity: "WARNING",
          metadata: { provider: "OPENTRIPMAP" }
        }]
      },
      repairs: [{
        attempt: 1,
        issueCodes: ["TIME_OVERLAP"],
        action: "DETERMINISTIC_REPAIR",
        finalState: "FINAL_VALIDATED"
      }]
    }],
    validation: { valid: true, issues: [] }
  };
}

describe("repository adapters", () => {
  it("expose the same controller-facing method contract", () => {
    for (const method of requiredMethods) {
      expect(typeof MemoryRepository.prototype[method]).toBe("function");
      expect(typeof MySqlRepository.prototype[method]).toBe("function");
    }
    for (const method of retiredMethods) {
      expect(MemoryRepository.prototype).not.toHaveProperty(method);
      expect(MySqlRepository.prototype).not.toHaveProperty(method);
    }
  });

  it("stores final evidenced cost-reference records and validated runs in memory", async () => {
    const repository = new MemoryRepository();
    const user = await repository.createUser({
      name: "Admin",
      email: "admin@example.com",
      passwordHash: "hash"
    });
    await repository.setUserRole(user.id, "admin");
    expect(await repository.getUserRole(user.id)).toBe("admin");

    await repository.upsertCanonicalPoi({
      id: "poi-1",
      destinationId: "singapore",
      name: { en: "Museum", zh: "Museum" },
      category: "CULTURE",
      coordinates: { latitude: 39.9, longitude: 116.4 },
      status: "ACTIVE",
      sources: [{ provider: "AMAP", sourceId: "amap-1", retrievedAt: "2026-08-14T00:00:00.000Z" }]
    });
    expect(await repository.listCanonicalPois("singapore")).toHaveLength(1);

    await repository.putRouteCache("route-key", {
      mode: "DRIVE",
      distanceMeters: 1200,
      durationSeconds: 420,
      source: { provider: "AMAP", sourceId: "route-1", retrievedAt: "2026-08-14T00:00:00.000Z" }
    });
    expect(await repository.getRouteCache("route-key")).toMatchObject({ distanceMeters: 1200 });

    await repository.upsertCostReference({
      id: "cost-1",
      city: "singapore",
      category: "ATTRACTION_PERSON_ENTRY",
      tier: null,
      minMinor: 3000,
      maxMinor: 4000,
      representativeMinor: 3500,
      currency: "SGD",
      sourceName: "Fixture evidence only",
      sourceUrl: "https://example.invalid/final-cost-reference-fixture",
      collectedOn: "2026-08-14",
      updatedAt: "2026-08-14T00:00:00.000Z",
      status: "ACTIVE"
    });
    expect(await repository.listCostReferences("singapore")).toEqual([{
      id: "cost-1",
      city: "singapore",
      category: "ATTRACTION_PERSON_ENTRY",
      tier: null,
      minMinor: 3000,
      maxMinor: 4000,
      representativeMinor: 3500,
      currency: "SGD",
      sourceName: "Fixture evidence only",
      sourceUrl: "https://example.invalid/final-cost-reference-fixture",
      collectedOn: "2026-08-14",
      updatedAt: "2026-08-14T00:00:00.000Z",
      status: "ACTIVE"
    }]);

    await repository.saveItineraryRun({
      id: "run-1",
      tripId: "trip-1",
      profile: "BALANCED",
      state: "FINAL_VALIDATED",
      estimatedTotalMinor: 880000,
      legs: [],
      provenance: [],
      validationIssues: [],
      repairs: []
    });
    expect(await repository.getItineraryRun("run-1"))
      .toMatchObject({ state: "FINAL_VALIDATED", estimatedTotalMinor: 880000 });
  });

  it("persists an objective trip, variant run, legs, provenance, validation, and repairs together in memory", async () => {
    const repository = new MemoryRepository();
    const result = objectiveResult();

    await repository.saveObjectiveTrip("owner-1", result);

    expect(await repository.getTrip("objective-trip-1")).toMatchObject({
      id: "objective-trip-1",
      variants: [expect.objectContaining({ state: "FINAL_VALIDATED" })]
    });
    expect(await repository.getItineraryRun("generation-1:BALANCED")).toMatchObject({
      tripId: "objective-trip-1",
      profile: "BALANCED",
      state: "FINAL_VALIDATED",
      legs: [expect.objectContaining({ id: "leg-1", dayNumber: 1, sequence: 0 })],
      provenance: expect.arrayContaining([
        expect.objectContaining({ source: expect.objectContaining({ sourceType: "OPENTRIPMAP_API" }) })
      ]),
      validationIssues: [expect.objectContaining({ code: "SOURCE_SUPPORTING_ONLY" })],
      repairs: [{
        attempt: 1,
        issueCodes: ["TIME_OVERLAP"],
        action: "DETERMINISTIC_REPAIR",
        finalState: "FINAL_VALIDATED"
      }]
    });
  });

  it("persists one itinerary run for new trips while retaining archived variants compatibility", async () => {
    const repository = new MemoryRepository();
    const result = objectiveResult();
    result.itineraryRun = {
      ...result.variants[0],
      itinerary: { ...result.variants[0].itinerary, travelStyle: "BALANCED", variant: undefined }
    };
    delete result.variants;

    await repository.saveObjectiveTrip("owner-1", result);

    const trip = await repository.getTrip(result.trip.id);
    expect(trip.itineraryRun).toMatchObject({ state: "FINAL_VALIDATED", itinerary: { travelStyle: "BALANCED" } });
    expect(trip).not.toHaveProperty("variants");
    expect(await repository.getItineraryRun("generation-1:BALANCED"))
      .toMatchObject({ profile: "BALANCED", state: "FINAL_VALIDATED" });

    const archived = objectiveResult();
    archived.trip.id = "archived-trip";
    await repository.saveObjectiveTrip("owner-1", archived);
    expect((await repository.getTrip("archived-trip")).variants).toHaveLength(1);
  });

  it("updates and duplicates a new single-run trip without creating variants", async () => {
    const repository = new MemoryRepository();
    const result = objectiveResult();
    result.itineraryRun = {
      ...result.variants[0],
      itinerary: { ...result.variants[0].itinerary, travelStyle: "BALANCED", variant: undefined }
    };
    delete result.variants;
    await repository.saveObjectiveTrip("owner-1", result);
    const updatedRun = { ...result.itineraryRun, summary: { ...result.itineraryRun.summary, totalMinor: 9000 } };

    const updated = await repository.updateObjectiveVariant(result.trip.id, "owner-1", updatedRun, 0);
    const duplicate = await repository.duplicateTrip(result.trip.id, "owner-1");

    expect(updated).toMatchObject({ itineraryRun: { summary: { totalMinor: 9000 } }, revision: 1 });
    expect(updated).not.toHaveProperty("variants");
    expect(duplicate.itineraryRun).toMatchObject({ itinerary: { travelStyle: "BALANCED" } });
    expect(duplicate).not.toHaveProperty("variants");
  });

  it("round-trips structured preferences, budget metrics, outcomes, and diagnostics without a migration", async () => {
    const repository = new MemoryRepository(); const result = objectiveResult();
    result.trip.preferences = { ...result.trip.preferences, attractionSelectionMode: "MANUAL", selectedAttractions: [{ xid: "otm-bj-palace", displayName: "故宫博物院" }] };
    result.variants[0].summary = { ...result.variants[0].summary, userBudgetMinor: 500000, baselineMandatoryCostMinor: 60000, profileControlledCostMinor: 40000, utilisationPercent: 20, remainingMinor: 400000 };
    result.variants[0].selectedAttractionOutcome = { requested: [{ requestId: "structured:palace", xid: "otm-bj-palace", displayName: { en: "Forbidden City", zh: "故宫博物院" } }], included: [{ requestId: "structured:palace", xid: "otm-bj-palace", displayName: { en: "Forbidden City", zh: "故宫博物院" } }], excluded: [] };
    result.differentiationDiagnostics = [{ code: "LIMITED_PROFILE_DIFFERENTIATION", severity: "INFO" }];
    await repository.saveObjectiveTrip("owner-1", result);
    expect(await repository.getTrip(result.trip.id)).toMatchObject({ preferences: result.trip.preferences, variants: [{ selectedAttractionOutcome: result.variants[0].selectedAttractionOutcome }], differentiationDiagnostics: result.differentiationDiagnostics });
  });

  it("persists a separately grounded rainy-day alternative without changing the main total", async () => {
    const repository = new MemoryRepository();
    const result = objectiveResult();
    const source = result.variants[0].provenance[1].source;
    const alternative = structuredClone(result.variants[0].itinerary.days[0].activities[0].poi);
    result.variants[0].rainyDayBackups = [{
      dayNumber: 1,
      activitySequence: 1,
      replacesXid: "otm-bj-palace",
      estimatedCostMinor: 10000,
      costSourceType: "ESTIMATED",
      alternative: { ...alternative, xid: "otm-bj-museum" }
    }];
    result.variants[0].rainyDayBackups[0].alternative.sourceRecords[0] = {
      ...alternative.sourceRecords[0],
      sourceId: "otm-bj-museum",
      sourceUrl: "https://opentripmap.com/en/card/otm-bj-museum"
    };
    result.variants[0].provenance.push({
      path: "rainyDayBackups.0.alternative",
      source: {
        ...source,
        xid: "otm-bj-museum",
        sourceUrl: "https://opentripmap.com/en/card/otm-bj-museum"
      }
    });

    await repository.saveObjectiveTrip("owner-1", result);

    expect((await repository.getTrip(result.trip.id)).variants[0]).toMatchObject({
      summary: { totalMinor: 10000 },
      rainyDayBackups: [expect.objectContaining({ estimatedCostMinor: 10000 })]
    });
  });

  it("rejects malformed current selection outcomes while archived records remain optional", async () => {
    const repository = new MemoryRepository(); const result = objectiveResult();
    result.variants[0].selectedAttractionOutcome = { requested: [], included: [{ requestId: "missing-name" }], excluded: [] };
    await expect(repository.saveObjectiveTrip("owner-1", result)).rejects.toThrow();
    await expect(repository.saveObjectiveTrip("owner-1", objectiveResult())).resolves.toBeDefined();
  });

  it("rejects incomplete attraction provenance without partially saving objective memory records", async () => {
    const repository = new MemoryRepository();
    const result = objectiveResult();
    delete result.variants[0].provenance[1].source.city;

    await expect(repository.saveObjectiveTrip("owner-1", result))
      .rejects.toThrow(/complete OpenTripMap provenance/i);
    expect(await repository.getTrip("objective-trip-1")).toBeUndefined();
    expect(await repository.getItineraryRun("generation-1:BALANCED")).toBeUndefined();
  });

  it("rejects OpenTripMap provenance nested under a generic entry", async () => {
    const repository = new MemoryRepository();
    const result = objectiveResult();
    const activity = result.variants[0].itinerary.days[0].activities[0];
    delete activity.xid;
    delete activity.poi;
    result.variants[0].provenance[1].path = `days.1.activities.${activity.sequence}.reason`;

    await expect(repository.saveObjectiveTrip("owner-1", result))
      .rejects.toThrow(/Generic itinerary entries cannot have attraction provider provenance/i);
    expect(await repository.getTrip("objective-trip-1")).toBeUndefined();
    expect(await repository.getItineraryRun("generation-1:BALANCED")).toBeUndefined();
  });

  it("rejects CURRENTLY_VERIFIED provenance until direct evidence is supported", async () => {
    const repository = new MemoryRepository();

    await expect(repository.saveItineraryRun({
      id: "current-run", tripId: "trip-1", profile: "BALANCED", state: "FINAL_VALIDATED",
      estimatedTotalMinor: 0, summary: {}, legs: [], validationIssues: [], repairs: [],
      provenance: [{ path: "trip.preferences", source: { sourceType: "CURRENTLY_VERIFIED" } }]
    })).rejects.toThrow(/approved source category/i);
  });

  it.each([
    ["noncanonical card URL", (result) => { result.variants[0].provenance[1].source.sourceUrl += "?source=other"; }],
    ["date-only retrieval timestamp", (result) => {
      result.variants[0].provenance[1].source.retrievedAt = "2026-08-14";
      result.variants[0].itinerary.days[0].activities[0].poi.sourceRecords[0].retrievedAt = "2026-08-14";
    }],
    ["impossible retrieval date", (result) => {
      result.variants[0].provenance[1].source.retrievedAt = "2026-02-30T00:00:00.000Z";
      result.variants[0].itinerary.days[0].activities[0].poi.sourceRecords[0].retrievedAt = "2026-02-30T00:00:00.000Z";
    }],
    ["unknown city", (result) => { result.variants[0].provenance[1].source.city = "unknown"; }],
    ["invalid xid", (result) => {
      const activity = result.variants[0].itinerary.days[0].activities[0];
      const source = result.variants[0].provenance[1].source;
      const record = activity.poi.sourceRecords[0];
      activity.xid = source.xid = record.sourceId = "bad xid";
      source.sourceUrl = record.sourceUrl = "https://opentripmap.com/en/card/bad%20xid";
    }],
    ["non-grounded match status", (result) => { result.variants[0].provenance[1].source.matchStatus = "UNMATCHED"; }],
    ["unknown verification status", (result) => { result.variants[0].provenance[1].source.verificationStatus = "UNREVIEWED"; }],
    ["mismatched source record", (result) => { result.variants[0].itinerary.days[0].activities[0].poi.sourceRecords[0].sourceId = "other-xid"; }]
  ])("rejects OpenTripMap provenance with %s", async (_label, mutate) => {
    const repository = new MemoryRepository();
    const result = objectiveResult();
    mutate(result);

    await expect(repository.saveObjectiveTrip("owner-1", result))
      .rejects.toThrow(/complete OpenTripMap provenance/i);
  });

  it("rejects additional conflicting OpenTripMap source records for a grounded attraction", async () => {
    const repository = new MemoryRepository();
    const result = objectiveResult();
    const records = result.variants[0].itinerary.days[0].activities[0].poi.sourceRecords;
    records.push({ ...records[0], retrievedAt: "2026-08-15T00:00:00.000Z" });

    await expect(repository.saveObjectiveTrip("owner-1", result))
      .rejects.toThrow(/complete OpenTripMap provenance/i);
  });

  it("rejects unmapped OpenTripMap provenance and generic POI payload facts", async () => {
    const repository = new MemoryRepository();
    const unmapped = objectiveResult();
    unmapped.variants[0].provenance.push({
      path: "days.1.activities.99.poi",
      source: { ...unmapped.variants[0].provenance[1].source }
    });
    await expect(repository.saveObjectiveTrip("owner-1", unmapped))
      .rejects.toThrow(/map to a grounded attraction/i);

    const generic = objectiveResult();
    const activity = generic.variants[0].itinerary.days[0].activities[0];
    delete activity.xid;
    generic.variants[0].provenance = generic.variants[0].provenance.filter(({ source }) => source.sourceType !== "OPENTRIPMAP_API");
    await expect(repository.saveObjectiveTrip("owner-1", generic))
      .rejects.toThrow(/Generic itinerary entries cannot contain POI provider facts/i);
  });

  it.each([[[]], [[" "]]])("rejects repair records with invalid issue codes", async (issueCodes) => {
    const repository = new MemoryRepository();

    await expect(repository.saveItineraryRun({
      id: `repair-${issueCodes.length}`, tripId: "trip-1", profile: "BALANCED", state: "FAILED",
      estimatedTotalMinor: 0, summary: {}, legs: [], provenance: [], validationIssues: [],
      repairs: [{ attempt: 1, issueCodes, action: "NO_REPAIR_AVAILABLE", finalState: "FAILED" }]
    })).rejects.toThrow(/Repair records require attempt, issue codes, action, and final state/i);
  });

  it("persists every objective record in one MySQL transaction", async () => {
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async () => [{ affectedRows: 1 }]),
      query: vi.fn(async () => [{ affectedRows: 1 }])
    };
    const pool = {
      getConnection: vi.fn(async () => connection),
      execute: vi.fn(async () => { throw new Error("objective persistence escaped transaction"); }),
      query: vi.fn()
    };
    const repository = new MySqlRepository(pool);
    vi.spyOn(repository, "getTrip").mockResolvedValue({ id: "objective-trip-1" });

    await expect(repository.saveObjectiveTrip("owner-1", objectiveResult()))
      .resolves.toEqual({ id: "objective-trip-1" });

    expect(pool.getConnection).toHaveBeenCalledOnce();
    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.execute.mock.calls.map(([sql]) => sql)).toEqual(expect.arrayContaining([
      expect.stringContaining("INSERT INTO trips"),
      expect.stringContaining("INSERT INTO itinerary_runs"),
      expect.stringContaining("INSERT INTO trip_legs"),
      expect.stringContaining("INSERT INTO itinerary_provenance"),
      expect.stringContaining("INSERT INTO itinerary_validation_issues"),
      expect.stringContaining("INSERT INTO itinerary_repairs")
    ]));
  });

  it("rolls back the objective trip when a MySQL repair record cannot be persisted", async () => {
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (sql.includes("INSERT INTO itinerary_repairs")) throw new Error("repair write failed");
        return [{ affectedRows: 1 }];
      }),
      query: vi.fn(async () => [{ affectedRows: 1 }])
    };
    const repository = new MySqlRepository({
      getConnection: vi.fn(async () => connection),
      execute: vi.fn(async () => { throw new Error("objective persistence escaped transaction"); }),
      query: vi.fn()
    });

    await expect(repository.saveObjectiveTrip("owner-1", objectiveResult()))
      .rejects.toThrow("repair write failed");
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledOnce();
  });

  it("persists the final cost-reference city on MySQL duplicate-key updates", async () => {
    const execute = vi.fn(async () => [{ affectedRows: 1 }]);
    const repository = new MySqlRepository({ execute, query: vi.fn() });
    const reference = {
      id: "cost-untiered",
      city: "singapore",
      category: "ATTRACTION_PERSON_ENTRY",
      tier: null,
      minMinor: 3000,
      maxMinor: 4000,
      representativeMinor: 3500,
      currency: "SGD",
      sourceName: "Fixture evidence",
      sourceUrl: "https://example.invalid/cost-reference",
      collectedOn: "2026-08-14",
      updatedAt: "2026-08-14T00:00:00.000Z",
      status: "ACTIVE"
    };

    await expect(repository.upsertCostReference(reference)).resolves.toEqual(reference);
    expect(execute).toHaveBeenCalledWith(
      expect.stringMatching(/ON DUPLICATE KEY UPDATE city = VALUES\(city\)/s),
      expect.arrayContaining(["singapore", null])
    );
  });

  it("duplicates an objective trip without legacy day or membership structures", async () => {
    const repository = new MemoryRepository();
    const source = objectiveResult();
    await repository.saveObjectiveTrip("owner-1", source);

    const copy = await repository.duplicateTrip(source.trip.id, "owner-1");

    expect(copy).toMatchObject({
      ownerId: "owner-1",
      objectiveAligned: true,
      selectedVariantId: null,
      revision: 0
    });
    expect(copy.id).not.toBe(source.trip.id);
    expect(copy.variants).toEqual(source.variants);
  });

});
