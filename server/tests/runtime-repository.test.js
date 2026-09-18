import { describe, expect, it } from "vitest";
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
      status: "ACTIVE"
    }]);
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

  it("uses memory only for explicit demo or injected test repositories", () => {
    expect(createRepository({ runtimeMode: "demo" })).toBeInstanceOf(MemoryRepository);
    const testRepository = new MemoryRepository();
    expect(createRepository({ runtimeMode: "test" }, { testRepository })).toBe(testRepository);
    expect(() => createRepository({ runtimeMode: "test" })).toThrow(/explicit test repository/i);
  });
});
