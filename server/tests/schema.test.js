import { readFileSync } from "node:fs";
import { groupTypes } from "@nuogo/shared/constants";
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
const collaborationMigrationUrl = new URL(
  "../../database/migrations/005_trip_collaboration_expenses.sql",
  import.meta.url
);
const demoSeedUrl = new URL("../../database/seeds/001_demo.sql", import.meta.url);

const demoIds = {
  trip: "10000000-0000-4000-8000-000000000001",
  variant: "11000000-0000-4000-8000-000000000001",
  day: "12000000-0000-4000-8000-000000000001",
  activity: "13000000-0000-4000-8000-000000000001"
};

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

  it("defines collaboration memberships, invitations, expenses, logs, and revisions", () => {
    const sql = readFileSync(collaborationMigrationUrl, "utf8");
    for (const table of [
      "trip_members",
      "trip_invitations",
      "trip_expenses",
      "expense_participants",
      "trip_activity_log"
    ]) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? ${table}`, "i"));
    }
    expect(sql).toMatch(/ADD COLUMN revision INT UNSIGNED NOT NULL DEFAULT 0/i);
    expect(sql).toMatch(/token_hash CHAR\(64\) NOT NULL/i);
    expect(sql).not.toMatch(/\btoken\s+VARCHAR/i);
    expect(sql).toMatch(/amount_fen INT UNSIGNED NOT NULL/i);
    expect(sql).toMatch(/share_fen INT UNSIGNED NOT NULL/i);
    expect(sql).toMatch(/UNIQUE KEY\s+\w+\s+\(trip_id,\s*user_id\)/i);
  });

  it("seeds an openable collaboration trip with valid taxonomy and reconciled expenses", () => {
    const sql = readFileSync(demoSeedUrl, "utf8");
    const groupType = sql.match(/'groupType',\s*'([^']+)'/i)?.[1];

    expect(groupTypes).toContain(groupType);
    expect(sql).toMatch(new RegExp(
      `INSERT INTO itinerary_variants[\\s\\S]*?'${demoIds.variant}'[\\s\\S]*?'${demoIds.trip}'`,
      "i"
    ));
    expect(sql).toMatch(new RegExp(
      `INSERT INTO trip_days[\\s\\S]*?'${demoIds.day}'[\\s\\S]*?'${demoIds.variant}'`,
      "i"
    ));
    expect(sql).toMatch(new RegExp(
      `INSERT INTO activities[\\s\\S]*?'${demoIds.activity}'[\\s\\S]*?'${demoIds.day}'`,
      "i"
    ));
    expect(sql).toMatch(new RegExp(
      `UPDATE trips\\s+SET selected_variant_id = '${demoIds.variant}'\\s+WHERE id = '${demoIds.trip}'`,
      "i"
    ));

    const expenseAmounts = new Map(
      [...sql.matchAll(/\(\s*'(30000000-[^']+)',\s*'10000000-[^']+',\s*'[^']+',\s*'[^']+',\s*(\d+),/g)]
        .map((match) => [match[1], Number(match[2])])
    );
    const allocatedFen = new Map();
    for (const match of sql.matchAll(/\(\s*'(30000000-[^']+)',\s*'00000000-[^']+',\s*(\d+)\s*\)/g)) {
      allocatedFen.set(match[1], (allocatedFen.get(match[1]) ?? 0) + Number(match[2]));
    }

    expect(expenseAmounts.size).toBeGreaterThan(0);
    expect([...expenseAmounts]).toEqual([...allocatedFen]);
  });
});
