import pg from "pg";
import { randomUUID } from "node:crypto";
import { MySqlRepository } from "./mysql.js";

function expandPlaceholders(sql, values = []) {
  const params = [];
  let index = 0;
  const text = sql.replace(/\?/g, () => {
    const value = values[index++];
    if (Array.isArray(value)) {
      const placeholders = value.map((item) => {
        params.push(item);
        return `$${params.length}`;
      });
      return placeholders.length ? placeholders.join(", ") : "NULL";
    }
    params.push(value);
    return `$${params.length}`;
  });
  return { text, params };
}

function normalizeResult(result) {
  if (result.command === "SELECT") return result.rows.map(normalizeRow);
  return { affectedRows: result.rowCount };
}

function normalizeRow(row) {
  const aliases = {
    accounttype: "accountType",
    addressjson: "address_json",
    collectedon: "collectedOn",
    createdat: "createdAt",
    destinationid: "destinationId",
    estimatedtotalminor: "estimatedTotalMinor",
    expiresat: "expiresAt",
    guestclaimtokenhash: "guestClaimTokenHash",
    guestexpiresat: "guestExpiresAt",
    guestlastactivityat: "guestLastActivityAt",
    maxminor: "maxMinor",
    minminor: "minMinor",
    nameen: "nameEn",
    namejson: "name_json",
    namezh: "nameZh",
    ownerid: "ownerId",
    parenttripid: "parentTripId",
    passwordhash: "passwordHash",
    preferredlanguage: "preferredLanguage",
    persistencescope: "persistenceScope",
    raw_json: "raw_json",
    recordedat: "recordedAt",
    representativesminor: "representativeMinor",
    representativeminor: "representativeMinor",
    retrievedat: "retrievedAt",
    revision: "revision",
    sourceid: "sourceId",
    sourcename: "sourceName",
    sourceurl: "sourceUrl",
    updatedat: "updatedAt"
  };
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [aliases[key] ?? key, value])
  );
}

class PostgresPoolAdapter {
  constructor(configOrPool) {
    this.pool = typeof configOrPool?.query === "function"
      ? configOrPool
      : new pg.Pool({ connectionString: configOrPool.connectionString });
  }

  async execute(sql, values) {
    const { text, params } = expandPlaceholders(sql, values);
    const result = await this.pool.query(text, params);
    return [normalizeResult(result)];
  }

  async query(sql, values) {
    return this.execute(sql, values);
  }

  async getConnection() {
    const client = await this.pool.connect();
    return new PostgresConnectionAdapter(client);
  }

  async end() {
    await this.pool.end();
  }
}

class PostgresConnectionAdapter {
  constructor(client) {
    this.client = client;
  }

  async beginTransaction() {
    await this.client.query("BEGIN");
  }

  async commit() {
    await this.client.query("COMMIT");
  }

  async rollback() {
    await this.client.query("ROLLBACK");
  }

  release() {
    this.client.release();
  }

  async execute(sql, values) {
    const { text, params } = expandPlaceholders(sql, values);
    const result = await this.client.query(text, params);
    return [normalizeResult(result)];
  }

  async query(sql, values) {
    return this.execute(sql, values);
  }
}

export class PostgresRepository extends MySqlRepository {
  constructor(configOrPool) {
    super(new PostgresPoolAdapter(configOrPool));
  }

  async recordPrivacyConsent(userId, input) {
    const recordedAt = new Date();
    const type = input.type ?? "GENERAL";
    await this.pool.execute(
      `INSERT INTO privacy_consents (user_id, consent_type, version, accepted, recorded_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, consent_type)
       DO UPDATE SET version = EXCLUDED.version, accepted = EXCLUDED.accepted, recorded_at = EXCLUDED.recorded_at`,
      [userId, type, input.version, input.accepted, recordedAt]
    );
    return { userId, type, version: input.version, accepted: input.accepted, recordedAt: recordedAt.toISOString() };
  }

  async claimGuestTrip(id, newOwnerId, claimTokenHash) {
    const [result] = await this.pool.execute(
      `UPDATE trips
       SET user_id = ?, persistence_scope = 'PERSISTENT', expires_at = NULL,
           guest_claim_token_hash = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND persistence_scope = 'SESSION'
         AND expires_at > CURRENT_TIMESTAMP AND guest_claim_token_hash = ?
         AND EXISTS (
           SELECT 1 FROM users
           WHERE id = ? AND account_type = 'REGISTERED' AND deleted_at IS NULL
         )`,
      [newOwnerId, id, claimTokenHash, newOwnerId]
    );
    return result.affectedRows === 1 ? this.getTrip(id) : undefined;
  }

  async upsertCanonicalPoi(poi) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO canonical_pois
          (id, destination_id, name_json, category, latitude, longitude, address_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           name_json = EXCLUDED.name_json, category = EXCLUDED.category,
           latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
           address_json = EXCLUDED.address_json, status = EXCLUDED.status`,
        [
          poi.id, poi.destinationId, JSON.stringify(poi.name), poi.category,
          poi.coordinates.latitude, poi.coordinates.longitude,
          poi.address ? JSON.stringify(poi.address) : null, poi.status ?? "ACTIVE"
        ]
      );
      await connection.execute("DELETE FROM poi_source_records WHERE poi_id = ?", [poi.id]);
      for (const source of poi.sources ?? []) {
        await connection.execute(
          `INSERT INTO poi_source_records
            (id, poi_id, provider, source_id, source_url, retrieved_at, expires_at, raw_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(), poi.id, source.provider, source.sourceId, source.sourceUrl ?? null,
            source.retrievedAt, source.expiresAt ?? null, source.raw ? JSON.stringify(source.raw) : null
          ]
        );
      }
      await connection.commit();
      return poi;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async putRouteCache(key, route) {
    await this.pool.execute(
      `INSERT INTO route_cache
        (cache_key, mode, distance_meters, duration_seconds, route_json,
         provider, source_id, retrieved_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (cache_key) DO UPDATE SET
         distance_meters = EXCLUDED.distance_meters,
         duration_seconds = EXCLUDED.duration_seconds, route_json = EXCLUDED.route_json,
         provider = EXCLUDED.provider, source_id = EXCLUDED.source_id,
         retrieved_at = EXCLUDED.retrieved_at, expires_at = EXCLUDED.expires_at`,
      [
        key, route.mode, route.distanceMeters, route.durationSeconds, JSON.stringify(route),
        route.source.provider, route.source.sourceId, route.source.retrievedAt,
        route.source.expiresAt ?? null
      ]
    );
    return route;
  }

  async upsertCostReference(reference) {
    const record = { ...reference, tier: reference.tier ?? null };
    await this.pool.execute(
      `INSERT INTO cost_references
        (id, city, category, tier, min_fen, representative_fen, max_fen,
         currency, source_name, source_url, collected_on, updated_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
          city = EXCLUDED.city, category = EXCLUDED.category, tier = EXCLUDED.tier,
          min_fen = EXCLUDED.min_fen, representative_fen = EXCLUDED.representative_fen,
          max_fen = EXCLUDED.max_fen, currency = EXCLUDED.currency,
          source_name = EXCLUDED.source_name, source_url = EXCLUDED.source_url,
          collected_on = EXCLUDED.collected_on, updated_at = EXCLUDED.updated_at,
          status = EXCLUDED.status`,
      [
        record.id, record.city, record.category, record.tier,
        record.minMinor, record.representativeMinor, record.maxMinor,
        record.currency, record.sourceName, record.sourceUrl, record.collectedOn,
        record.updatedAt, record.status
      ]
    );
    return record;
  }

  async selectObjectiveVariant(id, _actorId, variantId, expectedRevision) {
    const [result] = await this.pool.execute(
      `UPDATE trips
       SET objective_payload_json = jsonb_set(objective_payload_json::jsonb, '{selectedVariantId}', to_jsonb(?::text))::json,
           revision = revision + 1
       WHERE id = ? AND objective_payload_json IS NOT NULL AND revision = ?`,
      [variantId, id, expectedRevision]
    );
    return result.affectedRows === 1 ? this.getTrip(id) : undefined;
  }
}
