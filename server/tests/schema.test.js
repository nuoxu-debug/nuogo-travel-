import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL("../../database/migrations/001_initial.sql", import.meta.url);
const ingestionMigrationUrl = new URL("../../database/migrations/002_anhui_ingestion.sql", import.meta.url);
const groundingMigrationUrl = new URL(
  "../../database/migrations/003_grounded_activity_sources.sql",
  import.meta.url
);
const mediaMigrationUrl = new URL(
  "../../database/migrations/004_activity_media_details.sql",
  import.meta.url
);

describe("Nuogo MySQL schema", () => {
  it("defines every required table without admin tables", () => {
    const sql = readFileSync(migrationUrl, "utf8");

    for (const table of [
      "users",
      "travel_preferences",
      "trips",
      "itinerary_variants",
      "trip_days",
      "activities",
      "trip_shares",
      "activity_votes",
      "favorites"
    ]) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? ${table}`, "i"));
    }

    expect(sql).not.toMatch(/CREATE TABLE(?: IF NOT EXISTS)?\s+\w*admin\w*/i);
  });

  it("includes repository constraints and UTF-8 storage", () => {
    const sql = readFileSync(migrationUrl, "utf8");

    expect(sql).toMatch(/utf8mb4/i);
    expect(sql).toMatch(/UNIQUE KEY\s+\w+\s+\(email\)/i);
    expect(sql).toMatch(/UNIQUE KEY\s+\w+\s+\(token\)/i);
    expect(sql).toMatch(/UNIQUE KEY\s+\w+\s+\(share_id,\s*activity_id,\s*user_id\)/i);
    expect(sql).toMatch(/DECIMAL\(10,\s*7\)/i);
  });

  it("defines the attributed attraction-ingestion tables", () => {
    const sql = readFileSync(ingestionMigrationUrl, "utf8");

    for (const table of [
      "ingestion_sources",
      "scrape_jobs",
      "attractions",
      "attraction_images",
      "attraction_sources"
    ]) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? ${table}`, "i"));
    }

    expect(sql).toMatch(/UNIQUE KEY\s+\w+\s+\(external_source,\s*external_id\)/i);
    expect(sql).toMatch(/review_status/i);
  });

  it("adds grounded activity provenance columns", () => {
    const sql = readFileSync(groundingMigrationUrl, "utf8");

    expect(sql).toMatch(/source_attraction_id\s+VARCHAR\(36\)/i);
    expect(sql).toMatch(/source_provider\s+VARCHAR\(80\)/i);
    expect(sql).toMatch(/source_url\s+VARCHAR\(2048\)/i);
    expect(sql).toMatch(/location_is_estimated\s+BOOLEAN/i);
  });

  it("adds grounded activity media and visit-detail columns", () => {
    const sql = readFileSync(mediaMigrationUrl, "utf8");

    expect(sql).toMatch(/image_url\s+VARCHAR\(500\)/i);
    expect(sql).toMatch(/image_attribution\s+VARCHAR\(255\)/i);
    expect(sql).toMatch(/visit_details_json\s+JSON/i);
  });
});
