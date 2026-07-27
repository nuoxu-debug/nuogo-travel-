import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { DemoPlanProvider } from "../src/providers/demoProvider.js";
import { MemoryRepository } from "../src/repositories/memory.js";
import { hashInvitationToken } from "../src/services/invitationTokens.js";
import { validPreferences, validVariant } from "./helpers.js";

describe("trip invitation and member API", () => {
  let app;
  let repository;
  let owner;
  let member;
  let unrelated;
  let tripId;

  async function register(name, email) {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ name, email, password: "Nuogo123!" })
      .expect(201);
    return {
      ...response.body.user,
      auth: { Authorization: `Bearer ${response.body.token}` }
    };
  }

  async function createInvitation(role = "editor") {
    return request(app)
      .post(`/api/trips/${tripId}/invitations`)
      .set(owner.auth)
      .send({ role })
      .expect(201);
  }

  async function acceptInvitation(user = member, role = "editor") {
    const created = await createInvitation(role);
    const accepted = await request(app)
      .post(`/api/invitations/${created.body.token}/accept`)
      .set(user.auth)
      .expect(200);
    return { created, accepted };
  }

  beforeEach(async () => {
    repository = new MemoryRepository();
    app = createApp({
      repository,
      planProvider: new DemoPlanProvider(),
      attractionCatalogue: { listApproved: () => [] },
      config: {
        jwtSecret: "test-secret-with-enough-length",
        demoMode: true,
        aiProvider: "demo",
        clientOrigin: "http://localhost:5173"
      }
    });

    owner = await register("Chen Owner", "owner@nuogo.test");
    member = await register("Li Member", "member@nuogo.test");
    unrelated = await register("Wang Stranger", "stranger@nuogo.test");
    const trip = await repository.createTrip(
      owner.id,
      validPreferences({ destination: "huangshan" }),
      [validVariant({
        tripId: "trip-collaboration",
        destination: "huangshan",
        title: { en: "Huangshan Together", zh: "\u9ec4\u5c71\u540c\u884c" }
      })]
    );
    tripId = trip.id;
  });

  it("lets an owner invite a signed-in editor and lists the active member", async () => {
    const created = await createInvitation();

    expect(created.body.url).toBe(`http://localhost:5173/invite/${created.body.token}`);
    expect(created.body.invitation).not.toHaveProperty("tokenHash");
    expect(JSON.stringify(created.body)).not.toContain("passwordHash");

    const preview = await request(app)
      .get(`/api/invitations/${created.body.token}`)
      .expect(200);
    expect(preview.body.invitation).toMatchObject({
      role: "editor",
      status: "pending",
      trip: {
        id: tripId,
        destination: "huangshan",
        startDate: "2026-08-10",
        endDate: "2026-08-13"
      },
      owner: { name: "Chen Owner" }
    });
    expect(JSON.stringify(preview.body)).not.toContain("tokenHash");
    expect(JSON.stringify(preview.body)).not.toContain("passwordHash");

    const accepted = await request(app)
      .post(`/api/invitations/${created.body.token}/accept`)
      .set(member.auth)
      .expect(200);
    expect(accepted.body).toMatchObject({
      tripId,
      membership: { userId: member.id, role: "editor", status: "active" }
    });

    const members = await request(app)
      .get(`/api/trips/${tripId}/members`)
      .set(owner.auth)
      .expect(200);
    expect(members.body.members).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: owner.id, role: "owner", status: "active" }),
      expect.objectContaining({ userId: member.id, role: "editor", status: "active" })
    ]));
    expect(JSON.stringify(members.body)).not.toContain("passwordHash");
  });

  it("does not let a viewer create invitations", async () => {
    await acceptInvitation(member, "viewer");

    const response = await request(app)
      .post(`/api/trips/${tripId}/invitations`)
      .set(member.auth)
      .send({ role: "editor" })
      .expect(403);

    expect(response.body.error.code).toBe("TRIP_OWNER_REQUIRED");
  });

  it("lets the owner change an editor to viewer and remove the member", async () => {
    const { accepted } = await acceptInvitation();
    const memberId = accepted.body.membership.id;

    const changed = await request(app)
      .patch(`/api/trips/${tripId}/members/${memberId}`)
      .set(owner.auth)
      .send({ role: "viewer" })
      .expect(200);
    expect(changed.body.member).toMatchObject({ id: memberId, role: "viewer", status: "active" });

    const removed = await request(app)
      .delete(`/api/trips/${tripId}/members/${memberId}`)
      .set(owner.auth)
      .expect(200);
    expect(removed.body.member).toMatchObject({ id: memberId, status: "removed" });

    const listed = await request(app)
      .get(`/api/trips/${tripId}/members`)
      .set(owner.auth)
      .expect(200);
    expect(listed.body.members.some(({ id }) => id === memberId)).toBe(false);

    const denied = await request(app)
      .get(`/api/trips/${tripId}/members`)
      .set(member.auth)
      .expect(403);
    expect(denied.body.error.code).toBe("TRIP_MEMBER_REQUIRED");
  });

  it("does not let the owner demote or remove their own membership", async () => {
    const ownerMembership = await repository.getMember(tripId, owner.id);

    const demote = await request(app)
      .patch(`/api/trips/${tripId}/members/${ownerMembership.id}`)
      .set(owner.auth)
      .send({ role: "viewer" })
      .expect(409);
    expect(demote.body.error.code).toBe("TRIP_OWNER_IMMUTABLE");

    const remove = await request(app)
      .delete(`/api/trips/${tripId}/members/${ownerMembership.id}`)
      .set(owner.auth)
      .expect(409);
    expect(remove.body.error.code).toBe("TRIP_OWNER_IMMUTABLE");
  });

  it.each([
    ["expired", "INVITATION_EXPIRED"],
    ["revoked", "INVITATION_REVOKED"]
  ])("returns %s invitation errors from inspection and acceptance", async (status, code) => {
    const created = await createInvitation();
    const stored = await repository.getInvitationByTokenHash(
      hashInvitationToken(created.body.token)
    );
    await repository.updateInvitation(stored.id, tripId, { status });

    const preview = await request(app)
      .get(`/api/invitations/${created.body.token}`)
      .expect(410);
    expect(preview.body.error.code).toBe(code);

    const acceptance = await request(app)
      .post(`/api/invitations/${created.body.token}/accept`)
      .set(member.auth)
      .expect(410);
    expect(acceptance.body.error.code).toBe(code);
  });

  it("treats repeat acceptance as idempotent but rejects a different account", async () => {
    const { created, accepted } = await acceptInvitation();

    const repeated = await request(app)
      .post(`/api/invitations/${created.body.token}/accept`)
      .set(member.auth)
      .expect(200);
    expect(repeated.body.membership.id).toBe(accepted.body.membership.id);

    const consumed = await request(app)
      .post(`/api/invitations/${created.body.token}/accept`)
      .set(unrelated.auth)
      .expect(409);
    expect(consumed.body.error.code).toBe("INVITATION_CONSUMED");
    expect(await repository.getMember(tripId, unrelated.id)).toBeUndefined();
  });

  it("does not let the owner accept an invitation to their own trip", async () => {
    const created = await createInvitation("editor");

    const response = await request(app)
      .post(`/api/invitations/${created.body.token}/accept`)
      .set(owner.auth)
      .expect(409);
    expect(response.body.error.code).toBe("TRIP_OWNER_IMMUTABLE");

    const ownerMembership = await repository.getMember(tripId, owner.id);
    expect(ownerMembership).toMatchObject({ role: "owner", status: "active" });
    expect(await repository.getInvitationByTokenHash(hashInvitationToken(created.body.token)))
      .toMatchObject({ status: "pending" });
  });

  it("lets an owner list and revoke invitations without exposing token hashes", async () => {
    const created = await createInvitation("viewer");
    const listed = await request(app)
      .get(`/api/trips/${tripId}/invitations`)
      .set(owner.auth)
      .expect(200);
    expect(listed.body.invitations).toEqual([
      expect.objectContaining({ id: created.body.invitation.id, role: "viewer", status: "pending" })
    ]);
    expect(JSON.stringify(listed.body)).not.toContain("tokenHash");

    const revoked = await request(app)
      .delete(`/api/trips/${tripId}/invitations/${created.body.invitation.id}`)
      .set(owner.auth)
      .expect(200);
    expect(revoked.body.invitation).toMatchObject({ status: "revoked" });
  });

  it("lets an authenticated invitee decline a pending invitation", async () => {
    const created = await createInvitation();

    const declined = await request(app)
      .post(`/api/invitations/${created.body.token}/decline`)
      .set(member.auth)
      .expect(200);
    expect(declined.body.invitation).toMatchObject({ status: "declined" });

    const preview = await request(app)
      .get(`/api/invitations/${created.body.token}`)
      .expect(409);
    expect(preview.body.error.code).toBe("INVITATION_CONSUMED");

    const repeatedDecline = await request(app)
      .post(`/api/invitations/${created.body.token}/decline`)
      .set(member.auth)
      .expect(409);
    expect(repeatedDecline.body.error.code).toBe("INVITATION_CONSUMED");

    const acceptance = await request(app)
      .post(`/api/invitations/${created.body.token}/accept`)
      .set(member.auth)
      .expect(409);
    expect(acceptance.body.error.code).toBe("INVITATION_CONSUMED");
  });

  it("denies member lists to unrelated users", async () => {
    const response = await request(app)
      .get(`/api/trips/${tripId}/members`)
      .set(unrelated.auth)
      .expect(403);
    expect(response.body.error.code).toBe("TRIP_MEMBER_REQUIRED");
  });

  it("returns the latest 50 activity records newest-first to active members only", async () => {
    await acceptInvitation();
    for (let index = 0; index < 55; index += 1) {
      await repository.appendTripActivity({
        tripId,
        actorUserId: owner.id,
        action: "test.recorded",
        entityType: "trip",
        entityId: tripId,
        summary: { index },
        createdAt: new Date(Date.UTC(2099, 6, 1, 0, index)).toISOString()
      });
    }

    const response = await request(app)
      .get(`/api/trips/${tripId}/activity-log`)
      .set(member.auth)
      .expect(200);
    expect(response.body.activities).toHaveLength(50);
    expect(response.body.activities[0]).toMatchObject({
      actorName: "Chen Owner",
      action: "test.recorded",
      entityType: "trip",
      entityId: tripId,
      summary: { index: 54 }
    });
    expect(response.body.activities.at(-1).summary).toEqual({ index: 5 });

    const denied = await request(app)
      .get(`/api/trips/${tripId}/activity-log`)
      .set(unrelated.auth)
      .expect(403);
    expect(denied.body.error.code).toBe("TRIP_MEMBER_REQUIRED");
  });
});
