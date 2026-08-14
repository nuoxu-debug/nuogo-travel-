import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { listMigrationFiles } from "../src/repositories/migrations.js";

const migrationDirectory = new URL("../../database/migrations/", import.meta.url);

describe("objective-aligned migration ordering", () => {
  it("lists every migration in numeric order", async () => {
    const files = await listMigrationFiles(migrationDirectory);
    expect(files.map(({ name }) => name)).toEqual([
      "001_initial.sql",
      "002_anhui_ingestion.sql",
      "003_grounded_activity_sources.sql",
      "004_activity_media_details.sql",
      "005_trip_collaboration_expenses.sql",
      "006_security_privacy.sql",
      "007_objective_aligned_mvp.sql",
      "008_objective_aligned_seed.sql",
      "009_objective_trip_payload.sql"
    ]);
  });

  it("defines every grounded itinerary persistence entity", async () => {
    const sql = await readFile(new URL("007_objective_aligned_mvp.sql", migrationDirectory), "utf8");
    for (const table of [
      "supported_destinations",
      "canonical_pois",
      "poi_source_records",
      "route_cache",
      "cost_references",
      "itinerary_runs",
      "trip_legs",
      "itinerary_provenance",
      "itinerary_validation_issues",
      "itinerary_repairs"
    ]) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE ${table}`, "i"));
    }
    expect(sql).toMatch(/ADD COLUMN role ENUM\('user', 'admin'\)/i);
    expect(sql).toMatch(/amount_fen BIGINT UNSIGNED/i);
    expect(sql).toMatch(/estimated_total_fen BIGINT UNSIGNED/i);
  });

  it("seeds only the three supported MVP destinations", async () => {
    const sql = await readFile(new URL("008_objective_aligned_seed.sql", migrationDirectory), "utf8");
    expect(sql).toMatch(/'beijing'/i);
    expect(sql).toMatch(/'shanghai'/i);
    expect(sql).toMatch(/'xian'/i);
    expect(sql).not.toMatch(/'huangshan'|'chengdu'|'hangzhou'/i);
  });
});
