import { randomUUID } from "node:crypto";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

export class MemoryRepository {
  constructor() {
    this.users = new Map();
    this.trips = new Map();
    this.shares = new Map();
    this.votes = new Map();
    this.favorites = new Map();
  }

  async createUser(user) {
    const record = {
      id: randomUUID(),
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
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

  async createTrip(ownerId, preferences, variants) {
    const id = variants[0]?.tripId ?? randomUUID();
    const normalizedVariants = variants.map((variant) => ({ ...clone(variant), tripId: id }));
    const first = normalizedVariants[0];
    const end = new Date(`${preferences.startDate}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + preferences.days - 1);
    const record = {
      id,
      ownerId,
      status: "draft",
      title: first.title,
      destination: preferences.destination,
      startDate: preferences.startDate,
      endDate: end.toISOString().slice(0, 10),
      totalBudget: preferences.totalBudget,
      preferences: clone(preferences),
      variants: normalizedVariants,
      selectedVariantId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.trips.set(id, record);
    return clone(record);
  }

  async listTrips(ownerId) {
    return clone([...this.trips.values()]
      .filter((trip) => trip.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  async getTrip(id) {
    return clone(this.trips.get(id));
  }

  async updateTrip(id, ownerId, patch) {
    const trip = this.trips.get(id);
    if (!trip || trip.ownerId !== ownerId) return undefined;
    Object.assign(trip, patch, { updatedAt: new Date().toISOString() });
    return clone(trip);
  }

  async deleteTrip(id, ownerId) {
    const trip = this.trips.get(id);
    if (!trip || trip.ownerId !== ownerId) return false;
    this.trips.delete(id);
    return true;
  }

  async duplicateTrip(id, ownerId) {
    const source = this.trips.get(id);
    if (!source || source.ownerId !== ownerId) return undefined;
    const tripId = randomUUID();
    const copy = clone(source);
    copy.id = tripId;
    copy.title = {
      en: `${source.title.en} copy`,
      zh: `${source.title.zh} 副本`
    };
    copy.status = "draft";
    copy.selectedVariantId = null;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
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
    this.trips.set(tripId, copy);
    return clone(copy);
  }

  async selectVariant(id, ownerId, variantId) {
    const trip = this.trips.get(id);
    if (!trip || trip.ownerId !== ownerId) return undefined;
    if (!trip.variants.some((variant) => variant.id === variantId)) return undefined;
    trip.selectedVariantId = variantId;
    trip.updatedAt = new Date().toISOString();
    return clone(trip);
  }

  async findActivityContext(activityId) {
    for (const trip of this.trips.values()) {
      for (const variant of trip.variants) {
        for (const day of variant.days) {
          const index = day.activities.findIndex((activity) => activity.id === activityId);
          if (index !== -1) return { trip, variant, day, index, activity: day.activities[index] };
        }
      }
    }
    return undefined;
  }

  async findDayContext(tripId, dayId) {
    const trip = this.trips.get(tripId);
    if (!trip) return undefined;
    for (const variant of trip.variants) {
      const day = variant.days.find((item) => item.id === dayId);
      if (day) return { trip, variant, day };
    }
    return undefined;
  }

  async addActivity(tripId, dayId, ownerId, activity) {
    const context = await this.findDayContext(tripId, dayId);
    if (!context || context.trip.ownerId !== ownerId) return undefined;
    context.day.activities.push(clone(activity));
    context.trip.updatedAt = new Date().toISOString();
    return clone({ ...context, activity });
  }

  async updateActivity(activityId, ownerId, patch) {
    const context = await this.findActivityContext(activityId);
    if (!context || context.trip.ownerId !== ownerId) return undefined;
    Object.assign(context.activity, clone(patch));
    context.trip.updatedAt = new Date().toISOString();
    return clone(context);
  }

  async deleteActivity(activityId, ownerId) {
    const context = await this.findActivityContext(activityId);
    if (!context || context.trip.ownerId !== ownerId) return undefined;
    const [activity] = context.day.activities.splice(context.index, 1);
    context.day.activities.forEach((item, index) => { item.order = index; });
    return clone({ ...context, activity });
  }

  async reorderDay(tripId, dayId, ownerId, activityIds) {
    const context = await this.findDayContext(tripId, dayId);
    if (!context || context.trip.ownerId !== ownerId) return undefined;
    const existing = new Map(context.day.activities.map((activity) => [activity.id, activity]));
    if (
      activityIds.length !== existing.size ||
      new Set(activityIds).size !== existing.size ||
      activityIds.some((id) => !existing.has(id))
    ) return null;
    context.day.activities = activityIds.map((id, order) => ({ ...existing.get(id), order }));
    return clone(context);
  }

  async replaceDay(tripId, dayId, ownerId, activities) {
    const context = await this.findDayContext(tripId, dayId);
    if (!context || context.trip.ownerId !== ownerId) return undefined;
    context.day.activities = clone(activities);
    return clone(context);
  }

  async createShare(tripId, ownerId, permission) {
    const trip = this.trips.get(tripId);
    if (!trip || trip.ownerId !== ownerId) return undefined;
    const share = {
      id: randomUUID(),
      token: randomUUID().replaceAll("-", ""),
      tripId,
      permission,
      createdAt: new Date().toISOString()
    };
    this.shares.set(share.token, share);
    return clone(share);
  }

  async getShare(token) {
    const share = this.shares.get(token);
    if (!share) return undefined;
    return { ...clone(share), trip: clone(this.trips.get(share.tripId)) };
  }

  async vote(token, activityId, userId) {
    const share = this.shares.get(token);
    const context = await this.findActivityContext(activityId);
    if (!share || share.permission !== "edit" || context?.trip.id !== share.tripId) return undefined;
    const key = `${token}:${activityId}:${userId}`;
    if (!this.votes.has(key)) {
      this.votes.set(key, { token, activityId, userId });
      context.activity.votes += 1;
    }
    return context.activity.votes;
  }

  async listFavorites(userId) {
    return clone([...this.favorites.values()].filter((item) => item.userId === userId));
  }

  async addFavorite(userId, activityId) {
    const context = await this.findActivityContext(activityId);
    if (!context) return undefined;
    const existing = [...this.favorites.values()]
      .find((item) => item.userId === userId && item.activity.id === activityId);
    if (existing) return clone(existing);
    const favorite = {
      id: randomUUID(),
      userId,
      activity: clone({ ...context.activity, isFavorite: true }),
      createdAt: new Date().toISOString()
    };
    this.favorites.set(favorite.id, favorite);
    context.activity.isFavorite = true;
    return clone(favorite);
  }

  async deleteFavorite(userId, favoriteId) {
    const favorite = this.favorites.get(favoriteId);
    if (!favorite || favorite.userId !== userId) return false;
    this.favorites.delete(favoriteId);
    return true;
  }
}
