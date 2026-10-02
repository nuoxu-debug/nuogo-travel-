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
    closesat: "closesAt",
    collectedon: "collectedOn",
    createdat: "createdAt",
    dayofweek: "dayOfWeek",
    destinationid: "destinationId",
    estimatedtotalminor: "estimatedTotalMinor",
    exceptiondate: "exceptionDate",
    expiresat: "expiresAt",
    guestclaimtokenhash: "guestClaimTokenHash",
    guestexpiresat: "guestExpiresAt",
    guestlastactivityat: "guestLastActivityAt",
    isclosed: "isClosed",
    maxminor: "maxMinor",
    minminor: "minMinor",
    nameen: "nameEn",
    namejson: "name_json",
    namezh: "nameZh",
    ownerid: "ownerId",
    opensat: "opensAt",
    parenttripid: "parentTripId",
    passwordhash: "passwordHash",
    preferredlanguage: "preferredLanguage",
    persistencescope: "persistenceScope",
    poiid: "poiId",
    raw_json: "raw_json",
    recordedat: "recordedAt",
    representativesminor: "representativeMinor",
    representativeminor: "representativeMinor",
    retrievedat: "retrievedAt",
    lastrevieweddate: "lastReviewedDate",
    pricebasis: "priceBasis",
    referencetype: "referenceType",
    revision: "revision",
    sourceid: "sourceId",
    sourcename: "sourceName",
    sourcetype: "sourceType",
    sourceurl: "sourceUrl",
    unittype: "unitType",
    updatedat: "updatedAt",
    verificationstatus: "verificationStatus",
    verifiedat: "verifiedAt",
    verifiedbyuserid: "verifiedByUserId"
  };
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [aliases[key] ?? key, value])
  );
}

function dateOnly(value) {
  if (!value) return value;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return value?.toISOString?.().slice(0, 10) ?? value;
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

  async upsertPoiOperatingHour(record) {
    await this.pool.execute(
      `INSERT INTO poi_operating_hours
        (id, poi_id, day_of_week, opens_at, closes_at, is_closed,
         source_name, source_url, source_type, last_reviewed_date,
         verification_status, verified_at, verified_by_user_id, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         poi_id = EXCLUDED.poi_id, day_of_week = EXCLUDED.day_of_week,
         opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
         is_closed = EXCLUDED.is_closed, source_name = EXCLUDED.source_name,
         source_url = EXCLUDED.source_url, source_type = EXCLUDED.source_type,
         last_reviewed_date = EXCLUDED.last_reviewed_date,
         verification_status = EXCLUDED.verification_status,
         verified_at = EXCLUDED.verified_at, verified_by_user_id = EXCLUDED.verified_by_user_id,
         status = EXCLUDED.status,
         notes = EXCLUDED.notes, updated_at = now()`,
      [
        record.id, record.poiId, record.dayOfWeek, record.opensAt ?? null, record.closesAt ?? null,
        record.isClosed, record.sourceName, record.sourceUrl, record.sourceType,
        record.lastReviewedDate, record.verificationStatus ?? "PENDING_REVIEW",
        record.verifiedAt ?? null, record.verifiedByUserId ?? null,
        record.status, record.notes ?? null
      ]
    );
    return { ...record, verificationStatus: record.verificationStatus ?? "PENDING_REVIEW" };
  }

  async listPoiOperatingHours(destinationId) {
    const [rows] = await this.pool.execute(
      `SELECT hours.id, hours.poi_id AS poiId, hours.day_of_week AS dayOfWeek,
              hours.opens_at AS opensAt, hours.closes_at AS closesAt,
              hours.is_closed AS isClosed, hours.source_name AS sourceName,
              hours.source_url AS sourceUrl, hours.source_type AS sourceType,
              hours.last_reviewed_date AS lastReviewedDate,
              hours.verification_status AS verificationStatus,
              hours.verified_at AS verifiedAt, hours.verified_by_user_id AS verifiedByUserId,
              hours.status, hours.notes
       FROM poi_operating_hours hours
       JOIN canonical_pois poi ON poi.id = hours.poi_id
       WHERE poi.destination_id = ?
       ORDER BY hours.poi_id, hours.day_of_week, hours.opens_at NULLS FIRST, hours.id`,
      [destinationId]
    );
    return rows.map((row) => ({
      id: row.id,
      poiId: row.poiId,
      dayOfWeek: row.dayOfWeek,
      opensAt: row.opensAt ?? null,
      closesAt: row.closesAt ?? null,
      isClosed: row.isClosed,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
      sourceType: row.sourceType,
      lastReviewedDate: dateOnly(row.lastReviewedDate),
      verificationStatus: row.verificationStatus ?? "PENDING_REVIEW",
      ...(row.verifiedAt ? { verifiedAt: typeof row.verifiedAt === "string" ? row.verifiedAt : row.verifiedAt?.toISOString?.() } : {}),
      ...(row.verifiedByUserId ? { verifiedByUserId: row.verifiedByUserId } : {}),
      status: row.status,
      ...(row.notes ? { notes: row.notes } : {})
    }));
  }

  async upsertPoiOperatingHourException(record) {
    await this.pool.execute(
      `INSERT INTO poi_operating_hour_exceptions
        (id, poi_id, exception_date, opens_at, closes_at, is_closed, reason,
         source_name, source_url, source_type, last_reviewed_date,
         verification_status, verified_at, verified_by_user_id, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         poi_id = EXCLUDED.poi_id, exception_date = EXCLUDED.exception_date,
         opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
         is_closed = EXCLUDED.is_closed, reason = EXCLUDED.reason,
         source_name = EXCLUDED.source_name, source_url = EXCLUDED.source_url,
         source_type = EXCLUDED.source_type, last_reviewed_date = EXCLUDED.last_reviewed_date,
         verification_status = EXCLUDED.verification_status,
         verified_at = EXCLUDED.verified_at, verified_by_user_id = EXCLUDED.verified_by_user_id,
         status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = now()`,
      [
        record.id, record.poiId, record.exceptionDate, record.opensAt ?? null, record.closesAt ?? null,
        record.isClosed, record.reason ?? null, record.sourceName, record.sourceUrl, record.sourceType,
        record.lastReviewedDate, record.verificationStatus ?? "PENDING_REVIEW",
        record.verifiedAt ?? null, record.verifiedByUserId ?? null,
        record.status, record.notes ?? null
      ]
    );
    return { ...record, verificationStatus: record.verificationStatus ?? "PENDING_REVIEW" };
  }

  async listPoiOperatingHourExceptions(destinationId) {
    const [rows] = await this.pool.execute(
      `SELECT exceptions.id, exceptions.poi_id AS poiId,
              exceptions.exception_date AS exceptionDate,
              exceptions.opens_at AS opensAt, exceptions.closes_at AS closesAt,
              exceptions.is_closed AS isClosed, exceptions.reason,
              exceptions.source_name AS sourceName, exceptions.source_url AS sourceUrl,
              exceptions.source_type AS sourceType,
              exceptions.last_reviewed_date AS lastReviewedDate,
              exceptions.verification_status AS verificationStatus,
              exceptions.verified_at AS verifiedAt, exceptions.verified_by_user_id AS verifiedByUserId,
              exceptions.status, exceptions.notes
       FROM poi_operating_hour_exceptions exceptions
       JOIN canonical_pois poi ON poi.id = exceptions.poi_id
       WHERE poi.destination_id = ?
       ORDER BY exceptions.poi_id, exceptions.exception_date, exceptions.opens_at NULLS FIRST, exceptions.id`,
      [destinationId]
    );
    return rows.map((row) => ({
      id: row.id,
      poiId: row.poiId,
      exceptionDate: dateOnly(row.exceptionDate),
      opensAt: row.opensAt ?? null,
      closesAt: row.closesAt ?? null,
      isClosed: row.isClosed,
      ...(row.reason ? { reason: row.reason } : {}),
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
      sourceType: row.sourceType,
      lastReviewedDate: dateOnly(row.lastReviewedDate),
      verificationStatus: row.verificationStatus ?? "PENDING_REVIEW",
      ...(row.verifiedAt ? { verifiedAt: typeof row.verifiedAt === "string" ? row.verifiedAt : row.verifiedAt?.toISOString?.() } : {}),
      ...(row.verifiedByUserId ? { verifiedByUserId: row.verifiedByUserId } : {}),
      status: row.status,
      ...(row.notes ? { notes: row.notes } : {})
    }));
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
    const record = {
      ...reference,
      destinationId: reference.destinationId ?? reference.city,
      tier: reference.tier ?? null,
      poiId: reference.poiId ?? null,
      referenceType: reference.referenceType ?? "GENERIC_FALLBACK",
      unitType: reference.unitType ?? "PER_PERSON_ENTRY",
      priceBasis: reference.priceBasis ?? null,
      sourceType: reference.sourceType ?? "SYSTEM_ESTIMATE",
      lastReviewedDate: reference.lastReviewedDate ?? null,
      notes: reference.notes ?? null
    };
    await this.pool.execute(
      `INSERT INTO cost_references
        (id, city, destination_id, poi_id, category, tier, min_fen, representative_fen, max_fen,
         currency, source_name, source_url, collected_on, updated_at, reference_type, unit_type,
         price_basis, source_type, last_reviewed_date, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
          city = EXCLUDED.city, destination_id = EXCLUDED.destination_id, poi_id = EXCLUDED.poi_id,
          category = EXCLUDED.category, tier = EXCLUDED.tier,
          min_fen = EXCLUDED.min_fen, representative_fen = EXCLUDED.representative_fen,
          max_fen = EXCLUDED.max_fen, currency = EXCLUDED.currency,
          source_name = EXCLUDED.source_name, source_url = EXCLUDED.source_url,
          collected_on = EXCLUDED.collected_on, updated_at = EXCLUDED.updated_at,
          reference_type = EXCLUDED.reference_type, unit_type = EXCLUDED.unit_type,
          price_basis = EXCLUDED.price_basis, source_type = EXCLUDED.source_type,
          last_reviewed_date = EXCLUDED.last_reviewed_date, notes = EXCLUDED.notes,
          status = EXCLUDED.status`,
      [
        record.id, record.city, record.destinationId, record.poiId, record.category, record.tier,
        record.minMinor, record.representativeMinor, record.maxMinor,
        record.currency, record.sourceName, record.sourceUrl, record.collectedOn,
        record.updatedAt, record.referenceType, record.unitType, record.priceBasis,
        record.sourceType, record.lastReviewedDate, record.notes, record.status
      ]
    );
    return record;
  }

  async listCostReferences(city) {
    const [rows] = await this.pool.execute(
      `SELECT id, city, destination_id AS destinationId, poi_id AS poiId, category, tier,
              min_fen AS minMinor, representative_fen AS representativeMinor, max_fen AS maxMinor,
              currency, source_name AS sourceName, source_url AS sourceUrl,
              collected_on AS collectedOn, updated_at AS updatedAt, reference_type AS referenceType,
              unit_type AS unitType, price_basis AS priceBasis, source_type AS sourceType,
              last_reviewed_date AS lastReviewedDate, notes, status
       FROM cost_references WHERE city = ? ORDER BY category, tier, reference_type, poi_id`,
      [city]
    );
    return rows.map((row) => ({
      id: row.id,
      city: row.city,
      destinationId: row.destinationId ?? row.city,
      ...(row.poiId ? { poiId: row.poiId } : {}),
      category: row.category,
      tier: row.tier ?? null,
      minMinor: row.minMinor,
      maxMinor: row.maxMinor,
      representativeMinor: row.representativeMinor,
      currency: row.currency,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
      collectedOn: dateOnly(row.collectedOn),
      updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : row.updatedAt?.toISOString?.(),
      referenceType: row.referenceType ?? "GENERIC_FALLBACK",
      unitType: row.unitType ?? "PER_PERSON_ENTRY",
      ...(row.priceBasis ? { priceBasis: row.priceBasis } : {}),
      sourceType: row.sourceType ?? "SYSTEM_ESTIMATE",
      ...(row.lastReviewedDate ? { lastReviewedDate: dateOnly(row.lastReviewedDate) } : {}),
      ...(row.notes ? { notes: row.notes } : {}),
      status: row.status
    }));
  }

  async persistItineraryRun(connection, run) {
    await connection.execute(
      `INSERT INTO itinerary_runs
        (id, trip_id, profile, state, estimated_total_fen, summary_json)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         state = EXCLUDED.state,
         estimated_total_fen = EXCLUDED.estimated_total_fen,
         summary_json = EXCLUDED.summary_json`,
      [run.id, run.tripId, run.profile, run.state, run.estimatedTotalMinor ?? null, JSON.stringify(run.summary ?? {})]
    );
    for (const table of [
      "trip_legs", "itinerary_provenance", "itinerary_validation_issues", "itinerary_repairs"
    ]) {
      await connection.query(`DELETE FROM ${table} WHERE itinerary_run_id = ?`, [run.id]);
    }
    for (const leg of run.legs ?? []) {
      await connection.execute(
        "INSERT INTO trip_legs (id, itinerary_run_id, day_number, sequence, leg_json) VALUES (?, ?, ?, ?, ?)",
        [`${run.id}:${leg.dayNumber}:${leg.sequence}`, run.id, leg.dayNumber, leg.sequence, JSON.stringify(leg)]
      );
    }
    for (const item of run.provenance ?? []) {
      await connection.execute(
        "INSERT INTO itinerary_provenance (id, itinerary_run_id, path, source_json) VALUES (?, ?, ?, ?)",
        [item.id ?? randomUUID(), run.id, item.path, JSON.stringify(item.source)]
      );
    }
    for (const issue of run.validationIssues ?? []) {
      await connection.execute(
        `INSERT INTO itinerary_validation_issues
          (id, itinerary_run_id, code, path, severity, metadata_json) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          issue.id ?? randomUUID(), run.id, issue.code, issue.path,
          issue.severity, JSON.stringify(issue.metadata ?? {})
        ]
      );
    }
    for (const repair of run.repairs ?? []) {
      await connection.execute(
        "INSERT INTO itinerary_repairs (id, itinerary_run_id, attempt, repair_json) VALUES (?, ?, ?, ?)",
        [repair.id ?? randomUUID(), run.id, repair.attempt, JSON.stringify(repair)]
      );
    }
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
