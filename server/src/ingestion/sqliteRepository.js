import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import initSqlJs from "sql.js";
import { attractionRecordSchema } from "./contracts.js";

const require = createRequire(import.meta.url);
const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
const SQL = await initSqlJs({ locateFile: () => wasmPath });

const schema = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS ingestion_sources (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    region_id TEXT NOT NULL,
    source_url TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_fetched_at TEXT,
    last_status TEXT,
    etag TEXT,
    content_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS scrape_jobs (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    items_found INTEGER NOT NULL DEFAULT 0,
    items_created INTEGER NOT NULL DEFAULT 0,
    items_updated INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    FOREIGN KEY (source_id) REFERENCES ingestion_sources(id)
  );
  CREATE TABLE IF NOT EXISTS attractions (
    id TEXT PRIMARY KEY,
    province TEXT NOT NULL,
    region_id TEXT NOT NULL,
    external_source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    name_zh TEXT NOT NULL,
    name_en TEXT,
    description_zh TEXT,
    description_en TEXT,
    location_label TEXT,
    address TEXT,
    longitude REAL,
    latitude REAL,
    ticket_price_min REAL,
    ticket_price_max REAL,
    opening_hours TEXT,
    category TEXT,
    review_count INTEGER NOT NULL DEFAULT 0,
    travel_note_count INTEGER NOT NULL DEFAULT 0,
    image_count INTEGER NOT NULL DEFAULT 0,
    review_status TEXT NOT NULL DEFAULT 'pending',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (external_source, external_id)
  );
  CREATE TABLE IF NOT EXISTS attraction_images (
    id TEXT PRIMARY KEY,
    attraction_id TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_provider TEXT NOT NULL,
    attribution TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    local_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (attraction_id, source_url),
    FOREIGN KEY (attraction_id) REFERENCES attractions(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS attraction_sources (
    id TEXT PRIMARY KEY,
    attraction_id TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_page_url TEXT NOT NULL,
    retrieved_at TEXT NOT NULL,
    content_hash TEXT,
    facts_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (attraction_id, source_page_url),
    FOREIGN KEY (attraction_id) REFERENCES attractions(id) ON DELETE CASCADE
  );
`;

function rowsFrom(result) {
  if (!result.length) return [];
  const [{ columns, values }] = result;
  return values.map((valuesRow) =>
    Object.fromEntries(columns.map((column, index) => [column, valuesRow[index]]))
  );
}

export class AttractionSqliteRepository {
  constructor(filePath) {
    this.filePath = filePath;
    const bytes = filePath !== ":memory:" && existsSync(filePath) ? readFileSync(filePath) : undefined;
    this.db = bytes ? new SQL.Database(bytes) : new SQL.Database();
    this.db.run(schema);
    this.persist();
  }

  persist() {
    if (this.filePath === ":memory:") return;
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, Buffer.from(this.db.export()));
  }

  upsertAttractions(records) {
    let created = 0;
    let updated = 0;
    const now = new Date().toISOString();

    this.db.run("BEGIN");
    try {
      for (const input of records) {
        const record = attractionRecordSchema.parse(input);
        const existing = rowsFrom(this.db.exec(
          "SELECT id FROM attractions WHERE external_source = ? AND external_id = ?",
          [record.externalSource, record.externalId]
        ))[0];
        const id = existing?.id ?? randomUUID();

        if (existing) {
          this.db.run(
            `UPDATE attractions SET name_zh=?, name_en=?, location_label=?, review_count=?,
             travel_note_count=?, image_count=?, active=?, updated_at=? WHERE id=?`,
            [
              record.nameZh, record.nameEn, record.locationLabel, record.reviewCount,
              record.travelNoteCount, record.imageCount, record.active ? 1 : 0, now, id
            ]
          );
          updated += 1;
        } else {
          this.db.run(
            `INSERT INTO attractions
             (id, province, region_id, external_source, external_id, name_zh, name_en,
              description_zh, description_en, location_label, address, longitude, latitude,
              ticket_price_min, ticket_price_max, opening_hours, category, review_count,
              travel_note_count, image_count, review_status, active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id, record.province, record.regionId, record.externalSource, record.externalId,
              record.nameZh, record.nameEn, record.descriptionZh, record.descriptionEn,
              record.locationLabel, record.address, record.longitude, record.latitude,
              record.ticketPriceMin, record.ticketPriceMax, record.openingHours, record.category,
              record.reviewCount, record.travelNoteCount, record.imageCount, record.reviewStatus,
              record.active ? 1 : 0, now, now
            ]
          );
          created += 1;
        }

        if (record.thumbnailUrl) {
          this.db.run(
            `INSERT OR IGNORE INTO attraction_images
             (id, attraction_id, source_url, source_provider, attribution, is_primary, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
            [randomUUID(), id, record.thumbnailUrl, record.externalSource, "Source image: Mafengwo", now, now]
          );
        }
        this.db.run(
          `INSERT INTO attraction_sources
           (id, attraction_id, source_url, source_page_url, retrieved_at, facts_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(attraction_id, source_page_url) DO UPDATE SET
             source_url=excluded.source_url, retrieved_at=excluded.retrieved_at,
             facts_json=excluded.facts_json, updated_at=excluded.updated_at`,
          [
            randomUUID(), id, record.sourceUrl, record.sourcePageUrl, record.retrievedAt,
            JSON.stringify(record), now, now
          ]
        );
      }
      this.db.run("COMMIT");
      this.persist();
      return { created, updated };
    } catch (error) {
      this.db.run("ROLLBACK");
      throw error;
    }
  }

  upsertSource(source) {
    const now = new Date().toISOString();
    const existing = rowsFrom(this.db.exec(
      "SELECT id FROM ingestion_sources WHERE source_url = ?",
      [source.url]
    ))[0];
    const id = existing?.id ?? randomUUID();
    this.db.run(
      `INSERT INTO ingestion_sources
       (id, provider, region_id, source_url, source_type, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(source_url) DO UPDATE SET
         provider=excluded.provider, region_id=excluded.region_id,
         source_type=excluded.source_type, enabled=1, updated_at=excluded.updated_at`,
      [id, source.provider, source.regionId, source.url, source.sourceType, now, now]
    );
    this.persist();
    return id;
  }

  startJob(sourceId) {
    const id = randomUUID();
    this.db.run(
      `INSERT INTO scrape_jobs (id, source_id, status, started_at)
       VALUES (?, ?, 'running', ?)`,
      [id, sourceId, new Date().toISOString()]
    );
    this.persist();
    return id;
  }

  completeJob(jobId, metrics) {
    this.db.run(
      `UPDATE scrape_jobs SET status='completed', completed_at=?, items_found=?,
       items_created=?, items_updated=? WHERE id=?`,
      [
        new Date().toISOString(), metrics.itemsFound, metrics.itemsCreated,
        metrics.itemsUpdated, jobId
      ]
    );
    this.persist();
  }

  failJob(jobId, error) {
    this.db.run(
      `UPDATE scrape_jobs SET status='failed', completed_at=?, error_message=? WHERE id=?`,
      [new Date().toISOString(), String(error.message ?? error).slice(0, 2000), jobId]
    );
    this.persist();
  }

  updateSourceFetch(sourceId, { status, etag, contentHash }) {
    this.db.run(
      `UPDATE ingestion_sources SET last_fetched_at=?, last_status=?, etag=?,
       content_hash=?, updated_at=? WHERE id=?`,
      [
        new Date().toISOString(), status, etag ?? null, contentHash ?? null,
        new Date().toISOString(), sourceId
      ]
    );
    this.persist();
  }

  listJobs() {
    return rowsFrom(this.db.exec(
      "SELECT status, items_found, items_created, items_updated, error_message FROM scrape_jobs ORDER BY started_at"
    )).map((row) => ({
      status: row.status,
      itemsFound: row.items_found,
      itemsCreated: row.items_created,
      itemsUpdated: row.items_updated,
      errorMessage: row.error_message
    }));
  }

  reviewAttractions({ regionId, ids, status }) {
    if (!regionId || !["approved", "rejected", "pending"].includes(status)) {
      throw new Error("A valid region and review status are required.");
    }
    const selectedIds = [...new Set(ids ?? [])];
    if (!selectedIds.length) {
      throw new Error("At least one attraction ID must be selected.");
    }

    const placeholders = selectedIds.map(() => "?").join(", ");
    this.db.run("BEGIN");
    try {
      const matches = rowsFrom(this.db.exec(
        `SELECT id FROM attractions
         WHERE region_id = ? AND active = 1 AND id IN (${placeholders})`,
        [regionId, ...selectedIds]
      ));
      if (matches.length !== selectedIds.length) {
        throw new Error("One or more selected attractions were not found in the requested region.");
      }
      const now = new Date().toISOString();
      for (const id of selectedIds) {
        this.db.run(
          "UPDATE attractions SET review_status = ?, updated_at = ? WHERE id = ?",
          [status, now, id]
        );
      }
      this.db.run("COMMIT");
      this.persist();
      return selectedIds.length;
    } catch (error) {
      this.db.run("ROLLBACK");
      throw error;
    }
  }

  listAttractions({ status, regionId, active, limit = 100 } = {}) {
    const filters = [];
    const params = [];
    if (status) {
      filters.push("a.review_status = ?");
      params.push(status);
    }
    if (regionId) {
      filters.push("a.region_id = ?");
      params.push(regionId);
    }
    if (typeof active === "boolean") {
      filters.push("a.active = ?");
      params.push(active ? 1 : 0);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    params.push(limit);
    return rowsFrom(this.db.exec(
      `SELECT a.*,
        (SELECT s.source_url FROM attraction_sources s
         WHERE s.attraction_id = a.id
         ORDER BY s.retrieved_at DESC, s.source_page_url ASC LIMIT 1) AS source_url,
        (SELECT i.source_url FROM attraction_images i
         WHERE i.attraction_id = a.id ORDER BY i.is_primary DESC LIMIT 1) AS thumbnail_url
       FROM attractions a
       ${where} ORDER BY a.review_count DESC LIMIT ?`,
      params
    )).map((row) => ({
      id: row.id,
      externalId: row.external_id,
      nameZh: row.name_zh,
      nameEn: row.name_en,
      descriptionZh: row.description_zh,
      descriptionEn: row.description_en,
      regionId: row.region_id,
      province: row.province,
      locationLabel: row.location_label,
      address: row.address,
      longitude: row.longitude,
      latitude: row.latitude,
      ticketPriceMin: row.ticket_price_min,
      ticketPriceMax: row.ticket_price_max,
      openingHours: row.opening_hours,
      category: row.category,
      reviewCount: row.review_count,
      travelNoteCount: row.travel_note_count,
      imageCount: row.image_count,
      reviewStatus: row.review_status,
      active: Boolean(row.active),
      thumbnailUrl: row.thumbnail_url,
      sourceProvider: row.external_source,
      sourceUrl: row.source_url
    }));
  }

  findApprovedImage(attractionId) {
    const row = rowsFrom(this.db.exec(
      `SELECT i.id, i.attraction_id, i.source_url, i.source_provider,
              i.attribution, i.local_path
       FROM attraction_images i
       JOIN attractions a ON a.id = i.attraction_id
       WHERE a.id = ? AND a.review_status = 'approved' AND a.active = 1
       ORDER BY i.is_primary DESC, i.created_at ASC
       LIMIT 1`,
      [attractionId]
    ))[0];
    if (!row) return undefined;
    return {
      id: row.id,
      attractionId: row.attraction_id,
      sourceUrl: row.source_url,
      sourceProvider: row.source_provider,
      attribution: row.attribution,
      localPath: row.local_path
    };
  }

  setImageLocalPath(imageId, localPath) {
    this.db.run(
      "UPDATE attraction_images SET local_path = ?, updated_at = ? WHERE id = ?",
      [localPath, new Date().toISOString(), imageId]
    );
    this.persist();
  }

  close() {
    this.persist();
    this.db.close();
  }
}
