import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { buildObjectiveRuns, validateItineraryRun } from "./objectiveRecords.js";

function json(value) {
  return JSON.stringify(value);
}

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function publicDate(value) {
  if (typeof value === "string") return value.slice(0, 10);
  return value?.toISOString?.().slice(0, 10) ?? value;
}

function publicDateTime(value) {
  if (typeof value === "string") return value;
  return value?.toISOString?.() ?? value;
}

function costReferenceRecord(reference) {
  return { ...reference, tier: reference.tier ?? null };
}

export class MySqlRepository {
  constructor(configOrPool) {
    this.pool = typeof configOrPool?.query === "function"
      ? configOrPool
      : mysql.createPool({
          ...configOrPool,
          waitForConnections: true,
          connectionLimit: 8,
          namedPlaceholders: false,
          decimalNumbers: true
        });
  }

  async createUser(user) {
    const id = randomUUID();
    await this.pool.execute(
      `INSERT INTO users
        (id, name, email, preferred_language, account_type, password_hash,
         guest_last_activity_at, guest_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.name,
        user.email,
        user.preferredLanguage ?? "zh",
        user.accountType ?? "REGISTERED",
        user.passwordHash,
        user.guestLastActivityAt ?? null,
        user.guestExpiresAt ?? null
      ]
    );
    return this.findUserById(id);
  }

  async findUserByEmail(email) {
    const [rows] = await this.pool.execute(
      `SELECT id, name, email, preferred_language AS preferredLanguage,
              account_type AS accountType, role, status, password_hash AS passwordHash,
              guest_last_activity_at AS guestLastActivityAt,
              guest_expires_at AS guestExpiresAt, created_at AS createdAt
       FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1`,
      [email]
    );
    return rows[0];
  }

  async findUserById(id) {
    const [rows] = await this.pool.execute(
      `SELECT id, name, email, preferred_language AS preferredLanguage,
              account_type AS accountType, role, status, password_hash AS passwordHash,
              guest_last_activity_at AS guestLastActivityAt,
              guest_expires_at AS guestExpiresAt, created_at AS createdAt
       FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    return rows[0];
  }

  async updateUserProfile(id, patch) {
    const [result] = await this.pool.execute(
      `UPDATE users
       SET name = COALESCE(?, name),
           preferred_language = COALESCE(?, preferred_language)
       WHERE id = ? AND deleted_at IS NULL`,
      [patch.name ?? null, patch.preferredLanguage ?? null, id]
    );
    return result.affectedRows ? this.findUserById(id) : undefined;
  }

  async touchGuestSession(id) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `UPDATE users SET guest_last_activity_at = CURRENT_TIMESTAMP, guest_expires_at = ?
         WHERE id = ? AND account_type = 'GUEST' AND deleted_at IS NULL`,
        [expiresAt, id]
      );
      if (result.affectedRows) {
        await connection.execute(
          `UPDATE trips SET expires_at = ?
           WHERE user_id = ? AND persistence_scope = 'SESSION'`,
          [expiresAt, id]
        );
      }
      await connection.commit();
      return result.affectedRows ? this.findUserById(id) : undefined;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateUserPassword(id, passwordHash) {
    const [result] = await this.pool.execute(
      "UPDATE users SET password_hash = ? WHERE id = ? AND deleted_at IS NULL",
      [passwordHash, id]
    );
    return result.affectedRows > 0;
  }

  async recordPrivacyConsent(userId, input) {
    const recordedAt = new Date();
    const type = input.type ?? "GENERAL";
    await this.pool.execute(
      `INSERT INTO privacy_consents (user_id, consent_type, version, accepted, recorded_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE version = VALUES(version), accepted = VALUES(accepted), recorded_at = VALUES(recorded_at)`,
      [userId, type, input.version, input.accepted, recordedAt]
    );
    return {
      userId,
      type,
      version: input.version,
      accepted: input.accepted,
      recordedAt: recordedAt.toISOString()
    };
  }

  async deleteAccount(userId) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute(
        "SELECT id FROM users WHERE id = ? AND deleted_at IS NULL FOR UPDATE",
        [userId]
      );
      if (!users[0]) {
        await connection.commit();
        return false;
      }

      await connection.execute("DELETE FROM trips WHERE user_id = ?", [userId]);
      await connection.execute("DELETE FROM privacy_consents WHERE user_id = ?", [userId]);
      const [result] = await connection.execute("DELETE FROM users WHERE id = ?", [userId]);
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getUserRole(userId) {
    const [rows] = await this.pool.execute(
      "SELECT role FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [userId]
    );
    return rows[0]?.role;
  }

  async setUserRole(userId, role) {
    if (!["user", "admin"].includes(role)) return false;
    const [result] = await this.pool.execute(
      "UPDATE users SET role = ? WHERE id = ? AND deleted_at IS NULL",
      [role, userId]
    );
    return result.affectedRows > 0;
  }

  async listSupportedDestinations() {
    const [rows] = await this.pool.execute(
      `SELECT id, name_en AS nameEn, name_zh AS nameZh,
              center_latitude AS latitude, center_longitude AS longitude, status
       FROM supported_destinations ORDER BY id`
    );
    return rows.map((row) => ({
      id: row.id,
      name: { en: row.nameEn, zh: row.nameZh },
      center: { latitude: row.latitude, longitude: row.longitude },
      status: row.status
    }));
  }

  async setDestinationStatus(destinationId, status) {
    const [result] = await this.pool.execute(
      "UPDATE supported_destinations SET status = ? WHERE id = ?",
      [status, destinationId]
    );
    return result.affectedRows ? { id: destinationId, status } : undefined;
  }

  async upsertCanonicalPoi(poi) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO canonical_pois
          (id, destination_id, name_json, category, latitude, longitude, address_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name_json = VALUES(name_json), category = VALUES(category),
           latitude = VALUES(latitude), longitude = VALUES(longitude),
           address_json = VALUES(address_json), status = VALUES(status)`,
        [
          poi.id, poi.destinationId, json(poi.name), poi.category,
          poi.coordinates.latitude, poi.coordinates.longitude,
          poi.address ? json(poi.address) : null, poi.status ?? "ACTIVE"
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
            source.retrievedAt, source.expiresAt ?? null, source.raw ? json(source.raw) : null
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

  async listCanonicalPois(destinationId) {
    const [poiRows] = await this.pool.execute(
      `SELECT id, destination_id AS destinationId, name_json, category,
              latitude, longitude, address_json, status
       FROM canonical_pois WHERE destination_id = ? ORDER BY id`,
      [destinationId]
    );
    if (!poiRows.length) return [];
    const [sourceRows] = await this.pool.query(
      `SELECT poi_id AS poiId, provider, source_id AS sourceId, source_url AS sourceUrl,
              retrieved_at AS retrievedAt, expires_at AS expiresAt, raw_json
       FROM poi_source_records WHERE poi_id IN (?) ORDER BY provider, source_id`,
      [poiRows.map(({ id }) => id)]
    );
    return poiRows.map((row) => ({
      id: row.id,
      destinationId: row.destinationId,
      name: parseJson(row.name_json),
      category: row.category,
      coordinates: { latitude: row.latitude, longitude: row.longitude },
      ...(row.address_json ? { address: parseJson(row.address_json) } : {}),
      status: row.status,
      sources: sourceRows.filter((source) => source.poiId === row.id).map((source) => ({
        provider: source.provider,
        sourceId: source.sourceId,
        ...(source.sourceUrl ? { sourceUrl: source.sourceUrl } : {}),
        retrievedAt: publicDateTime(source.retrievedAt),
        ...(source.expiresAt ? { expiresAt: publicDateTime(source.expiresAt) } : {}),
        ...(source.raw_json ? { raw: parseJson(source.raw_json) } : {})
      }))
    }));
  }

  async putRouteCache(key, route) {
    await this.pool.execute(
      `INSERT INTO route_cache
        (cache_key, mode, distance_meters, duration_seconds, route_json,
         provider, source_id, retrieved_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE distance_meters = VALUES(distance_meters),
         duration_seconds = VALUES(duration_seconds), route_json = VALUES(route_json),
         provider = VALUES(provider), source_id = VALUES(source_id),
         retrieved_at = VALUES(retrieved_at), expires_at = VALUES(expires_at)`,
      [
        key, route.mode, route.distanceMeters, route.durationSeconds, json(route),
        route.source.provider, route.source.sourceId, route.source.retrievedAt,
        route.source.expiresAt ?? null
      ]
    );
    return route;
  }

  async getRouteCache(key) {
    const [rows] = await this.pool.execute(
      "SELECT route_json FROM route_cache WHERE cache_key = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) LIMIT 1",
      [key]
    );
    return rows[0] ? parseJson(rows[0].route_json) : undefined;
  }

  async upsertCostReference(reference) {
    const record = costReferenceRecord(reference);
    await this.pool.execute(
      `INSERT INTO cost_references
        (id, city, category, tier, min_fen, representative_fen, max_fen,
         currency, source_name, source_url, collected_on, updated_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE city = VALUES(city), category = VALUES(category), tier = VALUES(tier),
          min_fen = VALUES(min_fen), representative_fen = VALUES(representative_fen),
          max_fen = VALUES(max_fen), currency = VALUES(currency), source_name = VALUES(source_name),
          source_url = VALUES(source_url), collected_on = VALUES(collected_on),
          updated_at = VALUES(updated_at), status = VALUES(status)`,
      [
        record.id, record.city, record.category, record.tier,
        record.minMinor, record.representativeMinor, record.maxMinor,
        record.currency, record.sourceName, record.sourceUrl, record.collectedOn,
        record.updatedAt, record.status
      ]
    );
    return record;
  }

  async listCostReferences(city) {
    const [rows] = await this.pool.execute(
      `SELECT id, city, category, tier, min_fen AS minMinor, representative_fen AS representativeMinor,
              max_fen AS maxMinor, currency, source_name AS sourceName, source_url AS sourceUrl,
              collected_on AS collectedOn, updated_at AS updatedAt, status
       FROM cost_references WHERE city = ? ORDER BY category, tier`,
      [city]
    );
    return rows.map((row) => costReferenceRecord({
      id: row.id,
      city: row.city,
      category: row.category,
      tier: row.tier,
      minMinor: row.minMinor,
      maxMinor: row.maxMinor,
      representativeMinor: row.representativeMinor,
      currency: row.currency,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
      collectedOn: publicDate(row.collectedOn),
      updatedAt: publicDateTime(row.updatedAt),
      status: row.status
    }));
  }

  async saveItineraryRun(run) {
    validateItineraryRun(run);
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await this.persistItineraryRun(connection, run);
      await connection.commit();
      return run;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async listUsers() {
    const [rows] = await this.pool.execute(
      `SELECT id, name, email, preferred_language AS preferredLanguage,
              account_type AS accountType, role, status, created_at AS createdAt
       FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC`
    );
    return rows;
  }

  async setUserStatus(userId, status) {
    if (!["ACTIVE", "SUSPENDED"].includes(status)) return undefined;
    const [result] = await this.pool.execute(
      "UPDATE users SET status = ? WHERE id = ? AND deleted_at IS NULL",
      [status, userId]
    );
    if (!result.affectedRows) return undefined;
    return (await this.listUsers()).find(({ id }) => id === userId);
  }

  async appendSystemRecord(record) {
    const id = randomUUID();
    await this.pool.execute(
      "INSERT INTO admin_system_records (id, level, event, metadata_json) VALUES (?, ?, ?, ?)",
      [id, record.level, record.event, json(record.metadata ?? {})]
    );
    return { id, ...record };
  }

  async listSystemRecords(limit = 100) {
    const safeLimit = Math.min(500, Math.max(1, Number(limit) || 100));
    const [rows] = await this.pool.execute(
      `SELECT id, level, event, metadata_json AS metadata, created_at AS createdAt
       FROM admin_system_records ORDER BY created_at DESC LIMIT ${safeLimit}`
    );
    return rows.map((row) => ({ ...row, metadata: parseJson(row.metadata), createdAt: publicDateTime(row.createdAt) }));
  }

  async persistItineraryRun(connection, run) {
      await connection.execute(
        `INSERT INTO itinerary_runs
          (id, trip_id, profile, state, estimated_total_fen, summary_json)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE state = VALUES(state),
           estimated_total_fen = VALUES(estimated_total_fen), summary_json = VALUES(summary_json)`,
        [run.id, run.tripId, run.profile, run.state, run.estimatedTotalMinor ?? null, json(run.summary ?? {})]
      );
      for (const table of [
        "trip_legs", "itinerary_provenance", "itinerary_validation_issues", "itinerary_repairs"
      ]) {
        await connection.query(`DELETE FROM ${table} WHERE itinerary_run_id = ?`, [run.id]);
      }
      for (const leg of run.legs ?? []) {
        await connection.execute(
          "INSERT INTO trip_legs (id, itinerary_run_id, day_number, sequence, leg_json) VALUES (?, ?, ?, ?, ?)",
          [leg.id ?? randomUUID(), run.id, leg.dayNumber, leg.sequence, json(leg)]
        );
      }
      for (const item of run.provenance ?? []) {
        await connection.execute(
          "INSERT INTO itinerary_provenance (id, itinerary_run_id, path, source_json) VALUES (?, ?, ?, ?)",
          [item.id ?? randomUUID(), run.id, item.path, json(item.source)]
        );
      }
      for (const issue of run.validationIssues ?? []) {
        await connection.execute(
          `INSERT INTO itinerary_validation_issues
            (id, itinerary_run_id, code, path, severity, metadata_json) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            issue.id ?? randomUUID(), run.id, issue.code, issue.path,
            issue.severity, json(issue.metadata ?? {})
          ]
        );
      }
      for (const repair of run.repairs ?? []) {
        await connection.execute(
          "INSERT INTO itinerary_repairs (id, itinerary_run_id, attempt, repair_json) VALUES (?, ?, ?, ?)",
          [repair.id ?? randomUUID(), run.id, repair.attempt, json(repair)]
        );
      }
  }

  async saveObjectiveTrip(ownerId, result) {
    const runs = buildObjectiveRuns(result);
    const payload = {
      ...result.trip,
      ...(result.itineraryRun
        ? { itineraryRun: result.itineraryRun }
        : { variants: result.variants }),
      validation: result.validation,
      generationState: result.state,
      differentiationDiagnostics: result.differentiationDiagnostics ?? [],
      differentiationPairs: result.differentiationPairs ?? [],
      objectiveAligned: true,
      selectedVariantId: null,
      revision: 0
    };
    const title = result.trip.title ?? `${result.trip.destination} journey`;
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO trips
          (id, user_id, parent_trip_id, status, title_en, title_zh, destination, start_date, end_date,
           total_budget, preferences_json, objective_payload_json, persistence_scope, expires_at,
           guest_claim_token_hash)
         VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          result.trip.id, ownerId, result.trip.parentTripId ?? null,
          title, title, result.trip.destination,
          result.trip.startDate, result.trip.endDate, result.trip.budgetMinor,
          json(result.trip.preferences ?? {}), json(payload),
          result.persistenceScope ?? "PERSISTENT", result.expiresAt ?? null,
          result.guestClaimTokenHash ?? null
        ]
      );
      for (const run of runs) await this.persistItineraryRun(connection, run);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.getTrip(result.trip.id);
  }

  async getItineraryRun(id) {
    const [rows] = await this.pool.execute(
      `SELECT id, trip_id AS tripId, profile, state,
              estimated_total_fen AS estimatedTotalMinor, summary_json
       FROM itinerary_runs WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows[0]) return undefined;
    const [legs, provenance, validationIssues, repairs] = await Promise.all([
      this.pool.execute("SELECT leg_json FROM trip_legs WHERE itinerary_run_id = ? ORDER BY day_number, sequence", [id]),
      this.pool.execute("SELECT id, path, source_json FROM itinerary_provenance WHERE itinerary_run_id = ? ORDER BY id", [id]),
      this.pool.execute("SELECT id, code, path, severity, metadata_json FROM itinerary_validation_issues WHERE itinerary_run_id = ? ORDER BY id", [id]),
      this.pool.execute("SELECT repair_json FROM itinerary_repairs WHERE itinerary_run_id = ? ORDER BY attempt", [id])
    ]);
    return {
      id: rows[0].id,
      tripId: rows[0].tripId,
      profile: rows[0].profile,
      state: rows[0].state,
      estimatedTotalMinor: rows[0].estimatedTotalMinor,
      summary: parseJson(rows[0].summary_json),
      legs: legs[0].map((row) => parseJson(row.leg_json)),
      provenance: provenance[0].map((row) => ({ id: row.id, path: row.path, source: parseJson(row.source_json) })),
      validationIssues: validationIssues[0].map((row) => ({
        id: row.id, code: row.code, path: row.path, severity: row.severity,
        metadata: parseJson(row.metadata_json)
      })),
      repairs: repairs[0].map((row) => parseJson(row.repair_json))
    };
  }

  async listTrips(userId) {
    const [rows] = await this.pool.execute(
      `SELECT t.id
       FROM trips t
       WHERE t.user_id = ? AND t.persistence_scope = 'PERSISTENT'
       ORDER BY t.updated_at DESC`,
      [userId]
    );
    return this.loadTrips(rows.map((row) => row.id));
  }

  async getTrip(id) {
    const [trip] = await this.loadTrips([id]);
    return trip;
  }

  async claimGuestTrip(id, newOwnerId, claimTokenHash) {
    const [result] = await this.pool.execute(
      `UPDATE trips t
       JOIN users u ON u.id = ? AND u.account_type = 'REGISTERED' AND u.deleted_at IS NULL
       SET t.user_id = ?, t.persistence_scope = 'PERSISTENT', t.expires_at = NULL,
           t.guest_claim_token_hash = NULL, t.updated_at = CURRENT_TIMESTAMP
       WHERE t.id = ? AND t.persistence_scope = 'SESSION'
         AND t.expires_at > CURRENT_TIMESTAMP AND t.guest_claim_token_hash = ?`,
      [newOwnerId, newOwnerId, id, claimTokenHash]
    );
    return result.affectedRows === 1 ? this.getTrip(id) : undefined;
  }

  async selectObjectiveVariant(id, _actorId, variantId, expectedRevision) {
    const [result] = await this.pool.execute(
      `UPDATE trips
       SET objective_payload_json = JSON_SET(objective_payload_json, '$.selectedVariantId', ?),
           revision = revision + 1
       WHERE id = ? AND objective_payload_json IS NOT NULL AND revision = ?`,
      [variantId, id, expectedRevision]
    );
    return result.affectedRows === 1 ? this.getTrip(id) : undefined;
  }

  async updateObjectiveVariant(id, _actorId, variant, expectedRevision) {
    const trip = await this.getTrip(id);
    if (!trip?.objectiveAligned || trip.revision !== expectedRevision) return undefined;
    const profile = variant.itinerary?.travelStyle ?? variant.itinerary?.variant;
    let itineraryPayload;
    let validation;
    if (trip.itineraryRun) {
      if ((trip.itineraryRun.itinerary?.travelStyle ?? trip.itineraryRun.itinerary?.variant) !== profile) return undefined;
      itineraryPayload = { itineraryRun: structuredClone(variant) };
      validation = structuredClone(variant.validation);
    } else {
      const variantIndex = trip.variants.findIndex(({ itinerary }) => (itinerary?.travelStyle ?? itinerary?.variant) === profile);
      if (variantIndex < 0) return undefined;
      const variants = structuredClone(trip.variants);
      variants[variantIndex] = structuredClone(variant);
      itineraryPayload = { variants };
      validation = {
        valid: variants.every((item) => item.validation?.valid),
        issues: variants.flatMap((item) => item.validation?.issues ?? [])
      };
    }
    const payload = {
      ...trip,
      ...itineraryPayload,
      validation,
      generationState: validation.valid ? "FINAL_VALIDATED" : "FAILED",
      ownerId: undefined,
      status: undefined,
      revision: undefined,
      createdAt: undefined,
      updatedAt: undefined
    };
    const [result] = await this.pool.execute(
      `UPDATE trips
       SET objective_payload_json = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND objective_payload_json IS NOT NULL AND revision = ?`,
      [json(payload), id, expectedRevision]
    );
    return result.affectedRows === 1 ? this.getTrip(id) : undefined;
  }

  async loadTrips(ids) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(", ");
    const [rows] = await this.pool.execute(
      `SELECT id, user_id AS ownerId, parent_trip_id AS parentTripId, status,
              title_en AS title, revision, persistence_scope AS persistenceScope,
              expires_at AS expiresAt, guest_claim_token_hash AS guestClaimTokenHash,
              objective_payload_json,
              created_at AS createdAt, updated_at AS updatedAt
       FROM trips
       WHERE id IN (${placeholders}) AND objective_payload_json IS NOT NULL`,
      ids
    );
    const trips = new Map(rows.map((row) => [row.id, {
      ...parseJson(row.objective_payload_json),
      id: row.id,
      ownerId: row.ownerId,
      parentTripId: row.parentTripId ?? undefined,
      status: row.status,
      title: row.title,
      revision: row.revision ?? 0,
      persistenceScope: row.persistenceScope,
      expiresAt: publicDateTime(row.expiresAt),
      guestClaimTokenHash: row.guestClaimTokenHash,
      createdAt: publicDateTime(row.createdAt),
      updatedAt: publicDateTime(row.updatedAt)
    }]));
    return ids.map((id) => trips.get(id)).filter(Boolean);
  }

  async mutateWithRevision(
    tripId,
    expectedRevision,
    actorUserId,
    audit,
    mutation
  ) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [accessRows] = await connection.execute(
        `SELECT t.user_id AS ownerId
         FROM trips t
         WHERE t.id = ?
         LIMIT 1
         FOR UPDATE`,
        [tripId]
      );
      const access = accessRows[0];
      if (!access) {
        await connection.rollback();
        return undefined;
      }
      if (access.ownerId !== actorUserId) {
        await connection.rollback();
        return undefined;
      }
      const [revisionResult] = await connection.execute(
        `UPDATE trips
         SET revision = revision + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND revision = ?`,
        [tripId, expectedRevision]
      );
      if (!revisionResult.affectedRows) {
        await connection.rollback();
        return undefined;
      }
      if (await mutation(connection) === false) {
        await connection.rollback();
        return undefined;
      }
      await connection.commit();
      return expectedRevision + 1;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateTrip(id, actorId, patch, expectedRevision, audit) {
    const fields = [];
    const values = [];
    if (patch.status) {
      fields.push("status = ?");
      values.push(patch.status);
    }
    if (patch.title) {
      fields.push("title_en = ?", "title_zh = ?");
      values.push(patch.title.en, patch.title.zh);
    }
    if (!fields.length) return this.getTrip(id);
    values.push(id);
    const revision = await this.mutateWithRevision(
      id,
      expectedRevision,
      actorId,
      audit,
      async (connection) => {
        await connection.execute(
          `UPDATE trips SET ${fields.join(", ")} WHERE id = ?`,
          values
        );
        return true;
      }
    );
    if (revision === undefined) return undefined;
    return { ...await this.getTrip(id), revision };
  }

  async deleteTrip(id, ownerId) {
    const [result] = await this.pool.execute("DELETE FROM trips WHERE id = ? AND user_id = ?", [id, ownerId]);
    return result.affectedRows > 0;
  }

  async duplicateTrip(id, ownerId) {
    const source = await this.getTrip(id);
    if (!source?.objectiveAligned || source.ownerId !== ownerId) return undefined;
    const tripId = randomUUID();
    return this.saveObjectiveTrip(ownerId, {
      id: `duplicate-${tripId}`,
      state: source.generationState,
      trip: {
        id: tripId,
        parentTripId: source.id,
        title: `${source.title} copy`,
        destination: source.destination,
        startDate: source.startDate,
        endDate: source.endDate,
        travellerCount: source.travellerCount,
        budgetMinor: source.budgetMinor,
        preferences: source.preferences
      },
      ...(source.itineraryRun
        ? { itineraryRun: structuredClone(source.itineraryRun) }
        : { variants: structuredClone(source.variants) }),
      validation: structuredClone(source.validation),
      differentiationDiagnostics: structuredClone(source.differentiationDiagnostics ?? []),
      differentiationPairs: structuredClone(source.differentiationPairs ?? [])
    });
  }

}
