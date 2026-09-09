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
      "009_objective_trip_payload.sql",
      "010_report_aligned_privacy.sql",
      "011_report_aligned_core.sql",
      "012_profile_privacy_retention.sql",
      "013_objective_trip_versioning.sql",
      "014_admin_system_records.sql",
      "015_remove_retired_subsystems.sql",
      "016_singapore_report_alignment.sql"
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

  it("preserves the historical China seed as migration history", async () => {
    const sql = await readFile(new URL("008_objective_aligned_seed.sql", migrationDirectory), "utf8");
    expect(sql).toMatch(/'beijing'/i);
    expect(sql).toMatch(/'shanghai'/i);
    expect(sql).toMatch(/'xian'/i);
    expect(sql).not.toMatch(/'huangshan'|'chengdu'|'hangzhou'/i);
  });

  it("activates only Singapore and adds SGD references plus bounded guest persistence", async () => {
    const sql = await readFile(new URL("016_singapore_report_alignment.sql", migrationDirectory), "utf8");
    expect(sql).toMatch(/'singapore'[\s\S]*'SGD'/i);
    expect(sql).toMatch(/WHERE id IN \('beijing', 'shanghai', 'xian'\)/i);
    expect(sql).toMatch(/guest_last_activity_at/i);
    expect(sql).toMatch(/guest_expires_at/i);
    expect(sql).toMatch(/persistence_scope ENUM\('SESSION', 'PERSISTENT'\)/i);
    expect(sql).toMatch(/guest_claim_token_hash CHAR\(64\)/i);
    for (const value of [6800, 16500, 66000, 128, 190, 257, 2750, 4750, 8000, 4600, 7600, 1000, 2000, 3000]) {
      expect(sql).toMatch(new RegExp(`\\b${value}\\b`));
    }
  });

  it("migrates cost references to complete report-aligned records without seed prices", async () => {
    const sql = await readFile(new URL("011_report_aligned_core.sql", migrationDirectory), "utf8");

    for (const column of [
      "city", "category", "tier", "min_fen", "max_fen", "representative_fen",
      "currency", "source_name", "source_url", "collected_on", "updated_at", "status"
    ]) {
      expect(sql).toMatch(new RegExp(`\\b${column}\\b`, "i"));
    }
    expect(sql).not.toMatch(/INSERT\s+INTO\s+cost_references/i);
    expect(sql).not.toMatch(/representative_fen\s*=\s*\d+/i);
    expect(sql).toMatch(/category IN \('FUEL_LITRE', 'PARKING_DAY'\)/i);
    expect(sql).toMatch(/category NOT IN/i);
    expect(sql).toMatch(/ACCOMMODATION_ROOM_NIGHT[\s\S]*tier IS NULL/i);
  });

  it("adds explicit profile language and account lifecycle fields append-only", async () => {
    const sql = await readFile(new URL("012_profile_privacy_retention.sql", migrationDirectory), "utf8");

    expect(sql).toMatch(/ADD COLUMN preferred_language ENUM\('zh', 'en'\)/i);
    expect(sql).toMatch(/ADD COLUMN account_type ENUM\('REGISTERED', 'GUEST'\)/i);
    expect(sql).toMatch(/UPDATE users/i);
    expect(sql).toMatch(/BINARY\s+name\s*=\s*'Nuogo Guest'/i);
    expect(sql).toMatch(/BINARY\s+email\s+REGEXP/i);
    expect(sql).toContain("guest\\\\+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@nuogo\\\\.local");
    expect(sql).not.toMatch(/guest\+%/i);
  });

  it("adds indexed objective trip version lineage without rewriting prior migrations", async () => {
    const sql = await readFile(new URL("013_objective_trip_versioning.sql", migrationDirectory), "utf8");

    expect(sql).toMatch(/ADD COLUMN parent_trip_id CHAR\(36\) NULL/i);
    expect(sql).toMatch(/FOREIGN KEY \(parent_trip_id\) REFERENCES trips\(id\) ON DELETE SET NULL/i);
    expect(sql).toMatch(/INDEX idx_trips_parent_trip \(parent_trip_id\)/i);
  });

  it("adds account lifecycle status and sanitized system-record persistence", async () => {
    const sql = await readFile(new URL("014_admin_system_records.sql", migrationDirectory), "utf8");
    expect(sql).toMatch(/ADD COLUMN status ENUM\('ACTIVE', 'SUSPENDED'\)/i);
    expect(sql).toMatch(/CREATE TABLE admin_system_records/i);
    expect(sql).toMatch(/metadata_json JSON NOT NULL/i);
  });

  it("drops the retired collaboration, expense, sharing, favorite, and ingestion tables", async () => {
    const sql = await readFile(new URL("015_remove_retired_subsystems.sql", migrationDirectory), "utf8");
    for (const table of [
      "activity_votes", "favorites", "trip_shares", "expense_participants",
      "trip_expenses", "trip_invitations", "trip_members", "trip_activity_log",
      "attraction_images", "attraction_sources", "attractions", "scrape_jobs", "ingestion_sources",
      "activities", "trip_days", "itinerary_variants", "travel_preferences"
    ]) {
      expect(sql).toMatch(new RegExp(`DROP TABLE IF EXISTS ${table}`, "i"));
    }
    expect(sql).toMatch(/DROP FOREIGN KEY fk_trips_selected_variant/i);
    expect(sql).toMatch(/DROP COLUMN selected_variant_id/i);
  });

  it("does not compose runtime generation with fabricated demo prices", async () => {
    const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");

    expect(source).not.toMatch(/demoReferences|accommodationRoomNightFen\s*:\s*\d+/);
    expect(source).toMatch(/repository\.listCostReferences\(destination\)/);
  });
});
