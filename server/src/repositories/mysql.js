import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

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

function withoutNulls(row, fields) {
  if (!row) return undefined;
  const normalized = { ...row };
  for (const field of fields) {
    if (normalized[field] === null || normalized[field] === undefined) {
      delete normalized[field];
    }
  }
  return normalized;
}

function memberRecord(row) {
  return withoutNulls(row, ["removedAt"]);
}

function invitationRecord(row) {
  return withoutNulls(row, ["acceptedByUserId", "acceptedAt"]);
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
      "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
      [id, user.name, user.email, user.passwordHash]
    );
    return this.findUserById(id);
  }

  async findUserByEmail(email) {
    const [rows] = await this.pool.execute(
      "SELECT id, name, email, password_hash AS passwordHash, created_at AS createdAt FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    return rows[0];
  }

  async findUserById(id) {
    const [rows] = await this.pool.execute(
      "SELECT id, name, email, password_hash AS passwordHash, created_at AS createdAt FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0];
  }

  async createTrip(ownerId, preferences, variants) {
    const connection = await this.pool.getConnection();
    const tripId = variants[0]?.tripId ?? randomUUID();
    try {
      await connection.beginTransaction();
      const first = variants[0];
      const end = new Date(`${preferences.startDate}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + preferences.days - 1);
      await connection.execute(
        `INSERT INTO trips
          (id, user_id, status, title_en, title_zh, destination, start_date, end_date, total_budget, preferences_json)
         VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)`,
        [
          tripId, ownerId, first.title.en, first.title.zh, preferences.destination,
          preferences.startDate, end.toISOString().slice(0, 10), preferences.totalBudget, json(preferences)
        ]
      );
      await connection.execute(
        `INSERT INTO travel_preferences
          (id, user_id, trip_id, destination, departure_city, days, total_budget, interests_json,
           group_type, accommodation, language, start_date, conflicts_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(), ownerId, tripId, preferences.destination, preferences.departureCity,
          preferences.days, preferences.totalBudget, json(preferences.interests),
          preferences.groupType, preferences.accommodation, preferences.language,
          preferences.startDate, json(preferences.conflicts ?? [])
        ]
      );
      await connection.execute(
        `INSERT INTO trip_members (id, trip_id, user_id, role, status)
         VALUES (?, ?, ?, 'owner', 'active')`,
        [randomUUID(), tripId, ownerId]
      );

      for (const variant of variants) {
        await connection.execute(
          `INSERT INTO itinerary_variants
            (id, trip_id, style, title_json, summary_json, pace, highlights_json, budget_json, is_fallback)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            variant.id, tripId, variant.style, json(variant.title), json(variant.summary),
            variant.pace, json(variant.highlights), json(variant.budget), variant.isFallback ? 1 : 0
          ]
        );
        for (const day of variant.days) {
          await connection.execute(
            `INSERT INTO trip_days (id, variant_id, day_number, trip_date, title_json)
             VALUES (?, ?, ?, ?, ?)`,
            [day.id, variant.id, day.dayNumber, day.date, json(day.title)]
          );
          for (const activity of day.activities) {
            await this.insertActivity(connection, day.id, activity);
          }
        }
      }
      await connection.commit();
      return this.getTrip(tripId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async insertActivity(connection, dayId, activity) {
    await connection.execute(
      `INSERT INTO activities
        (id, day_id, sort_order, start_time, end_time, name_json, description_json, category,
         address_json, longitude, latitude, estimated_cost, transport_note_json, guide_json,
         source_attraction_id, source_provider, source_url, image_url, image_attribution,
         visit_details_json, location_is_estimated, vote_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activity.id, dayId, activity.order, activity.startTime, activity.endTime,
        json(activity.name), json(activity.description), activity.category, json(activity.address),
        activity.location.longitude, activity.location.latitude, activity.estimatedCost,
        json(activity.transportNote), json(activity.guide), activity.sourceAttractionId ?? null,
        activity.sourceProvider ?? null, activity.sourceUrl ?? null,
        activity.imageUrl ?? null, activity.imageAttribution ?? null,
        activity.visitDetails ? json(activity.visitDetails) : null,
        activity.locationIsEstimated === undefined ? null : (activity.locationIsEstimated ? 1 : 0),
        activity.votes ?? 0
      ]
    );
  }

  async listTrips(userId) {
    const [rows] = await this.pool.execute(
      `SELECT t.id
       FROM trips t
       LEFT JOIN trip_members m
         ON m.trip_id = t.id AND m.user_id = ? AND m.status = 'active'
       WHERE t.user_id = ? OR m.user_id IS NOT NULL
       ORDER BY t.updated_at DESC`,
      [userId, userId]
    );
    return this.loadTrips(rows.map((row) => row.id));
  }

  async getTrip(id) {
    const [trip] = await this.loadTrips([id]);
    return trip;
  }

  async loadTrips(ids) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(", ");
    const [tripRows] = await this.pool.execute(
      `SELECT id, user_id AS ownerId, status, title_en, title_zh, destination,
              start_date AS startDate, end_date AS endDate, total_budget AS totalBudget,
              selected_variant_id AS selectedVariantId, revision, preferences_json,
              created_at AS createdAt, updated_at AS updatedAt
       FROM trips WHERE id IN (${placeholders})`,
      ids
    );
    if (!tripRows.length) return [];
    const tripsById = new Map(tripRows.map((row) => [row.id, {
      id: row.id,
      ownerId: row.ownerId,
      status: row.status,
      title: { en: row.title_en, zh: row.title_zh },
      destination: row.destination,
      startDate: publicDate(row.startDate),
      endDate: publicDate(row.endDate),
      totalBudget: row.totalBudget,
      preferences: parseJson(row.preferences_json),
      variants: [],
      selectedVariantId: row.selectedVariantId,
      revision: row.revision ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }]));
    const tripIds = [...tripsById.keys()];
    const tripPlaceholders = tripIds.map(() => "?").join(", ");
    const [variantRows] = await this.pool.execute(
      `SELECT id, trip_id AS tripId, style, title_json, summary_json, pace,
              highlights_json, budget_json, is_fallback
       FROM itinerary_variants
       WHERE trip_id IN (${tripPlaceholders})
       ORDER BY trip_id, FIELD(style, 'budget', 'food', 'leisure')`,
      tripIds
    );
    const variantsById = new Map();
    for (const variantRow of variantRows) {
      const trip = tripsById.get(variantRow.tripId);
      if (!trip) continue;
      const variant = {
        id: variantRow.id,
        tripId: variantRow.tripId,
        style: variantRow.style,
        title: parseJson(variantRow.title_json),
        summary: parseJson(variantRow.summary_json),
        destination: trip.destination,
        startDate: trip.startDate,
        totalBudget: trip.totalBudget,
        pace: variantRow.pace,
        highlights: parseJson(variantRow.highlights_json),
        budget: parseJson(variantRow.budget_json),
        days: [],
        isFallback: Boolean(variantRow.is_fallback)
      };
      variantsById.set(variant.id, variant);
      trip.variants.push(variant);
    }
    const variantIds = [...variantsById.keys()];
    if (!variantIds.length) return ids.map((id) => tripsById.get(id)).filter(Boolean);

    const variantPlaceholders = variantIds.map(() => "?").join(", ");
    const [dayRows] = await this.pool.execute(
      `SELECT id, variant_id AS variantId, day_number AS dayNumber, trip_date AS tripDate, title_json
       FROM trip_days WHERE variant_id IN (${variantPlaceholders})
       ORDER BY variant_id, day_number`,
      variantIds
    );
    const daysById = new Map();
    for (const dayRow of dayRows) {
      const variant = variantsById.get(dayRow.variantId);
      if (!variant) continue;
      const day = {
        id: dayRow.id,
        dayNumber: dayRow.dayNumber,
        date: publicDate(dayRow.tripDate),
        title: parseJson(dayRow.title_json),
        activities: []
      };
      daysById.set(day.id, day);
      variant.days.push(day);
    }
    const dayIds = [...daysById.keys()];
    if (!dayIds.length) return ids.map((id) => tripsById.get(id)).filter(Boolean);

    const dayPlaceholders = dayIds.map(() => "?").join(", ");
    const [activityRows] = await this.pool.execute(
      `SELECT id, day_id AS dayId, sort_order AS sortOrder, start_time AS startTime, end_time AS endTime,
              name_json, description_json, category, address_json, longitude, latitude,
              estimated_cost AS estimatedCost, transport_note_json, guide_json,
              source_attraction_id AS sourceAttractionId, source_provider AS sourceProvider,
              source_url AS sourceUrl, image_url AS imageUrl,
              image_attribution AS imageAttribution, visit_details_json,
              location_is_estimated AS locationIsEstimated,
              vote_count AS votes
       FROM activities WHERE day_id IN (${dayPlaceholders}) ORDER BY day_id, sort_order`,
      dayIds
    );
    for (const activity of activityRows) {
      const day = daysById.get(activity.dayId);
      if (!day) continue;
      day.activities.push({
        id: activity.id,
        order: activity.sortOrder,
        startTime: String(activity.startTime).slice(0, 5),
        endTime: String(activity.endTime).slice(0, 5),
        name: parseJson(activity.name_json),
        description: parseJson(activity.description_json),
        category: activity.category,
        address: parseJson(activity.address_json),
        location: { longitude: activity.longitude, latitude: activity.latitude },
        estimatedCost: activity.estimatedCost,
        transportNote: parseJson(activity.transport_note_json),
        guide: parseJson(activity.guide_json),
        ...(activity.sourceAttractionId ? {
          sourceAttractionId: activity.sourceAttractionId,
          sourceProvider: activity.sourceProvider,
          sourceUrl: activity.sourceUrl
        } : {}),
        ...(activity.imageUrl ? {
          imageUrl: activity.imageUrl,
          imageAttribution: activity.imageAttribution
        } : {}),
        ...(activity.visit_details_json ? {
          visitDetails: parseJson(activity.visit_details_json)
        } : {}),
        ...(activity.locationIsEstimated === null ? {} : {
          locationIsEstimated: Boolean(activity.locationIsEstimated)
        }),
        votes: activity.votes,
        isFavorite: false
      });
    }

    return ids.map((id) => tripsById.get(id)).filter(Boolean);
  }

  async mutateWithRevision(tripId, expectedRevision, mutation) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
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

  async updateTrip(id, _actorId, patch, expectedRevision) {
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
    const revision = await this.mutateWithRevision(id, expectedRevision, async (connection) => {
      await connection.execute(
        `UPDATE trips SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
      return true;
    });
    if (revision === undefined) return undefined;
    return { ...await this.getTrip(id), revision };
  }

  async deleteTrip(id, ownerId) {
    const [result] = await this.pool.execute("DELETE FROM trips WHERE id = ? AND user_id = ?", [id, ownerId]);
    return result.affectedRows > 0;
  }

  async duplicateTrip(id, ownerId) {
    const source = await this.getTrip(id);
    if (!source || source.ownerId !== ownerId) return undefined;
    const tripId = randomUUID();
    const variants = source.variants.map((variant) => ({
      ...variant,
      id: randomUUID(),
      tripId,
      days: variant.days.map((day) => ({
        ...day,
        id: randomUUID(),
        activities: day.activities.map((activity) => ({ ...activity, id: randomUUID() }))
      }))
    }));
    return this.createTrip(ownerId, source.preferences, variants);
  }

  async selectVariant(id, _actorId, variantId, expectedRevision) {
    const revision = await this.mutateWithRevision(id, expectedRevision, async (connection) => {
      await connection.execute(
        `UPDATE trips t SET selected_variant_id = ?
         WHERE t.id = ?
           AND EXISTS (SELECT 1 FROM itinerary_variants v WHERE v.id = ? AND v.trip_id = t.id)`,
        [variantId, id, variantId]
      );
      return true;
    });
    if (revision === undefined) return undefined;
    return { ...await this.getTrip(id), revision };
  }

  async findActivityContext(activityId) {
    const [rows] = await this.pool.execute(
      `SELECT t.id AS tripId, d.id AS dayId, v.id AS variantId
       FROM activities a
       JOIN trip_days d ON d.id = a.day_id
       JOIN itinerary_variants v ON v.id = d.variant_id
       JOIN trips t ON t.id = v.trip_id
       WHERE a.id = ? LIMIT 1`,
      [activityId]
    );
    if (!rows[0]) return undefined;
    const trip = await this.getTrip(rows[0].tripId);
    const variant = trip.variants.find((item) => item.id === rows[0].variantId);
    const day = variant.days.find((item) => item.id === rows[0].dayId);
    const index = day.activities.findIndex((item) => item.id === activityId);
    return { trip, variant, day, index, activity: day.activities[index] };
  }

  async findDayContext(tripId, dayId) {
    const trip = await this.getTrip(tripId);
    if (!trip) return undefined;
    for (const variant of trip.variants) {
      const day = variant.days.find((item) => item.id === dayId);
      if (day) return { trip, variant, day };
    }
    return undefined;
  }

  async addActivity(tripId, dayId, _actorId, activity, expectedRevision) {
    const context = await this.findDayContext(tripId, dayId);
    if (!context) return undefined;
    const revision = await this.mutateWithRevision(
      tripId,
      expectedRevision,
      async (connection) => {
        await this.insertActivity(connection, dayId, activity);
        return true;
      }
    );
    if (revision === undefined) return undefined;
    return { ...await this.findActivityContext(activity.id), revision };
  }

  async updateActivity(activityId, _actorId, patch, expectedRevision) {
    const context = await this.findActivityContext(activityId);
    if (!context) return undefined;
    const mapping = {
      startTime: ["start_time", (value) => value],
      endTime: ["end_time", (value) => value],
      name: ["name_json", json],
      description: ["description_json", json],
      category: ["category", (value) => value],
      address: ["address_json", json],
      estimatedCost: ["estimated_cost", (value) => value],
      transportNote: ["transport_note_json", json],
      guide: ["guide_json", json],
      sourceAttractionId: ["source_attraction_id", (value) => value ?? null],
      sourceProvider: ["source_provider", (value) => value ?? null],
      sourceUrl: ["source_url", (value) => value ?? null],
      imageUrl: ["image_url", (value) => value ?? null],
      imageAttribution: ["image_attribution", (value) => value ?? null],
      visitDetails: [
        "visit_details_json",
        (value) => value === undefined ? null : json(value)
      ],
      locationIsEstimated: [
        "location_is_estimated",
        (value) => value === undefined ? null : (value ? 1 : 0)
      ]
    };
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(patch)) {
      if (mapping[key]) {
        fields.push(`${mapping[key][0]} = ?`);
        values.push(mapping[key][1](value));
      }
    }
    if (patch.location) {
      fields.push("longitude = ?", "latitude = ?");
      values.push(patch.location.longitude, patch.location.latitude);
    }
    values.push(activityId);
    const revision = await this.mutateWithRevision(
      context.trip.id,
      expectedRevision,
      async (connection) => {
        if (!fields.length) return true;
        await connection.execute(
          `UPDATE activities SET ${fields.join(", ")} WHERE id = ?`,
          values
        );
        return true;
      }
    );
    if (revision === undefined) return undefined;
    return { ...await this.findActivityContext(activityId), revision };
  }

  async deleteActivity(activityId, _actorId, expectedRevision) {
    const context = await this.findActivityContext(activityId);
    if (!context) return undefined;
    const revision = await this.mutateWithRevision(
      context.trip.id,
      expectedRevision,
      async (connection) => {
        const [result] = await connection.execute(
          "DELETE FROM activities WHERE id = ?",
          [activityId]
        );
        return result.affectedRows > 0;
      }
    );
    if (revision === undefined) return undefined;
    const current = await this.findDayContext(context.trip.id, context.day.id);
    return { ...current, activity: context.activity, revision };
  }

  async reorderDay(tripId, dayId, _actorId, activityIds, expectedRevision) {
    const context = await this.findDayContext(tripId, dayId);
    if (!context) return undefined;
    const existing = new Set(context.day.activities.map((item) => item.id));
    if (activityIds.length !== existing.size || new Set(activityIds).size !== existing.size ||
        activityIds.some((item) => !existing.has(item))) return null;
    const revision = await this.mutateWithRevision(
      tripId,
      expectedRevision,
      async (connection) => {
        for (const [order, activityId] of activityIds.entries()) {
          await connection.execute(
            "UPDATE activities SET sort_order = ? WHERE id = ? AND day_id = ?",
            [order, activityId, dayId]
          );
        }
        return true;
      }
    );
    if (revision === undefined) return undefined;
    return { ...await this.findDayContext(tripId, dayId), revision };
  }

  async replaceDay(tripId, dayId, _actorId, activities, expectedRevision) {
    const context = await this.findDayContext(tripId, dayId);
    if (!context) return undefined;
    const revision = await this.mutateWithRevision(
      tripId,
      expectedRevision,
      async (connection) => {
        await connection.execute("DELETE FROM activities WHERE day_id = ?", [dayId]);
        for (const activity of activities) {
          await this.insertActivity(connection, dayId, activity);
        }
        return true;
      }
    );
    if (revision === undefined) return undefined;
    return { ...await this.findDayContext(tripId, dayId), revision };
  }

  async getMember(tripId, userId) {
    const [rows] = await this.pool.execute(
      `SELECT m.id, m.trip_id AS tripId, m.user_id AS userId, u.name,
              m.role, m.status, m.joined_at AS joinedAt, m.removed_at AS removedAt
       FROM trip_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.trip_id = ? AND m.user_id = ?
       LIMIT 1`,
      [tripId, userId]
    );
    return memberRecord(rows[0]);
  }

  async listMembers(tripId) {
    const [rows] = await this.pool.execute(
      `SELECT m.id, m.trip_id AS tripId, m.user_id AS userId, u.name,
              m.role, m.status, m.joined_at AS joinedAt, m.removed_at AS removedAt
       FROM trip_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.trip_id = ?
       ORDER BY m.joined_at, m.id`,
      [tripId]
    );
    return rows.map(memberRecord);
  }

  async createInvitation(input) {
    const id = input.id ?? randomUUID();
    await this.pool.execute(
      `INSERT INTO trip_invitations
        (id, trip_id, token_hash, role, status, invited_by_user_id, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.tripId, input.tokenHash, input.role, input.status ?? "pending",
        input.invitedByUserId, input.expiresAt
      ]
    );
    return this.getInvitationByTokenHash(input.tokenHash);
  }

  async getInvitationByTokenHash(tokenHash) {
    const [rows] = await this.pool.execute(
      `SELECT id, trip_id AS tripId, token_hash AS tokenHash, role, status,
              invited_by_user_id AS invitedByUserId,
              accepted_by_user_id AS acceptedByUserId,
              expires_at AS expiresAt, created_at AS createdAt, accepted_at AS acceptedAt
       FROM trip_invitations
       WHERE token_hash = ?
       LIMIT 1`,
      [tokenHash]
    );
    return invitationRecord(rows[0]);
  }

  async listInvitations(tripId) {
    const [rows] = await this.pool.execute(
      `SELECT id, trip_id AS tripId, token_hash AS tokenHash, role, status,
              invited_by_user_id AS invitedByUserId,
              accepted_by_user_id AS acceptedByUserId,
              expires_at AS expiresAt, created_at AS createdAt, accepted_at AS acceptedAt
       FROM trip_invitations
       WHERE trip_id = ?
       ORDER BY created_at DESC`,
      [tripId]
    );
    return rows.map(invitationRecord);
  }

  async updateInvitation(invitationId, tripId, patch, options = {}) {
    const mapping = {
      role: "role",
      status: "status",
      acceptedByUserId: "accepted_by_user_id",
      expiresAt: "expires_at",
      acceptedAt: "accepted_at"
    };
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(patch)) {
      if (!mapping[key]) continue;
      fields.push(`${mapping[key]} = ?`);
      values.push(value ?? null);
    }
    if (fields.length) {
      const conditions = ["id = ?", "trip_id = ?"];
      values.push(invitationId, tripId);
      if (options.expectedStatuses?.length) {
        conditions.push(`status IN (${options.expectedStatuses.map(() => "?").join(", ")})`);
        values.push(...options.expectedStatuses);
      }
      if (options.requireUnexpired) {
        conditions.push("expires_at > CURRENT_TIMESTAMP");
      }
      const [result] = await this.pool.execute(
        `UPDATE trip_invitations
         SET ${fields.join(", ")}
         WHERE ${conditions.join(" AND ")}`,
        values
      );
      if (!result.affectedRows) return undefined;
    }
    const [rows] = await this.pool.execute(
      `SELECT id, trip_id AS tripId, token_hash AS tokenHash, role, status,
              invited_by_user_id AS invitedByUserId,
              accepted_by_user_id AS acceptedByUserId,
              expires_at AS expiresAt, created_at AS createdAt, accepted_at AS acceptedAt
       FROM trip_invitations
       WHERE id = ? AND trip_id = ?
       LIMIT 1`,
      [invitationId, tripId]
    );
    return invitationRecord(rows[0]);
  }

  async acceptInvitation(invitationId, userId) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [invitations] = await connection.execute(
        `SELECT i.id, i.trip_id AS tripId, i.role, i.status,
                i.accepted_by_user_id AS acceptedByUserId,
                i.expires_at AS expiresAt, t.user_id AS ownerId
         FROM trip_invitations i
         JOIN trips t ON t.id = i.trip_id
         WHERE i.id = ?
         LIMIT 1
         FOR UPDATE`,
        [invitationId]
      );
      const invitation = invitations[0];
      if (!invitation) {
        await connection.commit();
        return undefined;
      }
      if (invitation.status === "accepted") {
        if (invitation.acceptedByUserId !== userId) {
          await connection.commit();
          return undefined;
        }
        const [members] = await connection.execute(
          `SELECT m.id, m.trip_id AS tripId, m.user_id AS userId, u.name,
                  m.role, m.status, m.joined_at AS joinedAt, m.removed_at AS removedAt
           FROM trip_members m
           JOIN users u ON u.id = m.user_id
           WHERE m.trip_id = ? AND m.user_id = ?
           LIMIT 1`,
          [invitation.tripId, userId]
        );
        await connection.commit();
        return members[0]?.status === "active" ? memberRecord(members[0]) : undefined;
      }
      if (invitation.status !== "pending") {
        await connection.commit();
        return undefined;
      }
      if (invitation.ownerId === userId) {
        await connection.commit();
        return undefined;
      }
      if (Date.parse(invitation.expiresAt) <= Date.now()) {
        await connection.execute(
          `UPDATE trip_invitations
           SET status = 'expired'
           WHERE id = ? AND status = 'pending'`,
          [invitationId]
        );
        await connection.commit();
        return undefined;
      }

      const [accepted] = await connection.execute(
        `UPDATE trip_invitations
         SET status = 'accepted', accepted_by_user_id = ?, accepted_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP`,
        [userId, invitationId]
      );
      if (!accepted.affectedRows) {
        await connection.execute(
          `UPDATE trip_invitations
           SET status = 'expired'
           WHERE id = ? AND status = 'pending'`,
          [invitationId]
        );
        await connection.commit();
        return undefined;
      }
      await connection.execute(
        `INSERT INTO trip_members (id, trip_id, user_id, role, status)
         VALUES (?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE
           role = VALUES(role), status = 'active', removed_at = NULL`,
        [randomUUID(), invitation.tripId, userId, invitation.role]
      );
      const [members] = await connection.execute(
        `SELECT m.id, m.trip_id AS tripId, m.user_id AS userId, u.name,
                m.role, m.status, m.joined_at AS joinedAt, m.removed_at AS removedAt
         FROM trip_members m
         JOIN users u ON u.id = m.user_id
         WHERE m.trip_id = ? AND m.user_id = ?
         LIMIT 1`,
        [invitation.tripId, userId]
      );
      await connection.commit();
      return memberRecord(members[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateMember(tripId, memberId, role) {
    const [result] = await this.pool.execute(
      `UPDATE trip_members
       SET role = ?
       WHERE id = ? AND trip_id = ?`,
      [role, memberId, tripId]
    );
    if (!result.affectedRows) return undefined;
    const [rows] = await this.pool.execute(
      `SELECT m.id, m.trip_id AS tripId, m.user_id AS userId, u.name,
              m.role, m.status, m.joined_at AS joinedAt, m.removed_at AS removedAt
       FROM trip_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.id = ? AND m.trip_id = ?
       LIMIT 1`,
      [memberId, tripId]
    );
    return memberRecord(rows[0]);
  }

  async removeMember(tripId, memberId) {
    const [result] = await this.pool.execute(
      `UPDATE trip_members
       SET status = 'removed', removed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND trip_id = ?`,
      [memberId, tripId]
    );
    if (!result.affectedRows) return undefined;
    const [rows] = await this.pool.execute(
      `SELECT m.id, m.trip_id AS tripId, m.user_id AS userId, u.name,
              m.role, m.status, m.joined_at AS joinedAt, m.removed_at AS removedAt
       FROM trip_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.id = ? AND m.trip_id = ?
       LIMIT 1`,
      [memberId, tripId]
    );
    return memberRecord(rows[0]);
  }

  async listExpenses(tripId) {
    return this.loadExpenses(tripId);
  }

  async getExpense(tripId, expenseId) {
    const [expense] = await this.loadExpenses(tripId, expenseId);
    return expense;
  }

  async loadExpenses(tripId, expenseId) {
    const values = [tripId];
    const expenseFilter = expenseId === undefined ? "" : " AND e.id = ?";
    if (expenseId !== undefined) values.push(expenseId);
    const [rows] = await this.pool.execute(
      `SELECT e.id, e.trip_id AS tripId, e.description, e.category,
              e.amount_fen AS amountFen, e.expense_date AS expenseDate,
              e.paid_by_user_id AS paidByUserId, payer.name AS paidByName,
              e.created_by_user_id AS createdByUserId, creator.name AS createdByName,
              e.note, e.created_at AS createdAt, e.updated_at AS updatedAt,
              p.user_id AS participantUserId, participant.name AS participantName,
              p.share_fen AS participantShareFen
       FROM trip_expenses e
       JOIN users payer ON payer.id = e.paid_by_user_id
       JOIN users creator ON creator.id = e.created_by_user_id
       LEFT JOIN expense_participants p ON p.expense_id = e.id
       LEFT JOIN users participant ON participant.id = p.user_id
       WHERE e.trip_id = ?${expenseFilter}
       ORDER BY e.expense_date DESC, e.created_at DESC, p.user_id`,
      values
    );
    const expenses = new Map();
    for (const row of rows) {
      let expense = expenses.get(row.id);
      if (!expense) {
        expense = {
          id: row.id,
          tripId: row.tripId,
          description: row.description,
          category: row.category,
          amountFen: row.amountFen,
          expenseDate: publicDate(row.expenseDate),
          paidByUserId: row.paidByUserId,
          paidByName: row.paidByName,
          createdByUserId: row.createdByUserId,
          createdByName: row.createdByName,
          note: row.note,
          participants: [],
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        };
        expenses.set(row.id, expense);
      }
      if (row.participantUserId) {
        expense.participants.push({
          userId: row.participantUserId,
          name: row.participantName,
          shareFen: row.participantShareFen
        });
      }
    }
    return [...expenses.values()];
  }

  async createExpense(input, allocations) {
    const connection = await this.pool.getConnection();
    const id = input.id ?? randomUUID();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO trip_expenses
          (id, trip_id, description, category, amount_fen, expense_date,
           paid_by_user_id, created_by_user_id, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, input.tripId, input.description, input.category, input.amountFen,
          input.expenseDate, input.paidByUserId, input.createdByUserId, input.note
        ]
      );
      for (const allocation of allocations) {
        await connection.execute(
          `INSERT INTO expense_participants (expense_id, user_id, share_fen)
           VALUES (?, ?, ?)`,
          [id, allocation.userId, allocation.shareFen]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.getExpense(input.tripId, id);
  }

  async updateExpense(expenseId, input, allocations) {
    const connection = await this.pool.getConnection();
    let tripId;
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute(
        `SELECT trip_id AS tripId
         FROM trip_expenses
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [expenseId]
      );
      tripId = rows[0]?.tripId;
      if (!tripId) {
        await connection.commit();
        return undefined;
      }
      await connection.execute(
        `UPDATE trip_expenses
         SET description = ?, category = ?, amount_fen = ?, expense_date = ?,
             paid_by_user_id = ?, note = ?
         WHERE id = ?`,
        [
          input.description, input.category, input.amountFen, input.expenseDate,
          input.paidByUserId, input.note, expenseId
        ]
      );
      await connection.execute(
        "DELETE FROM expense_participants WHERE expense_id = ?",
        [expenseId]
      );
      for (const allocation of allocations) {
        await connection.execute(
          `INSERT INTO expense_participants (expense_id, user_id, share_fen)
           VALUES (?, ?, ?)`,
          [expenseId, allocation.userId, allocation.shareFen]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.getExpense(tripId, expenseId);
  }

  async deleteExpense(tripId, expenseId) {
    const [result] = await this.pool.execute(
      "DELETE FROM trip_expenses WHERE id = ? AND trip_id = ?",
      [expenseId, tripId]
    );
    return result.affectedRows > 0;
  }

  async appendTripActivity(input) {
    const id = input.id ?? randomUUID();
    await this.pool.execute(
      `INSERT INTO trip_activity_log
        (id, trip_id, actor_user_id, action, entity_type, entity_id, summary_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.tripId, input.actorUserId, input.action,
        input.entityType, input.entityId, json(input.summary)
      ]
    );
    const [rows] = await this.pool.execute(
      `SELECT l.id, l.trip_id AS tripId, l.actor_user_id AS actorUserId,
              u.name AS actorName, l.action, l.entity_type AS entityType,
              l.entity_id AS entityId, l.summary_json, l.created_at AS createdAt
       FROM trip_activity_log l
       JOIN users u ON u.id = l.actor_user_id
       WHERE l.id = ?
       LIMIT 1`,
      [id]
    );
    if (!rows[0]) return undefined;
    const { summary_json, ...activity } = rows[0];
    return { ...activity, summary: parseJson(summary_json) };
  }

  async listTripActivity(tripId, limit) {
    const [rows] = await this.pool.execute(
      `SELECT l.id, l.trip_id AS tripId, l.actor_user_id AS actorUserId,
              u.name AS actorName, l.action, l.entity_type AS entityType,
              l.entity_id AS entityId, l.summary_json, l.created_at AS createdAt
       FROM trip_activity_log l
       JOIN users u ON u.id = l.actor_user_id
       WHERE l.trip_id = ?
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT ?`,
      [tripId, limit]
    );
    return rows.map(({ summary_json, ...row }) => ({
      ...row,
      summary: parseJson(summary_json)
    }));
  }

  async incrementTripRevision(tripId, expectedRevision) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `UPDATE trips
         SET revision = revision + 1
         WHERE id = ? AND revision = ?`,
        [tripId, expectedRevision]
      );
      await connection.commit();
      return result.affectedRows ? expectedRevision + 1 : undefined;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createShare(tripId, ownerId, permission) {
    const trip = await this.getTrip(tripId);
    if (!trip || trip.ownerId !== ownerId) return undefined;
    const share = { id: randomUUID(), token: randomUUID().replaceAll("-", ""), tripId, permission };
    await this.pool.execute(
      "INSERT INTO trip_shares (id, trip_id, token, permission) VALUES (?, ?, ?, ?)",
      [share.id, tripId, share.token, permission]
    );
    return share;
  }

  async getShare(token) {
    const [rows] = await this.pool.execute(
      "SELECT id, trip_id AS tripId, token, permission, created_at AS createdAt FROM trip_shares WHERE token = ? LIMIT 1",
      [token]
    );
    return rows[0] ? { ...rows[0], trip: await this.getTrip(rows[0].tripId) } : undefined;
  }

  async vote(token, activityId, userId) {
    const share = await this.getShare(token);
    const context = await this.findActivityContext(activityId);
    if (!share || share.permission !== "edit" || context?.trip.id !== share.tripId) return undefined;
    await this.pool.execute(
      `INSERT IGNORE INTO activity_votes (id, share_id, activity_id, user_id)
       VALUES (?, ?, ?, ?)`,
      [randomUUID(), share.id, activityId, userId]
    );
    const [rows] = await this.pool.execute(
      "SELECT COUNT(*) AS votes FROM activity_votes WHERE activity_id = ?",
      [activityId]
    );
    await this.pool.execute("UPDATE activities SET vote_count = ? WHERE id = ?", [rows[0].votes, activityId]);
    return rows[0].votes;
  }

  async listFavorites(userId) {
    const [rows] = await this.pool.execute(
      "SELECT id, user_id AS userId, activity_json, created_at AS createdAt FROM favorites WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    return rows.map((row) => ({ ...row, activity: parseJson(row.activity_json) }));
  }

  async addFavorite(userId, activityId) {
    const context = await this.findActivityContext(activityId);
    if (!context) return undefined;
    const id = randomUUID();
    await this.pool.execute(
      `INSERT INTO favorites (id, user_id, source_activity_id, activity_json)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE activity_json = VALUES(activity_json)`,
      [id, userId, activityId, json({ ...context.activity, isFavorite: true })]
    );
    const favorites = await this.listFavorites(userId);
    return favorites.find((item) => item.activity.id === activityId);
  }

  async deleteFavorite(userId, favoriteId) {
    const [result] = await this.pool.execute(
      "DELETE FROM favorites WHERE id = ? AND user_id = ?",
      [favoriteId, userId]
    );
    return result.affectedRows > 0;
  }
}
