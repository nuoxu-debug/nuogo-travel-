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
    this.members = new Map();
    this.invitations = new Map();
    this.expenses = new Map();
    this.tripActivity = new Map();
    this.tripMutationLocks = new Map();
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
      revision: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.trips.set(id, record);
    const joinedAt = new Date().toISOString();
    this.members.set(`${id}:${ownerId}`, {
      id: randomUUID(),
      tripId: id,
      userId: ownerId,
      role: "owner",
      status: "active",
      joinedAt
    });
    return clone(record);
  }

  async listTrips(userId) {
    return clone([...this.trips.values()]
      .filter((trip) => trip.ownerId === userId
        || this.members.get(`${trip.id}:${userId}`)?.status === "active")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
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
      const tripSnapshot = clone(trip);
      const activitySnapshot = clone([...this.tripActivity.entries()]
        .filter(([, activity]) => activity.tripId === tripId));
      const restoreActivity = () => {
        for (const [id, activity] of this.tripActivity) {
          if (activity.tripId === tripId) this.tripActivity.delete(id);
        }
        for (const [id, activity] of activitySnapshot) {
          this.tripActivity.set(id, activity);
        }
      };

      try {
        if (await mutation(trip) === false) {
          this.trips.set(tripId, tripSnapshot);
          restoreActivity();
          return undefined;
        }
        trip.revision = expectedRevision + 1;
        trip.updatedAt = new Date().toISOString();
        if (audit) {
          await this.appendTripActivity({
            ...audit,
            tripId,
            actorUserId
          });
        }
        return trip.revision;
      } catch (error) {
        this.trips.set(tripId, tripSnapshot);
        restoreActivity();
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
    for (const [key, member] of this.members) {
      if (member.tripId === id) this.members.delete(key);
    }
    for (const [invitationId, invitation] of this.invitations) {
      if (invitation.tripId === id) this.invitations.delete(invitationId);
    }
    for (const [expenseId, expense] of this.expenses) {
      if (expense.tripId === id) this.expenses.delete(expenseId);
    }
    for (const [activityId, activity] of this.tripActivity) {
      if (activity.tripId === id) this.tripActivity.delete(activityId);
    }
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
    copy.revision = 0;
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
    this.members.set(`${tripId}:${ownerId}`, {
      id: randomUUID(),
      tripId,
      userId: ownerId,
      role: "owner",
      status: "active",
      joinedAt: copy.createdAt
    });
    return clone(copy);
  }

  async selectVariant(id, actorId, variantId, expectedRevision, audit) {
    const trip = this.trips.get(id);
    if (!trip) return undefined;
    if (!trip.variants.some((variant) => variant.id === variantId)) return undefined;
    const revision = await this.mutateWithRevision(
      id,
      expectedRevision,
      actorId,
      audit,
      (current) => {
        current.selectedVariantId = variantId;
        return true;
      }
    );
    if (revision === undefined) return undefined;
    return this.getTrip(id);
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

  async addActivity(tripId, dayId, actorId, activity, expectedRevision, audit) {
    const context = await this.findDayContext(tripId, dayId);
    if (!context) return undefined;
    const revision = await this.mutateWithRevision(
      tripId,
      expectedRevision,
      actorId,
      audit,
      () => {
        context.day.activities.push(clone(activity));
        return true;
      }
    );
    if (revision === undefined) return undefined;
    return clone({ ...await this.findActivityContext(activity.id), revision });
  }

  async updateActivity(activityId, actorId, patch, expectedRevision, audit) {
    const context = await this.findActivityContext(activityId);
    if (!context) return undefined;
    const revision = await this.mutateWithRevision(
      context.trip.id,
      expectedRevision,
      actorId,
      audit,
      () => {
        Object.assign(context.activity, clone(patch));
        return true;
      }
    );
    if (revision === undefined) return undefined;
    return clone({ ...await this.findActivityContext(activityId), revision });
  }

  async deleteActivity(activityId, actorId, expectedRevision, audit) {
    const context = await this.findActivityContext(activityId);
    if (!context) return undefined;
    let activity;
    const revision = await this.mutateWithRevision(
      context.trip.id,
      expectedRevision,
      actorId,
      audit,
      () => {
        [activity] = context.day.activities.splice(context.index, 1);
        context.day.activities.forEach((item, index) => { item.order = index; });
        return true;
      }
    );
    if (revision === undefined) return undefined;
    return clone({
      ...await this.findDayContext(context.trip.id, context.day.id),
      activity,
      revision
    });
  }

  async reorderDay(tripId, dayId, actorId, activityIds, expectedRevision, audit) {
    const context = await this.findDayContext(tripId, dayId);
    if (!context) return undefined;
    const existing = new Map(context.day.activities.map((activity) => [activity.id, activity]));
    if (
      activityIds.length !== existing.size ||
      new Set(activityIds).size !== existing.size ||
      activityIds.some((id) => !existing.has(id))
    ) return null;
    const revision = await this.mutateWithRevision(
      tripId,
      expectedRevision,
      actorId,
      audit,
      () => {
        context.day.activities = activityIds.map((id, order) => ({ ...existing.get(id), order }));
        return true;
      }
    );
    if (revision === undefined) return undefined;
    return clone({ ...await this.findDayContext(tripId, dayId), revision });
  }

  async replaceDay(tripId, dayId, actorId, activities, expectedRevision, audit) {
    const context = await this.findDayContext(tripId, dayId);
    if (!context) return undefined;
    const revision = await this.mutateWithRevision(
      tripId,
      expectedRevision,
      actorId,
      audit,
      () => {
        context.day.activities = clone(activities);
        return true;
      }
    );
    if (revision === undefined) return undefined;
    return clone({ ...await this.findDayContext(tripId, dayId), revision });
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

  async getMember(tripId, userId) {
    const member = this.members.get(`${tripId}:${userId}`);
    if (!member) return undefined;
    return clone({
      ...member,
      name: this.users.get(member.userId)?.name
    });
  }

  async listMembers(tripId) {
    const members = [...this.members.values()]
      .filter((member) => member.tripId === tripId)
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
    return clone(members.map((member) => ({
      ...member,
      name: this.users.get(member.userId)?.name
    })));
  }

  async createInvitation(input) {
    const now = new Date().toISOString();
    const invitation = {
      id: input.id ?? randomUUID(),
      tripId: input.tripId,
      tokenHash: input.tokenHash,
      role: input.role,
      status: input.status ?? "pending",
      invitedByUserId: input.invitedByUserId,
      expiresAt: input.expiresAt,
      createdAt: input.createdAt ?? now,
      ...(input.acceptedByUserId ? { acceptedByUserId: input.acceptedByUserId } : {}),
      ...(input.acceptedAt ? { acceptedAt: input.acceptedAt } : {})
    };
    this.invitations.set(invitation.id, invitation);
    return clone(invitation);
  }

  async getInvitationByTokenHash(tokenHash) {
    return clone([...this.invitations.values()]
      .find((invitation) => invitation.tokenHash === tokenHash));
  }

  async listInvitations(tripId) {
    return clone([...this.invitations.values()]
      .filter((invitation) => invitation.tripId === tripId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  async updateInvitation(invitationId, tripId, patch, options = {}) {
    const invitation = this.invitations.get(invitationId);
    if (!invitation || invitation.tripId !== tripId) return undefined;
    if (options.expectedStatuses
      && !options.expectedStatuses.includes(invitation.status)) return undefined;
    if (options.requireUnexpired
      && Date.parse(invitation.expiresAt) <= Date.now()) return undefined;
    for (const field of ["role", "status", "acceptedByUserId", "expiresAt", "acceptedAt"]) {
      if (Object.hasOwn(patch, field)) invitation[field] = clone(patch[field]);
    }
    return clone(invitation);
  }

  async acceptInvitation(invitationId, userId) {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) return undefined;
    if (this.trips.get(invitation.tripId)?.ownerId === userId) return undefined;
    if (invitation.status === "accepted") {
      if (invitation.acceptedByUserId !== userId) return undefined;
      const existing = await this.getMember(invitation.tripId, userId);
      return existing?.status === "active" ? existing : undefined;
    }
    if (invitation.status !== "pending") return undefined;
    if (Date.parse(invitation.expiresAt) <= Date.now()) {
      invitation.status = "expired";
      return undefined;
    }

    const key = `${invitation.tripId}:${userId}`;
    const now = new Date().toISOString();
    const existing = this.members.get(key);
    const member = {
      id: existing?.id ?? randomUUID(),
      tripId: invitation.tripId,
      userId,
      role: invitation.role,
      status: "active",
      joinedAt: existing?.joinedAt ?? now
    };
    this.members.set(key, member);
    Object.assign(invitation, {
      status: "accepted",
      acceptedByUserId: userId,
      acceptedAt: now
    });
    return this.getMember(invitation.tripId, userId);
  }

  async updateMember(tripId, memberId, role) {
    const entry = [...this.members.entries()]
      .find(([, member]) => member.tripId === tripId && member.id === memberId);
    if (!entry) return undefined;
    entry[1].role = role;
    return this.getMember(tripId, entry[1].userId);
  }

  async removeMember(tripId, memberId) {
    const entry = [...this.members.entries()]
      .find(([, member]) => member.tripId === tripId && member.id === memberId);
    if (!entry) return undefined;
    entry[1].status = "removed";
    entry[1].removedAt = new Date().toISOString();
    return this.getMember(tripId, entry[1].userId);
  }

  async listExpenses(tripId) {
    const expenses = [...this.expenses.values()]
      .filter((expense) => expense.tripId === tripId)
      .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)
        || b.createdAt.localeCompare(a.createdAt));
    return clone(expenses.map((expense) => this.hydrateExpense(expense)));
  }

  async getExpense(tripId, expenseId) {
    const expense = this.expenses.get(expenseId);
    return expense?.tripId === tripId ? clone(this.hydrateExpense(expense)) : undefined;
  }

  async createExpense(input, allocations) {
    const now = new Date().toISOString();
    const expense = {
      ...clone(input),
      id: input.id ?? randomUUID(),
      participants: allocations.map(({ userId, shareFen }) => ({ userId, shareFen })),
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now
    };
    this.expenses.set(expense.id, expense);
    return this.getExpense(expense.tripId, expense.id);
  }

  async updateExpense(expenseId, input, allocations) {
    const expense = this.expenses.get(expenseId);
    if (!expense) return undefined;
    Object.assign(expense, {
      description: input.description,
      category: input.category,
      amountFen: input.amountFen,
      expenseDate: input.expenseDate,
      paidByUserId: input.paidByUserId,
      note: input.note,
      participants: allocations.map(({ userId, shareFen }) => ({ userId, shareFen })),
      updatedAt: new Date().toISOString()
    });
    return this.getExpense(expense.tripId, expenseId);
  }

  async deleteExpense(tripId, expenseId) {
    const expense = this.expenses.get(expenseId);
    if (!expense || expense.tripId !== tripId) return false;
    return this.expenses.delete(expenseId);
  }

  async appendTripActivity(input) {
    const activity = {
      ...clone(input),
      id: input.id ?? randomUUID(),
      createdAt: input.createdAt ?? new Date().toISOString()
    };
    this.tripActivity.set(activity.id, activity);
    return clone({
      ...activity,
      actorName: this.users.get(activity.actorUserId)?.name
    });
  }

  async listTripActivity(tripId, limit) {
    return clone([...this.tripActivity.values()]
      .filter((activity) => activity.tripId === tripId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((activity) => ({
        ...activity,
        actorName: this.users.get(activity.actorUserId)?.name
      })));
  }

  async incrementTripRevision(tripId, expectedRevision) {
    const trip = this.trips.get(tripId);
    if (!trip || trip.revision !== expectedRevision) return undefined;
    trip.revision += 1;
    trip.updatedAt = new Date().toISOString();
    return trip.revision;
  }

  hydrateExpense(expense) {
    return {
      ...expense,
      paidByName: this.users.get(expense.paidByUserId)?.name,
      createdByName: this.users.get(expense.createdByUserId)?.name,
      participants: expense.participants.map((participant) => ({
        ...participant,
        name: this.users.get(participant.userId)?.name
      }))
    };
  }
}
