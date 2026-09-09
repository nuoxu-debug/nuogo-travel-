import { randomUUID } from "node:crypto";
import { buildObjectiveRuns, validateItineraryRun } from "./objectiveRecords.js";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

export class MemoryRepository {
  constructor() {
    this.users = new Map();
    this.trips = new Map();
    this.tripMutationLocks = new Map();
    this.privacyConsents = new Map();
    this.supportedDestinations = new Map([
      ["singapore", { id: "singapore", status: "ACTIVE" }]
    ]);
    this.canonicalPois = new Map();
    this.routeCache = new Map();
    this.costReferences = new Map();
    this.itineraryRuns = new Map();
    this.systemRecords = [];
  }

  async createUser(user) {
    const record = {
      id: randomUUID(),
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      preferredLanguage: user.preferredLanguage ?? "zh",
      accountType: user.accountType ?? "REGISTERED",
      guestLastActivityAt: user.guestLastActivityAt ?? null,
      guestExpiresAt: user.guestExpiresAt ?? null,
      role: user.role ?? "user",
      status: user.status ?? "ACTIVE",
      createdAt: new Date().toISOString()
    };
    this.users.set(record.id, record);
    return clone(record);
  }

  async findUserByEmail(email) {
    return clone([...this.users.values()].find((user) => user.email === email));
  }

  async findUserById(id) {
    return clone(this.users.get(id));
  }

  async touchGuestSession(id) {
    const user = this.users.get(id);
    if (!user || user.accountType !== "GUEST") return undefined;
    user.guestLastActivityAt = new Date().toISOString();
    user.guestExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    for (const trip of this.trips.values()) {
      if (trip.ownerId === id && trip.persistenceScope === "SESSION") trip.expiresAt = user.guestExpiresAt;
    }
    return clone(user);
  }

  async updateUserProfile(id, patch) {
    const user = this.users.get(id);
    if (!user) return undefined;
    if (patch.name !== undefined) user.name = patch.name;
    if (patch.preferredLanguage !== undefined) {
      user.preferredLanguage = patch.preferredLanguage;
    }
    return clone(user);
  }

  async updateUserPassword(id, passwordHash) {
    const user = this.users.get(id);
    if (!user) return false;
    user.passwordHash = passwordHash;
    return true;
  }

  async getUserRole(userId) {
    return this.users.get(userId)?.role;
  }

  async setUserRole(userId, role) {
    const user = this.users.get(userId);
    if (!user || !["user", "admin"].includes(role)) return false;
    user.role = role;
    return true;
  }

  async listSupportedDestinations() {
    return clone([...this.supportedDestinations.values()]);
  }

  async setDestinationStatus(destinationId, status) {
    const destination = this.supportedDestinations.get(destinationId);
    if (!destination) return undefined;
    destination.status = status;
    return clone(destination);
  }

  async upsertCanonicalPoi(poi) {
    this.canonicalPois.set(poi.id, clone(poi));
    return clone(poi);
  }

  async listCanonicalPois(destinationId) {
    return clone([...this.canonicalPois.values()]
      .filter((poi) => poi.destinationId === destinationId));
  }

  async putRouteCache(key, route) {
    this.routeCache.set(key, clone(route));
    return clone(route);
  }

  async getRouteCache(key) {
    return clone(this.routeCache.get(key));
  }

  async upsertCostReference(reference) {
    const record = { ...reference, tier: reference.tier ?? null };
    this.costReferences.set(record.id, clone(record));
    return clone(record);
  }

  async listUsers() {
    return clone([...this.users.values()].map(({ passwordHash: _passwordHash, ...user }) => user));
  }

  async setUserStatus(userId, status) {
    const user = this.users.get(userId);
    if (!user || !["ACTIVE", "SUSPENDED"].includes(status)) return undefined;
    user.status = status;
    const { passwordHash: _passwordHash, ...publicRecord } = user;
    return clone(publicRecord);
  }

  async appendSystemRecord(record) {
    const saved = { id: randomUUID(), ...clone(record), createdAt: new Date().toISOString() };
    this.systemRecords.unshift(saved);
    return clone(saved);
  }

  async listSystemRecords(limit = 100) {
    return clone(this.systemRecords.slice(0, limit));
  }

  async listCostReferences(city) {
    return clone([...this.costReferences.values()]
      .filter((reference) => reference.city === city)
      .map((reference) => ({ ...reference, tier: reference.tier ?? null })));
  }

  async saveItineraryRun(run) {
    validateItineraryRun(run);
    this.itineraryRuns.set(run.id, clone(run));
    return clone(run);
  }

  async saveObjectiveTrip(ownerId, result) {
    const runs = buildObjectiveRuns(result);
    const now = new Date().toISOString();
    const owner = this.users.get(ownerId);
    const sessionOnly = owner?.accountType === "GUEST";
    const trip = {
      ...clone(result.trip),
      ownerId,
      status: "draft",
      title: result.trip.title ?? `${result.trip.destination} journey`,
      preferences: clone(result.trip.preferences ?? {}),
      ...(result.itineraryRun
        ? { itineraryRun: clone(result.itineraryRun) }
        : { variants: clone(result.variants) }),
      validation: clone(result.validation),
      generationState: result.state,
      differentiationDiagnostics: clone(result.differentiationDiagnostics ?? []),
      differentiationPairs: clone(result.differentiationPairs ?? []),
      objectiveAligned: true,
      selectedVariantId: null,
      persistenceScope: result.persistenceScope ?? (sessionOnly ? "SESSION" : "PERSISTENT"),
      expiresAt: result.expiresAt ?? (sessionOnly ? owner.guestExpiresAt : null),
      guestClaimTokenHash: result.guestClaimTokenHash ?? null,
      revision: 0,
      createdAt: now,
      updatedAt: now
    };
    this.trips.set(trip.id, trip);
    for (const run of runs) this.itineraryRuns.set(run.id, clone(run));
    return clone(trip);
  }

  async getItineraryRun(id) {
    return clone(this.itineraryRuns.get(id));
  }

  async recordPrivacyConsent(userId, input) {
    if (!this.users.has(userId)) return undefined;
    const consent = {
      userId,
      type: input.type ?? "GENERAL",
      accepted: input.accepted,
      version: input.version,
      recordedAt: new Date().toISOString()
    };
    this.privacyConsents.set(`${userId}:${consent.type}`, consent);
    return clone(consent);
  }

  async deleteAccount(userId) {
    if (!this.users.has(userId)) return false;
    const ownedTripIds = new Set([...this.trips.values()]
      .filter((trip) => trip.ownerId === userId)
      .map((trip) => trip.id));
    const keep = (map, predicate) => new Map([...map].filter(([, value]) => !predicate(value)));

    const next = {
      users: keep(this.users, (user) => user.id === userId),
      trips: keep(this.trips, (trip) => ownedTripIds.has(trip.id)),
      privacyConsents: keep(this.privacyConsents, (consent) => consent.userId === userId),
      itineraryRuns: keep(this.itineraryRuns, (run) => ownedTripIds.has(run.tripId))
    };
    Object.assign(this, next);
    return true;
  }

  async listTrips(userId) {
    if (this.users.get(userId)?.accountType === "GUEST") return [];
    return clone([...this.trips.values()]
      .filter((trip) => trip.ownerId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  async claimGuestTrip(id, newOwnerId, claimTokenHash) {
    const trip = this.trips.get(id);
    const newOwner = this.users.get(newOwnerId);
    if (
      !trip
      || !newOwner
      || newOwner.accountType === "GUEST"
      || trip.persistenceScope !== "SESSION"
      || trip.guestClaimTokenHash !== claimTokenHash
      || !trip.expiresAt
      || Date.parse(trip.expiresAt) <= Date.now()
    ) return undefined;
    trip.ownerId = newOwnerId;
    trip.persistenceScope = "PERSISTENT";
    trip.expiresAt = null;
    trip.guestClaimTokenHash = null;
    trip.updatedAt = new Date().toISOString();
    return clone(trip);
  }

  async getTrip(id) {
    return clone(this.trips.get(id));
  }

  async mutateWithRevision(tripId, expectedRevision, actorUserId, audit, mutation) {
    const previous = this.tripMutationLocks.get(tripId) ?? Promise.resolve();
    let release;
    const current = new Promise((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    this.tripMutationLocks.set(tripId, tail);
    await previous;

    try {
      const trip = this.trips.get(tripId);
      if (!trip || trip.revision !== expectedRevision) return undefined;
      if (trip.ownerId !== actorUserId) return undefined;
      const tripSnapshot = clone(trip);

      try {
        if (await mutation(trip) === false) {
          this.trips.set(tripId, tripSnapshot);
          return undefined;
        }
        trip.revision = expectedRevision + 1;
        trip.updatedAt = new Date().toISOString();
        return trip.revision;
      } catch (error) {
        this.trips.set(tripId, tripSnapshot);
        throw error;
      }
    } finally {
      release();
      if (this.tripMutationLocks.get(tripId) === tail) {
        this.tripMutationLocks.delete(tripId);
      }
    }
  }

  async updateTrip(id, actorId, patch, expectedRevision, audit) {
    const trip = this.trips.get(id);
    if (!trip) return undefined;
    const revision = await this.mutateWithRevision(
      id,
      expectedRevision,
      actorId,
      audit,
      (current) => {
        Object.assign(current, clone(patch));
        return true;
      }
    );
    if (revision === undefined) return undefined;
    return this.getTrip(id);
  }

  async deleteTrip(id, ownerId) {
    const trip = this.trips.get(id);
    if (!trip || trip.ownerId !== ownerId) return false;
    this.trips.delete(id);
    this.itineraryRuns = new Map([...this.itineraryRuns]
      .filter(([, run]) => run.tripId !== id));
    return true;
  }

  async duplicateTrip(id, ownerId) {
    const source = this.trips.get(id);
    if (!source || source.ownerId !== ownerId) return undefined;
    const tripId = randomUUID();
    const copy = clone(source);
    copy.id = tripId;
    copy.parentTripId = source.id;
    copy.title = typeof source.title === "string"
      ? `${source.title} copy`
      : { en: `${source.title.en} copy`, zh: `${source.title.zh} 副本` };
    copy.status = "draft";
    copy.selectedVariantId = null;
    copy.revision = 0;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    if (source.itineraryRun) {
      copy.itineraryRun = clone(source.itineraryRun);
    } else if (source.objectiveAligned) {
      copy.variants = clone(source.variants);
    } else {
      copy.variants = copy.variants.map((variant) => ({
        ...variant,
        id: randomUUID(),
        tripId,
        days: variant.days.map((day) => ({
          ...day,
          id: randomUUID(),
          activities: day.activities.map((activity) => ({ ...activity, id: randomUUID() }))
        }))
      }));
    }
    this.trips.set(tripId, copy);
    return clone(copy);
  }

  async selectObjectiveVariant(id, actorId, variantId, expectedRevision, audit) {
    const trip = this.trips.get(id);
    if (!trip?.objectiveAligned) return undefined;
    if (!trip.variants?.some((variant) => (variant.itinerary?.travelStyle ?? variant.itinerary?.variant) === variantId)) return undefined;
    const revision = await this.mutateWithRevision(
      id, expectedRevision, actorId, audit,
      (current) => { current.selectedVariantId = variantId; return true; }
    );
    return revision === undefined ? undefined : this.getTrip(id);
  }

  async updateObjectiveVariant(id, actorId, variant, expectedRevision) {
    const trip = this.trips.get(id);
    if (!trip?.objectiveAligned) return undefined;
    const profile = variant.itinerary?.travelStyle ?? variant.itinerary?.variant;
    if (trip.itineraryRun) {
      if ((trip.itineraryRun.itinerary?.travelStyle ?? trip.itineraryRun.itinerary?.variant) !== profile) return undefined;
      const revision = await this.mutateWithRevision(
        id, expectedRevision, actorId, undefined,
        (current) => {
          current.itineraryRun = clone(variant);
          current.validation = clone(variant.validation);
          current.generationState = variant.validation?.valid ? "FINAL_VALIDATED" : "FAILED";
          return true;
        }
      );
      return revision === undefined ? undefined : this.getTrip(id);
    }
    const variantIndex = trip.variants.findIndex(({ itinerary }) => (itinerary?.travelStyle ?? itinerary?.variant) === profile);
    if (variantIndex < 0) return undefined;
    const revision = await this.mutateWithRevision(
      id,
      expectedRevision,
      actorId,
      undefined,
      (current) => {
        current.variants[variantIndex] = clone(variant);
        current.validation = {
          valid: current.variants.every((item) => item.validation?.valid),
          issues: current.variants.flatMap((item) => item.validation?.issues ?? [])
        };
        current.generationState = current.validation.valid ? "FINAL_VALIDATED" : "FAILED";
        return true;
      }
    );
    return revision === undefined ? undefined : this.getTrip(id);
  }

}
