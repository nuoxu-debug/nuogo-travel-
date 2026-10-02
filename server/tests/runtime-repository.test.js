import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryRepository } from "../src/repositories/memory.js";
import { MySqlRepository } from "../src/repositories/mysql.js";
import { PostgresRepository } from "../src/repositories/postgres.js";
import { createRepository } from "../src/runtime/createRepository.js";

describe("runtime repository selection", () => {
  it("uses MySQL in live mode", () => {
    expect(createRepository({
      runtimeMode: "live",
      databaseProvider: "mysql",
      mysql: { host: "127.0.0.1", database: "nuogo", user: "nuogo", password: "test" }
    })).toBeInstanceOf(MySqlRepository);
  });

  it("uses Supabase Postgres in live mode when configured", () => {
    const repository = createRepository({
      runtimeMode: "live",
      databaseProvider: "supabase",
      postgres: { connectionString: "postgresql://user:password@example.supabase.co:5432/postgres" }
    });

    expect(repository.constructor.name).toBe("PostgresRepository");
    repository.pool.end();
  });

  it("maps lower-case PostgreSQL aliases back to repository contract names", async () => {
    const repository = new PostgresRepository({
      query: async () => ({
        command: "SELECT",
        rows: [{
          id: "cost-food",
          city: "singapore",
          category: "FOOD_PERSON_DAY",
          tier: "ECONOMY",
          minminor: 2000,
          representativeminor: 2750,
          maxminor: 3500,
          currency: "SGD",
          sourcename: "Evidence",
          sourceurl: "https://example.com/evidence",
          collectedon: "2026-09-02",
          updatedat: "2026-09-02T00:00:00.000Z",
          status: "ACTIVE"
        }]
      })
    });

    await expect(repository.listCostReferences("singapore")).resolves.toEqual([{
      id: "cost-food",
      city: "singapore",
      destinationId: "singapore",
      category: "FOOD_PERSON_DAY",
      tier: "ECONOMY",
      minMinor: 2000,
      representativeMinor: 2750,
      maxMinor: 3500,
      currency: "SGD",
      sourceName: "Evidence",
      sourceUrl: "https://example.com/evidence",
      collectedOn: "2026-09-02",
      updatedAt: "2026-09-02T00:00:00.000Z",
      referenceType: "GENERIC_FALLBACK",
      unitType: "PER_PERSON_ENTRY",
      sourceType: "SYSTEM_ESTIMATE",
      status: "ACTIVE"
    }]);
  });

  it("round-trips source-backed price references through PostgreSQL columns", async () => {
    const calls = [];
    let stored;
    const repository = new PostgresRepository({
      query: async (sql, values = []) => {
        calls.push({ sql, values });
        if (/INSERT INTO cost_references/i.test(sql)) {
          stored = {
            id: values[0],
            city: values[1],
            destinationid: values[2],
            poiid: values[3],
            category: values[4],
            tier: values[5],
            minminor: values[6],
            representativeminor: values[7],
            maxminor: values[8],
            currency: values[9],
            sourcename: values[10],
            sourceurl: values[11],
            collectedon: values[12],
            updatedat: values[13],
            referencetype: values[14],
            unittype: values[15],
            pricebasis: values[16],
            sourcetype: values[17],
            lastrevieweddate: values[18],
            notes: values[19],
            status: values[20]
          };
          return { command: "INSERT", rowCount: 1, rows: [] };
        }
        return { command: "SELECT", rows: [stored] };
      }
    });
    const reference = {
      id: "sg-poi-singapore-zoo-exact",
      city: "singapore",
      destinationId: "singapore",
      poiId: "demo-sg-singapore-zoo",
      category: "ATTRACTION_PERSON_ENTRY",
      tier: null,
      minMinor: 5200,
      representativeMinor: 5200,
      maxMinor: 5200,
      currency: "SGD",
      sourceName: "Mandai Wildlife Reserve",
      sourceUrl: "https://www.mandai.com/en/tickets-and-passes/single-attractions/singapore-zoo.html",
      collectedOn: "2026-09-24",
      updatedAt: "2026-09-27T00:00:00.000Z",
      referenceType: "EXACT",
      unitType: "PER_PERSON_ENTRY",
      priceBasis: "Non-Resident Adult",
      sourceType: "OFFICIAL",
      lastReviewedDate: "2026-09-27",
      notes: "Reviewed by the system administrator.",
      status: "ACTIVE"
    };

    await repository.upsertCostReference(reference);

    await expect(repository.listCostReferences("singapore")).resolves.toEqual([reference]);
    expect(calls[0].sql).toContain("reference_type");
    expect(calls[0].sql).toContain("last_reviewed_date");
  });

  it("round-trips POI operating hours and exceptions through PostgreSQL columns", async () => {
    const calls = [];
    const storedHours = [];
    const storedExceptions = [];
    const repository = new PostgresRepository({
      query: async (sql, values = []) => {
        calls.push({ sql, values });
        if (/INSERT INTO poi_operating_hours/i.test(sql)) {
          storedHours[0] = {
            id: values[0],
            poiid: values[1],
            dayofweek: values[2],
            opensat: values[3],
            closesat: values[4],
            isclosed: values[5],
            sourcename: values[6],
            sourceurl: values[7],
            sourcetype: values[8],
            lastrevieweddate: values[9],
            verificationstatus: values[10],
            verifiedat: values[11],
            verifiedbyuserid: values[12],
            status: values[13],
            notes: values[14]
          };
          return { command: "INSERT", rowCount: 1, rows: [] };
        }
        if (/INSERT INTO poi_operating_hour_exceptions/i.test(sql)) {
          storedExceptions[0] = {
            id: values[0],
            poiid: values[1],
            exceptiondate: values[2],
            opensat: values[3],
            closesat: values[4],
            isclosed: values[5],
            reason: values[6],
            sourcename: values[7],
            sourceurl: values[8],
            sourcetype: values[9],
            lastrevieweddate: values[10],
            verificationstatus: values[11],
            verifiedat: values[12],
            verifiedbyuserid: values[13],
            status: values[14],
            notes: values[15]
          };
          return { command: "INSERT", rowCount: 1, rows: [] };
        }
        if (/FROM poi_operating_hour_exceptions/i.test(sql)) return { command: "SELECT", rows: storedExceptions };
        return { command: "SELECT", rows: storedHours };
      }
    });
    const operatingHour = {
      id: "hours-gallery-saturday",
      poiId: "poi-gallery",
      dayOfWeek: 6,
      opensAt: "10:00",
      closesAt: "19:00",
      isClosed: false,
      sourceName: "Official gallery hours",
      sourceUrl: "https://example.edu/gallery-hours",
      sourceType: "OFFICIAL",
      lastReviewedDate: "2026-09-27",
      verificationStatus: "VERIFIED",
      verifiedAt: "2026-09-27T10:00:00.000Z",
      verifiedByUserId: "admin-1",
      status: "ACTIVE",
      notes: "Pilot weekly hours."
    };
    const operatingHourException = {
      id: "hours-gallery-christmas",
      poiId: "poi-gallery",
      exceptionDate: "2026-12-25",
      opensAt: null,
      closesAt: null,
      isClosed: true,
      reason: "Christmas closure",
      sourceName: "Official gallery hours",
      sourceUrl: "https://example.edu/gallery-hours",
      sourceType: "OFFICIAL",
      lastReviewedDate: "2026-09-27",
      verificationStatus: "VERIFIED",
      verifiedAt: "2026-09-27T10:00:00.000Z",
      verifiedByUserId: "admin-1",
      status: "ACTIVE",
      notes: "Pilot exception."
    };

    await repository.upsertPoiOperatingHour(operatingHour);
    await repository.upsertPoiOperatingHourException(operatingHourException);

    await expect(repository.listPoiOperatingHours("singapore")).resolves.toEqual([operatingHour]);
    await expect(repository.listPoiOperatingHourExceptions("singapore")).resolves.toEqual([operatingHourException]);
    expect(calls[0].sql).toContain("poi_operating_hours");
    expect(calls[1].sql).toContain("poi_operating_hour_exceptions");
  });

  it("preserves PostgreSQL DATE-only fields without UTC timezone shifting", async () => {
    const localDateOnly = new Date(2026, 8, 28);
    const repository = new PostgresRepository({
      query: async (sql) => {
        if (/FROM poi_operating_hour_exceptions/i.test(sql)) {
          return { command: "SELECT", rows: [{
            id: "hours-gallery-exception",
            poiid: "poi-gallery",
            exceptiondate: localDateOnly,
            opensat: null,
            closesat: null,
            isclosed: true,
            reason: "Special closure",
            sourcename: "Official gallery hours",
            sourceurl: "https://example.edu/gallery-hours",
            sourcetype: "OFFICIAL",
            lastrevieweddate: localDateOnly,
            verificationstatus: "PENDING_REVIEW",
            status: "ACTIVE"
          }] };
        }
        if (/FROM cost_references/i.test(sql)) {
          return { command: "SELECT", rows: [{
            id: "cost-food",
            city: "singapore",
            destinationid: "singapore",
            category: "FOOD_PERSON_DAY",
            tier: "BALANCED",
            minminor: 3000,
            representativeminor: 3500,
            maxminor: 4000,
            currency: "SGD",
            sourcename: "University travel survey",
            sourceurl: "https://example.edu/travel-costs",
            collectedon: localDateOnly,
            updatedat: "2026-09-28T00:00:00.000Z",
            referencetype: "GENERIC_FALLBACK",
            unittype: "PER_PERSON_DAY",
            sourcetype: "SYSTEM_ESTIMATE",
            lastrevieweddate: localDateOnly,
            status: "ACTIVE"
          }] };
        }
        return { command: "SELECT", rows: [{
          id: "hours-gallery-monday",
          poiid: "poi-gallery",
          dayofweek: 1,
          opensat: "10:00",
          closesat: "19:00",
          isclosed: false,
          sourcename: "Official gallery hours",
          sourceurl: "https://example.edu/gallery-hours",
          sourcetype: "OFFICIAL",
          lastrevieweddate: localDateOnly,
          verificationstatus: "PENDING_REVIEW",
          status: "ACTIVE"
        }] };
      }
    });

    await expect(repository.listPoiOperatingHours("singapore")).resolves.toEqual([
      expect.objectContaining({ lastReviewedDate: "2026-09-28" })
    ]);
    await expect(repository.listPoiOperatingHourExceptions("singapore")).resolves.toEqual([
      expect.objectContaining({ exceptionDate: "2026-09-28", lastReviewedDate: "2026-09-28" })
    ]);
    await expect(repository.listCostReferences("singapore")).resolves.toEqual([
      expect.objectContaining({ collectedOn: "2026-09-28", lastReviewedDate: "2026-09-28" })
    ]);
  });

  it("uses PostgreSQL conflict syntax when saving itinerary runs", async () => {
    const calls = [];
    const connection = {
      execute: async (sql) => {
        calls.push(sql);
        return [{ affectedRows: 1 }];
      },
      query: async (sql) => {
        calls.push(sql);
        return [{ affectedRows: 1 }];
      }
    };
    const repository = new PostgresRepository({ query: async () => ({ command: "SELECT", rows: [] }) });

    await repository.persistItineraryRun(connection, {
      id: "run-1",
      tripId: "trip-1",
      profile: "BALANCED",
      state: "FINAL_VALIDATED",
      estimatedTotalMinor: 1000,
      summary: {},
      legs: [],
      provenance: [],
      validationIssues: [],
      repairs: []
    });

    expect(calls.join("\n")).toContain("ON CONFLICT (id) DO UPDATE");
    expect(calls.join("\n")).not.toContain("ON DUPLICATE KEY UPDATE");
  });

  it("lists canonical POIs with source records through PostgreSQL", async () => {
    const repository = new PostgresRepository({
      query: async (sql) => {
        if (/FROM poi_source_records/i.test(sql)) {
          return { command: "SELECT", rows: [{
            poiid: "sg-national-gallery",
            provider: "OFFICIAL",
            sourceid: "source-gallery",
            sourceurl: "https://example.test/gallery",
            retrievedat: "2026-09-30T00:00:00.000Z",
            expiresat: null,
            raw_json: { source_kind: "PRICE" }
          }] };
        }
        return { command: "SELECT", rows: [{
          id: "sg-national-gallery",
          destinationid: "singapore",
          name_json: { en: "National Gallery Singapore", zh: "新加坡国家美术馆" },
          category: "ATTRACTION",
          latitude: "1.290270",
          longitude: "103.851959",
          address_json: { en: "1 St Andrew's Road", zh: "1 St Andrew's Road" },
          status: "ACTIVE"
        }] };
      }
    });

    await expect(repository.listCanonicalPois("singapore")).resolves.toEqual([{
      id: "sg-national-gallery",
      destinationId: "singapore",
      name: { en: "National Gallery Singapore", zh: "新加坡国家美术馆" },
      category: "ATTRACTION",
      coordinates: { latitude: "1.290270", longitude: "103.851959" },
      address: { en: "1 St Andrew's Road", zh: "1 St Andrew's Road" },
      status: "ACTIVE",
      sources: [{
        provider: "OFFICIAL",
        sourceId: "source-gallery",
        sourceUrl: "https://example.test/gallery",
        retrievedAt: "2026-09-30T00:00:00.000Z",
        raw: { source_kind: "PRICE" }
      }]
    }]);
  });

  it("uses memory only for explicit demo or injected test repositories", () => {
    expect(createRepository({ runtimeMode: "demo" })).toBeInstanceOf(MemoryRepository);
    const testRepository = new MemoryRepository();
    expect(createRepository({ runtimeMode: "test" }, { testRepository })).toBe(testRepository);
    expect(() => createRepository({ runtimeMode: "test" })).toThrow(/explicit test repository/i);
  });

  it("persists demo memory accounts across repository restarts when configured", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nuogo-demo-"));
    const snapshotPath = join(directory, "demo-state.json");
    try {
      const repository = createRepository({ runtimeMode: "demo", demoPersistencePath: snapshotPath });
      await repository.createUser({
        name: "Persistent Demo User",
        email: "persisted@nuogo.test",
        passwordHash: "hash",
        accountType: "REGISTERED"
      });

      const restarted = createRepository({ runtimeMode: "demo", demoPersistencePath: snapshotPath });

      await expect(restarted.findUserByEmail("persisted@nuogo.test")).resolves.toMatchObject({
        name: "Persistent Demo User",
        email: "persisted@nuogo.test",
        accountType: "REGISTERED"
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
