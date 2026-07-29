import { describe, expect, it, vi } from "vitest";
import {
  tripExpenseSchema,
  tripInvitationSchema,
  tripMemberSchema
} from "@nuogo/shared/schemas";
import { MemoryRepository } from "../src/repositories/memory.js";
import { MySqlRepository } from "../src/repositories/mysql.js";
import { validActivity, validVariant, validVisitDetails } from "./helpers.js";

const requiredMethods = [
  "createUser", "findUserByEmail", "findUserById", "createTrip", "listTrips",
  "getTrip", "updateTrip", "deleteTrip", "duplicateTrip", "selectVariant",
  "findActivityContext", "findDayContext", "addActivity", "updateActivity",
  "deleteActivity", "reorderDay", "replaceDay", "createShare", "getShare",
  "vote", "listFavorites", "addFavorite", "deleteFavorite", "getMember",
  "listMembers", "createInvitation", "getInvitationByTokenHash",
  "listInvitations", "updateInvitation", "acceptInvitation", "updateMember",
  "removeMember", "listExpenses", "getExpense", "createExpense",
  "updateExpense", "deleteExpense", "appendTripActivity", "listTripActivity",
  "incrementTripRevision"
];

describe("repository adapters", () => {
  it("expose the same controller-facing method contract", () => {
    for (const method of requiredMethods) {
      expect(typeof MemoryRepository.prototype[method]).toBe("function");
      expect(typeof MySqlRepository.prototype[method]).toBe("function");
    }
  });

  it("stores one accepted membership per user and trip", async () => {
    const repository = new MemoryRepository();
    const owner = await repository.createUser({
      name: "Owner",
      email: "owner@example.com",
      passwordHash: "hash"
    });
    const member = await repository.createUser({
      name: "Member",
      email: "member@example.com",
      passwordHash: "hash"
    });
    repository.trips.set("trip-1", {
      id: "trip-1",
      ownerId: owner.id,
      revision: 0,
      variants: []
    });
    const invitation = await repository.createInvitation({
      id: "invite-1",
      tripId: "trip-1",
      token: "plain-invitation-token",
      tokenHash: "a".repeat(64),
      role: "editor",
      status: "pending",
      invitedByUserId: owner.id,
      expiresAt: "2099-01-01T00:00:00.000Z"
    });
    expect(invitation).not.toHaveProperty("token");
    await repository.acceptInvitation(invitation.id, member.id);
    await repository.acceptInvitation(invitation.id, member.id);
    expect((await repository.listMembers("trip-1"))
      .filter(({ userId }) => userId === member.id)).toHaveLength(1);
  });

  it("ignores plain tokens and identity fields when updating a memory invitation", async () => {
    const repository = new MemoryRepository();
    await repository.createInvitation({
      id: "invite-1",
      tripId: "trip-1",
      tokenHash: "a".repeat(64),
      role: "editor",
      status: "pending",
      invitedByUserId: "owner-1",
      expiresAt: "2099-01-01T00:00:00.000Z",
      createdAt: "2026-08-01T00:00:00.000Z"
    });

    const updated = await repository.updateInvitation("invite-1", "trip-1", {
      role: "viewer",
      status: "accepted",
      acceptedByUserId: "member-1",
      expiresAt: "2099-02-01T00:00:00.000Z",
      acceptedAt: "2026-08-02T00:00:00.000Z",
      id: "invite-2",
      tripId: "trip-2",
      token: "plain-invitation-token",
      tokenHash: "b".repeat(64),
      invitedByUserId: "attacker-1",
      createdAt: "2026-08-03T00:00:00.000Z"
    });

    expect(updated).toMatchObject({
      id: "invite-1",
      tripId: "trip-1",
      tokenHash: "a".repeat(64),
      role: "viewer",
      status: "accepted",
      invitedByUserId: "owner-1",
      expiresAt: "2099-02-01T00:00:00.000Z",
      acceptedByUserId: "member-1",
      acceptedAt: "2026-08-02T00:00:00.000Z",
      createdAt: "2026-08-01T00:00:00.000Z"
    });
    expect(updated).not.toHaveProperty("token");
    await expect(repository.getInvitationByTokenHash("b".repeat(64))).resolves.toBeUndefined();
  });

  it("rejects a consumed memory invitation for a different user", async () => {
    const repository = new MemoryRepository();
    const firstUser = await repository.createUser({
      name: "First Member",
      email: "first@example.com",
      passwordHash: "hash"
    });
    const secondUser = await repository.createUser({
      name: "Second Member",
      email: "second@example.com",
      passwordHash: "hash"
    });
    const invitation = await repository.createInvitation({
      id: "invite-1",
      tripId: "trip-1",
      tokenHash: "a".repeat(64),
      role: "editor",
      status: "pending",
      invitedByUserId: "owner-1",
      expiresAt: "2099-01-01T00:00:00.000Z"
    });

    await repository.acceptInvitation(invitation.id, firstUser.id);
    await expect(repository.acceptInvitation(invitation.id, secondUser.id)).resolves.toBeUndefined();
    expect(await repository.getMember("trip-1", secondUser.id)).toBeUndefined();
    expect(await repository.getInvitationByTokenHash("a".repeat(64)))
      .toMatchObject({ status: "accepted", acceptedByUserId: firstUser.id });
  });

  it("does not let a memory invitation overwrite its trip owner membership", async () => {
    const repository = new MemoryRepository();
    repository.trips.set("trip-1", {
      id: "trip-1",
      ownerId: "owner-1",
      revision: 0,
      variants: []
    });
    repository.members.set("trip-1:owner-1", {
      id: "owner-member",
      tripId: "trip-1",
      userId: "owner-1",
      role: "owner",
      status: "active",
      joinedAt: "2026-08-01T00:00:00.000Z"
    });
    const invitation = await repository.createInvitation({
      id: "invite-1",
      tripId: "trip-1",
      tokenHash: "a".repeat(64),
      role: "editor",
      status: "pending",
      invitedByUserId: "owner-1",
      expiresAt: "2099-01-01T00:00:00.000Z"
    });

    await expect(repository.acceptInvitation(invitation.id, "owner-1"))
      .resolves.toBeUndefined();
    await expect(repository.getMember("trip-1", "owner-1")).resolves.toMatchObject({
      id: "owner-member",
      role: "owner",
      status: "active"
    });
    await expect(repository.getInvitationByTokenHash("a".repeat(64)))
      .resolves.toMatchObject({ status: "pending" });
  });

  it("conditionally transitions memory invitations without overwriting newer state", async () => {
    const repository = new MemoryRepository();
    await repository.createInvitation({
      id: "invite-1",
      tripId: "trip-1",
      tokenHash: "a".repeat(64),
      role: "editor",
      status: "accepted",
      invitedByUserId: "owner-1",
      expiresAt: "2099-01-01T00:00:00.000Z"
    });
    await repository.createInvitation({
      id: "invite-expired",
      tripId: "trip-1",
      tokenHash: "b".repeat(64),
      role: "viewer",
      status: "pending",
      invitedByUserId: "owner-1",
      expiresAt: "2000-01-01T00:00:00.000Z"
    });

    await expect(repository.updateInvitation(
      "invite-1",
      "trip-1",
      { status: "revoked" },
      { expectedStatuses: ["pending"], requireUnexpired: true }
    )).resolves.toBeUndefined();
    await expect(repository.getInvitationByTokenHash("a".repeat(64)))
      .resolves.toMatchObject({ status: "accepted" });

    await expect(repository.updateInvitation(
      "invite-expired",
      "trip-1",
      { status: "declined" },
      { expectedStatuses: ["pending"], requireUnexpired: true }
    )).resolves.toBeUndefined();
    await expect(repository.getInvitationByTokenHash("b".repeat(64)))
      .resolves.toMatchObject({ status: "pending" });
  });

  it("persists exact expense allocations", async () => {
    const repository = new MemoryRepository();
    repository.expenses = new Map();
    const expense = await repository.createExpense({
      id: "expense-1",
      tripId: "trip-1",
      description: "Dinner",
      category: "food",
      amountFen: 10000,
      expenseDate: "2026-08-10",
      paidByUserId: "user-1",
      createdByUserId: "user-1",
      note: ""
    }, [
      { userId: "user-1", shareFen: 5000 },
      { userId: "user-2", shareFen: 5000 }
    ]);
    expect(expense.participants.reduce((sum, item) => sum + item.shareFen, 0)).toBe(10000);
  });

  it("maps memory and MySQL expense responses to the strict shared contract", async () => {
    const memory = new MemoryRepository();
    memory.users.set("user-1", { id: "user-1", name: "Chen" });
    memory.users.set("user-2", { id: "user-2", name: "Li" });
    const memoryExpense = await memory.createExpense({
      id: "expense-memory",
      tripId: "trip-1",
      description: "Dinner",
      category: "food",
      amountFen: 10000,
      expenseDate: "2026-08-10",
      paidByUserId: "user-1",
      createdByUserId: "user-2",
      note: ""
    }, [
      { userId: "user-1", shareFen: 5000 },
      { userId: "user-2", shareFen: 5000 }
    ]);

    const mysql = new MySqlRepository({
      query: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (!sql.includes("FROM trip_expenses e")) throw new Error(`Unexpected SQL: ${sql}`);
        return [[{
          id: "expense-mysql",
          tripId: "trip-1",
          description: "Dinner",
          category: "food",
          amountFen: 10000,
          expenseDate: "2026-08-10",
          paidByUserId: "user-1",
          paidByName: "Chen",
          createdByUserId: "user-2",
          createdByName: "Li",
          note: "",
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
          participantUserId: "user-1",
          participantName: "Chen",
          participantShareFen: 10000
        }]];
      })
    });
    const mysqlExpense = await mysql.getExpense("trip-1", "expense-mysql");

    expect(tripExpenseSchema.parse(memoryExpense)).toMatchObject({
      paidByName: "Chen",
      createdByName: "Li"
    });
    expect(tripExpenseSchema.parse(mysqlExpense)).toMatchObject({
      paidByName: "Chen",
      createdByName: "Li",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z"
    });
  });

  it("normalizes MySQL driver Date expense timestamps and omits nullable timestamps", async () => {
    const createdAt = new Date("2026-08-01T01:02:03.004Z");
    const updatedAt = new Date("2026-08-02T05:06:07.008Z");
    const rows = [
      {
        id: "expense-dates",
        expenseDate: new Date("2026-08-10T00:00:00.000Z"),
        createdAt,
        updatedAt
      },
      {
        id: "expense-nullable-dates",
        expenseDate: "2026-08-11",
        createdAt: null,
        updatedAt: null
      }
    ];
    const repository = new MySqlRepository({
      query: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (!sql.includes("FROM trip_expenses e")) throw new Error(`Unexpected SQL: ${sql}`);
        const row = rows.shift();
        return [[{
          ...row,
          tripId: "trip-1",
          description: "Dinner",
          category: "food",
          amountFen: 10000,
          paidByUserId: "user-1",
          paidByName: "Chen",
          createdByUserId: "user-2",
          createdByName: "Li",
          note: "",
          participantUserId: "user-1",
          participantName: "Chen",
          participantShareFen: 10000
        }]];
      })
    });

    const datedExpense = await repository.getExpense("trip-1", "expense-dates");
    expect(tripExpenseSchema.parse(datedExpense)).toMatchObject({
      expenseDate: "2026-08-10",
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString()
    });

    const nullableExpense = await repository.getExpense(
      "trip-1",
      "expense-nullable-dates"
    );
    expect(nullableExpense).not.toHaveProperty("createdAt");
    expect(nullableExpense).not.toHaveProperty("updatedAt");
    expect(() => tripExpenseSchema.parse(nullableExpense)).not.toThrow();
  });

  it.each(["create", "update", "delete"])(
    "rolls back a memory expense %s when its audit write fails",
    async (operation) => {
      const repository = new MemoryRepository();
      repository.users.set("user-1", { id: "user-1", name: "Chen" });
      const input = {
        id: "expense-1",
        tripId: "trip-1",
        description: "Dinner",
        category: "food",
        amountFen: 10000,
        expenseDate: "2026-08-10",
        paidByUserId: "user-1",
        createdByUserId: "user-1",
        note: ""
      };
      const allocations = [{ userId: "user-1", shareFen: 10000 }];
      if (operation !== "create") {
        await repository.createExpense(input, allocations);
      }
      const before = await repository.listExpenses("trip-1");
      const failure = new Error("activity log insert failed");
      vi.spyOn(repository, "appendTripActivity").mockRejectedValue(failure);
      const audit = {
        action: `expense.${operation}d`,
        entityType: "expense",
        summary: { amountFen: 10000 }
      };

      const mutation = operation === "create"
        ? repository.createExpense(input, allocations, "user-1", audit)
        : operation === "update"
          ? repository.updateExpense("expense-1", {
              ...input,
              description: "Updated dinner"
            }, allocations, "user-1", audit)
          : repository.deleteExpense("trip-1", "expense-1", "user-1", audit);

      await expect(mutation).rejects.toBe(failure);
      expect(await repository.listExpenses("trip-1")).toEqual(before);
      expect(await repository.listTripActivity("trip-1", 50)).toEqual([]);
    }
  );

  it.each(["create", "update", "delete"])(
    "rolls back a MySQL expense %s when its audit insert fails",
    async (operation) => {
      const failure = new Error("activity log insert failed");
      const connection = {
        beginTransaction: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
        execute: vi.fn(async (sql) => {
          if (sql.includes("SELECT trip_id AS tripId")) {
            return [[{ tripId: "trip-1" }]];
          }
          if (sql.startsWith("INSERT INTO trip_activity_log")) throw failure;
          return [{ affectedRows: 1 }];
        })
      };
      const pool = {
        query: vi.fn(),
        getConnection: vi.fn(async () => connection),
        execute: vi.fn(async (sql) => {
          if (sql.startsWith("DELETE FROM trip_expenses")) return [{ affectedRows: 1 }];
          return [[]];
        })
      };
      const repository = new MySqlRepository(pool);
      const input = {
        id: "expense-1",
        tripId: "trip-1",
        description: "Dinner",
        category: "food",
        amountFen: 10000,
        expenseDate: "2026-08-10",
        paidByUserId: "user-1",
        createdByUserId: "user-1",
        note: ""
      };
      const allocations = [{ userId: "user-1", shareFen: 10000 }];
      const audit = {
        action: `expense.${operation}d`,
        entityType: "expense",
        summary: { amountFen: 10000 }
      };
      const mutation = operation === "create"
        ? repository.createExpense(input, allocations, "user-1", audit)
        : operation === "update"
          ? repository.updateExpense(
              "expense-1",
              input,
              allocations,
              "user-1",
              audit
            )
          : repository.deleteExpense("trip-1", "expense-1", "user-1", audit);

      await expect(mutation).rejects.toBe(failure);
      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.rollback).toHaveBeenCalledOnce();
      expect(connection.release).toHaveBeenCalledOnce();
    }
  );

  it("does not erase a concurrent successful memory expense during audit rollback", async () => {
    const repository = new MemoryRepository();
    repository.users.set("user-1", { id: "user-1", name: "Chen" });
    let signalFailureStarted;
    let releaseFailure;
    const failureStarted = new Promise((resolve) => {
      signalFailureStarted = resolve;
    });
    const failureReleased = new Promise((resolve) => {
      releaseFailure = resolve;
    });
    const failure = new Error("activity log insert failed");
    const appendTripActivity = repository.appendTripActivity.bind(repository);
    vi.spyOn(repository, "appendTripActivity").mockImplementation(async (activity) => {
      if (activity.action === "expense.failed") {
        signalFailureStarted();
        await failureReleased;
        throw failure;
      }
      return appendTripActivity(activity);
    });
    const input = {
      tripId: "trip-1",
      category: "food",
      amountFen: 10000,
      expenseDate: "2026-08-10",
      paidByUserId: "user-1",
      createdByUserId: "user-1",
      note: ""
    };
    const allocations = [{ userId: "user-1", shareFen: 10000 }];

    const failed = repository.createExpense({
      ...input,
      id: "expense-failed",
      description: "Failed dinner"
    }, allocations, "user-1", {
      action: "expense.failed",
      entityType: "expense",
      summary: {}
    });
    await Promise.race([
      failureStarted,
      new Promise((resolve) => setTimeout(resolve, 25))
    ]);
    await repository.appendTripActivity({
      tripId: "trip-1",
      actorUserId: "user-1",
      action: "member.joined",
      entityType: "member",
      entityId: "member-1",
      summary: {}
    });
    const succeeded = repository.createExpense({
      ...input,
      id: "expense-succeeded",
      description: "Successful dinner"
    }, allocations, "user-1", {
      action: "expense.created",
      entityType: "expense",
      summary: {}
    });
    releaseFailure();

    await expect(failed).rejects.toBe(failure);
    await expect(succeeded).resolves.toMatchObject({ id: "expense-succeeded" });
    expect(await repository.listExpenses("trip-1")).toEqual([
      expect.objectContaining({ id: "expense-succeeded" })
    ]);
    expect(await repository.listTripActivity("trip-1", 50)).toHaveLength(2);
    expect(await repository.listTripActivity("trip-1", 50)).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "member.joined", entityId: "member-1" }),
      expect.objectContaining({ action: "expense.created", entityId: "expense-succeeded" })
    ]));
  });

  it("looks up invitations by token hash without persisting the plain token", async () => {
    const execute = vi.fn(async (sql) => {
      if (sql.startsWith("INSERT INTO trip_invitations")) return [{ affectedRows: 1 }];
      return [[]];
    });
    const repository = new MySqlRepository({ execute, query: vi.fn() });
    await repository.createInvitation({
      id: "invite-1",
      tripId: "trip-1",
      token: "plain-invitation-token",
      tokenHash: "a".repeat(64),
      role: "editor",
      status: "pending",
      invitedByUserId: "user-1",
      expiresAt: "2099-01-01T00:00:00.000Z"
    });
    await repository.getInvitationByTokenHash("a".repeat(64));

    const statements = execute.mock.calls.map(([sql]) => sql).join("\n");
    const parameters = execute.mock.calls.flatMap(([, values = []]) => values);
    expect(statements).toContain("token_hash = ?");
    expect(statements).not.toMatch(/\btoken\b(?!_hash)/);
    expect(parameters).not.toContain("plain-invitation-token");
  });

  it("accepts a MySQL invitation in one parameterized transaction", async () => {
    const member = {
      id: "member-1",
      tripId: "trip-1",
      userId: "user-2",
      name: "Member",
      role: "editor",
      status: "active",
      joinedAt: "2026-08-01T00:00:00.000Z"
    };
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (sql.includes("FROM trip_invitations")) {
          return [[{
            id: "invite-1",
            tripId: "trip-1",
            role: "editor",
            status: "pending",
            acceptedByUserId: null,
            expiresAt: "2099-01-01T00:00:00.000Z",
            ownerId: "user-1"
          }]];
        }
        if (sql.startsWith("INSERT INTO trip_members")) return [{ affectedRows: 1 }];
        if (sql.startsWith("UPDATE trip_invitations")) return [{ affectedRows: 1 }];
        if (sql.includes("FROM trip_members m")) return [[member]];
        throw new Error(`Unexpected SQL: ${sql}`);
      })
    };
    const repository = new MySqlRepository({
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });

    await expect(repository.acceptInvitation("invite-1", "user-2")).resolves.toEqual(member);
    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
    expect(connection.execute).toHaveBeenCalledWith(
      expect.stringContaining("FOR UPDATE"),
      ["invite-1"]
    );
    expect(connection.execute).toHaveBeenCalledWith(
      expect.stringContaining("ON DUPLICATE KEY UPDATE"),
      [expect.any(String), "trip-1", "user-2", "editor"]
    );
    expect(connection.execute).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'accepted'"),
      ["user-2", "invite-1"]
    );
  });

  it("rolls back MySQL invitation acceptance when its status update fails", async () => {
    const failure = new Error("invitation update failed");
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (sql.includes("FROM trip_invitations")) {
          return [[{
            id: "invite-1",
            tripId: "trip-1",
            role: "editor",
            status: "pending",
            acceptedByUserId: null,
            expiresAt: "2099-01-01T00:00:00.000Z",
            ownerId: "user-1"
          }]];
        }
        if (sql.startsWith("INSERT INTO trip_members")) return [{ affectedRows: 1 }];
        if (sql.startsWith("UPDATE trip_invitations")) throw failure;
        throw new Error(`Unexpected SQL: ${sql}`);
      })
    };
    const repository = new MySqlRepository({
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });

    await expect(repository.acceptInvitation("invite-1", "user-2")).rejects.toBe(failure);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it("rejects an expired MySQL invitation after locking it", async () => {
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (sql.includes("FROM trip_invitations")) {
          return [[{
            id: "invite-1",
            tripId: "trip-1",
            role: "editor",
            status: "pending",
            acceptedByUserId: null,
            expiresAt: "2000-01-01T00:00:00.000Z",
            ownerId: "user-1"
          }]];
        }
        if (sql.startsWith("UPDATE trip_invitations")) return [{ affectedRows: 1 }];
        throw new Error(`Unexpected SQL: ${sql}`);
      })
    };
    const repository = new MySqlRepository({
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });

    await expect(repository.acceptInvitation("invite-1", "user-2"))
      .resolves.toBeUndefined();
    expect(connection.execute).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'expired'"),
      ["invite-1"]
    );
    expect(connection.execute.mock.calls.some(([sql]) =>
      sql.startsWith("INSERT INTO trip_members")
    )).toBe(false);
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
  });

  it("does not let a MySQL invitation overwrite its trip owner membership", async () => {
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (sql.includes("FROM trip_invitations")) {
          return [[{
            id: "invite-1",
            tripId: "trip-1",
            role: "editor",
            status: "pending",
            acceptedByUserId: null,
            expiresAt: "2099-01-01T00:00:00.000Z",
            ownerId: "owner-1"
          }]];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      })
    };
    const repository = new MySqlRepository({
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });

    await expect(repository.acceptInvitation("invite-1", "owner-1"))
      .resolves.toBeUndefined();
    expect(connection.execute.mock.calls.some(([sql]) =>
      sql.startsWith("INSERT INTO trip_members")
    )).toBe(false);
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
  });

  it("uses an atomic pending-and-unexpired condition for MySQL invitation transitions", async () => {
    const execute = vi.fn(async (sql) => {
      if (sql.startsWith("UPDATE trip_invitations")) return [{ affectedRows: 0 }];
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repository = new MySqlRepository({ execute, query: vi.fn() });

    await expect(repository.updateInvitation(
      "invite-1",
      "trip-1",
      { status: "revoked" },
      { expectedStatuses: ["pending"], requireUnexpired: true }
    )).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledWith(
      expect.stringMatching(/status IN \(\?\).*expires_at > CURRENT_TIMESTAMP/s),
      ["revoked", "invite-1", "trip-1", "pending"]
    );
  });

  it("normalizes nullable MySQL collaboration timestamps for shared schemas", async () => {
    const member = {
      id: "member-1",
      tripId: "trip-1",
      userId: "user-2",
      name: "Member",
      role: "viewer",
      status: "active",
      joinedAt: "2026-08-01T00:00:00.000Z",
      removedAt: null
    };
    const invitation = {
      id: "invite-1",
      tripId: "trip-1",
      role: "viewer",
      status: "pending",
      invitedByUserId: "owner-1",
      acceptedByUserId: null,
      expiresAt: "2099-01-01T00:00:00.000Z",
      createdAt: "2026-08-01T00:00:00.000Z",
      acceptedAt: null
    };
    const execute = vi.fn(async (sql) => {
      if (sql.includes("FROM trip_members m")) return [[member]];
      if (sql.includes("FROM trip_invitations")) return [[invitation]];
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repository = new MySqlRepository({ execute, query: vi.fn() });

    const mappedMember = await repository.getMember("trip-1", "user-2");
    const mappedInvitation = await repository.getInvitationByTokenHash("a".repeat(64));
    expect(mappedMember).not.toHaveProperty("removedAt");
    expect(mappedInvitation).not.toHaveProperty("acceptedByUserId");
    expect(mappedInvitation).not.toHaveProperty("acceptedAt");
    expect(() => tripMemberSchema.parse(mappedMember)).not.toThrow();
    expect(() => tripInvitationSchema.parse(mappedInvitation)).not.toThrow();
  });

  it("stores expense and participant amounts as integer fen", async () => {
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async () => [{ affectedRows: 1 }])
    };
    const repository = new MySqlRepository({
      execute: vi.fn(async () => [[]]),
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });
    await repository.createExpense({
      id: "expense-1",
      tripId: "trip-1",
      description: "Dinner",
      category: "food",
      amountFen: 10000,
      expenseDate: "2026-08-10",
      paidByUserId: "user-1",
      createdByUserId: "user-1",
      note: ""
    }, [
      { userId: "user-1", shareFen: 4000 },
      { userId: "user-2", shareFen: 6000 }
    ]);

    const expenseInsert = connection.execute.mock.calls
      .find(([sql]) => sql.startsWith("INSERT INTO trip_expenses"));
    const participantInserts = connection.execute.mock.calls
      .filter(([sql]) => sql.startsWith("INSERT INTO expense_participants"));
    expect(expenseInsert[0]).toContain("amount_fen");
    expect(expenseInsert[1]).toContain(10000);
    expect(participantInserts.map(([, values]) => values)).toEqual([
      ["expense-1", "user-1", 4000],
      ["expense-1", "user-2", 6000]
    ]);
  });

  it("replaces MySQL expense participants in one parameterized transaction", async () => {
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (sql.includes("SELECT trip_id AS tripId")) return [[{ tripId: "trip-1" }]];
        return [{ affectedRows: 1 }];
      })
    };
    const execute = vi.fn(async (sql) => {
      if (!sql.includes("FROM trip_expenses e")) throw new Error(`Unexpected SQL: ${sql}`);
      return [[
        {
          id: "expense-1",
          tripId: "trip-1",
          description: "Updated dinner",
          category: "food",
          amountFen: 12000,
          expenseDate: "2026-08-11",
          paidByUserId: "user-2",
          paidByName: "Payer",
          createdByUserId: "user-1",
          createdByName: "Creator",
          note: "Updated",
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-02T00:00:00.000Z",
          participantUserId: "user-2",
          participantName: "Payer",
          participantShareFen: 7000
        },
        {
          id: "expense-1",
          tripId: "trip-1",
          description: "Updated dinner",
          category: "food",
          amountFen: 12000,
          expenseDate: "2026-08-11",
          paidByUserId: "user-2",
          paidByName: "Payer",
          createdByUserId: "user-1",
          createdByName: "Creator",
          note: "Updated",
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-02T00:00:00.000Z",
          participantUserId: "user-3",
          participantName: "Guest",
          participantShareFen: 5000
        }
      ]];
    });
    const repository = new MySqlRepository({
      execute,
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });
    const input = {
      description: "Updated dinner",
      category: "food",
      amountFen: 12000,
      expenseDate: "2026-08-11",
      paidByUserId: "user-2",
      note: "Updated"
    };

    const expense = await repository.updateExpense("expense-1", input, [
      { userId: "user-2", shareFen: 7000 },
      { userId: "user-3", shareFen: 5000 }
    ]);

    expect(expense.participants).toEqual([
      { userId: "user-2", name: "Payer", shareFen: 7000 },
      { userId: "user-3", name: "Guest", shareFen: 5000 }
    ]);
    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
    expect(connection.execute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE trip_expenses"),
      ["Updated dinner", "food", 12000, "2026-08-11", "user-2", "Updated", "expense-1"]
    );
    expect(connection.execute).toHaveBeenCalledWith(
      "DELETE FROM expense_participants WHERE expense_id = ?",
      ["expense-1"]
    );
    const participantInserts = connection.execute.mock.calls
      .filter(([sql]) => sql.startsWith("INSERT INTO expense_participants"));
    expect(participantInserts.map(([, values]) => values)).toEqual([
      ["expense-1", "user-2", 7000],
      ["expense-1", "user-3", 5000]
    ]);
  });

  it("rolls back a MySQL expense update when participant replacement fails", async () => {
    const failure = new Error("participant insert failed");
    let participantInsertCount = 0;
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (sql.includes("SELECT trip_id AS tripId")) return [[{ tripId: "trip-1" }]];
        if (sql.startsWith("INSERT INTO expense_participants")) {
          participantInsertCount += 1;
          if (participantInsertCount === 2) throw failure;
        }
        return [{ affectedRows: 1 }];
      })
    };
    const execute = vi.fn();
    const repository = new MySqlRepository({
      execute,
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });

    await expect(repository.updateExpense("expense-1", {
      description: "Updated dinner",
      category: "food",
      amountFen: 12000,
      expenseDate: "2026-08-11",
      paidByUserId: "user-2",
      note: "Updated"
    }, [
      { userId: "user-2", shareFen: 7000 },
      { userId: "user-3", shareFen: 5000 }
    ])).rejects.toBe(failure);

    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
    expect(execute).not.toHaveBeenCalled();
  });

  it("increments a trip revision only from the expected revision", async () => {
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async () => [{ affectedRows: 1 }])
    };
    const repository = new MySqlRepository({
      execute: vi.fn(),
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });

    await expect(repository.incrementTripRevision("trip-1", 4)).resolves.toBe(5);
    expect(connection.execute).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = ? AND revision = ?"),
      ["trip-1", 4]
    );
  });

  it("returns undefined when the expected MySQL trip revision is stale", async () => {
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async () => [{ affectedRows: 0 }])
    };
    const repository = new MySqlRepository({
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });

    await expect(repository.incrementTripRevision("trip-1", 4)).resolves.toBeUndefined();
    expect(connection.execute).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = ? AND revision = ?"),
      ["trip-1", 4]
    );
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it("commits a MySQL activity update and revision increment together", async () => {
    const current = {
      trip: { id: "trip-1", ownerId: "owner-1", revision: 3 },
      variant: { id: "variant-1" },
      day: { id: "day-1" },
      activity: { id: "activity-1", estimatedCost: 200 }
    };
    const updated = {
      ...current,
      trip: { ...current.trip, revision: 4 },
      activity: { ...current.activity, estimatedCost: 420 }
    };
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (sql.startsWith("UPDATE trips")) return [{ affectedRows: 1 }];
        if (sql.startsWith("UPDATE activities")) return [{ affectedRows: 1 }];
        if (sql.startsWith("INSERT INTO trip_activity_log")) return [{ affectedRows: 1 }];
        throw new Error(`Unexpected SQL: ${sql}`);
      })
    };
    const repository = new MySqlRepository({
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });
    vi.spyOn(repository, "findActivityContext")
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(updated);

    const result = await repository.updateActivity(
      "activity-1",
      "editor-1",
      { estimatedCost: 420 },
      3,
      {
        action: "activity.updated",
        entityType: "activity",
        entityId: "activity-1",
        summary: { fields: ["estimatedCost"] }
      }
    );

    expect(result).toMatchObject({ revision: 4, activity: { estimatedCost: 420 } });
    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("revision = revision + 1"),
      ["trip-1", 3]
    );
    expect(connection.execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("UPDATE activities"),
      [420, "activity-1"]
    );
    expect(connection.execute).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("INSERT INTO trip_activity_log"),
      [
        expect.any(String),
        "trip-1",
        "editor-1",
        "activity.updated",
        "activity",
        "activity-1",
        JSON.stringify({ fields: ["estimatedCost"] })
      ]
    );
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
  });

  it("rolls back a MySQL revision when its activity write fails", async () => {
    const failure = new Error("activity update failed");
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (sql.startsWith("UPDATE trips")) return [{ affectedRows: 1 }];
        if (sql.startsWith("UPDATE activities")) throw failure;
        throw new Error(`Unexpected SQL: ${sql}`);
      })
    };
    const repository = new MySqlRepository({
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });
    vi.spyOn(repository, "findActivityContext").mockResolvedValue({
      trip: { id: "trip-1", ownerId: "owner-1", revision: 3 },
      variant: { id: "variant-1" },
      day: { id: "day-1" },
      activity: { id: "activity-1", estimatedCost: 200 }
    });

    await expect(repository.updateActivity(
      "activity-1",
      "editor-1",
      { estimatedCost: 420 },
      3
    )).rejects.toBe(failure);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it("rolls back a MySQL activity update when its audit write fails", async () => {
    const failure = new Error("activity log insert failed");
    const current = {
      trip: { id: "trip-1", ownerId: "owner-1", revision: 3 },
      variant: { id: "variant-1" },
      day: { id: "day-1" },
      activity: { id: "activity-1", estimatedCost: 200 }
    };
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (sql.startsWith("UPDATE trips")) return [{ affectedRows: 1 }];
        if (sql.startsWith("UPDATE activities")) return [{ affectedRows: 1 }];
        if (sql.startsWith("INSERT INTO trip_activity_log")) throw failure;
        throw new Error(`Unexpected SQL: ${sql}`);
      })
    };
    const repository = new MySqlRepository({
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });
    vi.spyOn(repository, "findActivityContext").mockResolvedValue(current);

    await expect(repository.updateActivity(
      "activity-1",
      "editor-1",
      { estimatedCost: 420 },
      3,
      {
        action: "activity.updated",
        entityType: "activity",
        entityId: "activity-1",
        summary: { fields: ["estimatedCost"] }
      }
    )).rejects.toBe(failure);

    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it("rolls back a memory activity update when its audit write fails", async () => {
    const repository = new MemoryRepository();
    const trip = {
      id: "trip-1",
      ownerId: "owner-1",
      revision: 0,
      updatedAt: "2026-08-01T00:00:00.000Z",
      variants: [validVariant({
        tripId: "trip-1",
        days: [{
          id: "day-1",
          dayNumber: 1,
          date: "2026-08-10",
          title: { en: "Day", zh: "第一天" },
          activities: [validActivity({
            id: "activity-1",
            estimatedCost: 200
          })]
        }]
      })]
    };
    repository.trips.set(trip.id, structuredClone(trip));
    const failure = new Error("activity log insert failed");
    vi.spyOn(repository, "appendTripActivity").mockRejectedValue(failure);

    await expect(repository.updateActivity(
      "activity-1",
      "editor-1",
      { estimatedCost: 420 },
      0,
      {
        action: "activity.updated",
        entityType: "activity",
        entityId: "activity-1",
        summary: { fields: ["estimatedCost"] }
      }
    )).rejects.toBe(failure);

    expect(await repository.getTrip("trip-1")).toMatchObject({ revision: 0 });
    expect((await repository.findActivityContext("activity-1")).activity.estimatedCost)
      .toBe(200);
    expect(await repository.listTripActivity("trip-1", 50)).toEqual([]);
  });

  it("allows exactly one concurrent memory mutation at the same expected revision", async () => {
    const repository = new MemoryRepository();
    repository.trips.set("trip-1", {
      id: "trip-1",
      ownerId: "owner-1",
      title: "Original",
      revision: 0,
      variants: []
    });

    const results = await Promise.all([
      repository.updateTrip("trip-1", "editor-1", { title: "First" }, 0),
      repository.updateTrip("trip-1", "editor-2", { title: "Second" }, 0)
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((result) => result === undefined)).toHaveLength(1);
    expect(await repository.getTrip("trip-1")).toMatchObject({ revision: 1 });
  });

  it("does not erase another trip's successful mutation or audit during memory rollback", async () => {
    const repository = new MemoryRepository();
    repository.trips.set("trip-1", {
      id: "trip-1",
      ownerId: "owner-1",
      title: "First trip",
      revision: 0,
      variants: []
    });
    repository.trips.set("trip-2", {
      id: "trip-2",
      ownerId: "owner-2",
      title: "Second trip",
      revision: 0,
      variants: []
    });
    let releaseFailure;
    let signalFailureStarted;
    const failureStarted = new Promise((resolve) => {
      signalFailureStarted = resolve;
    });
    const failureReleased = new Promise((resolve) => {
      releaseFailure = resolve;
    });
    const failure = new Error("trip mutation failed");

    const failedMutation = repository.mutateWithRevision(
      "trip-1",
      0,
      "editor-1",
      null,
      async (trip) => {
        trip.title = "Should roll back";
        signalFailureStarted();
        await failureReleased;
        throw failure;
      }
    );
    await failureStarted;

    await expect(repository.updateTrip(
      "trip-2",
      "editor-2",
      { title: "Committed" },
      0,
      {
        action: "trip.updated",
        entityType: "trip",
        entityId: "trip-2",
        summary: { fields: ["title"] }
      }
    )).resolves.toMatchObject({ title: "Committed", revision: 1 });

    releaseFailure();
    await expect(failedMutation).rejects.toBe(failure);

    expect(await repository.getTrip("trip-1")).toMatchObject({
      title: "First trip",
      revision: 0
    });
    expect(await repository.getTrip("trip-2")).toMatchObject({
      title: "Committed",
      revision: 1
    });
    expect(await repository.listTripActivity("trip-2", 50)).toMatchObject([{
      action: "trip.updated",
      entityId: "trip-2"
    }]);
  });

  it("commits a MySQL revision when an activity update already has the requested value", async () => {
    const context = {
      trip: { id: "trip-1", ownerId: "owner-1", revision: 3 },
      variant: { id: "variant-1" },
      day: { id: "day-1" },
      activity: { id: "activity-1", estimatedCost: 420 }
    };
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (sql.startsWith("UPDATE trips")) return [{ affectedRows: 1 }];
        if (sql.startsWith("UPDATE activities")) return [{ affectedRows: 0 }];
        throw new Error(`Unexpected SQL: ${sql}`);
      })
    };
    const repository = new MySqlRepository({
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });
    vi.spyOn(repository, "findActivityContext")
      .mockResolvedValueOnce(context)
      .mockResolvedValueOnce({
        ...context,
        trip: { ...context.trip, revision: 4 }
      });

    await expect(repository.updateActivity(
      "activity-1",
      "editor-1",
      { estimatedCost: 420 },
      3
    )).resolves.toMatchObject({ revision: 4 });
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
  });

  it("does not write a MySQL activity when the expected revision is stale", async () => {
    const connection = {
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
      execute: vi.fn(async (sql) => {
        if (sql.startsWith("UPDATE trips")) return [{ affectedRows: 0 }];
        throw new Error(`Unexpected SQL: ${sql}`);
      })
    };
    const repository = new MySqlRepository({
      getConnection: vi.fn(async () => connection),
      query: vi.fn()
    });
    vi.spyOn(repository, "findActivityContext").mockResolvedValue({
      trip: { id: "trip-1", ownerId: "owner-1", revision: 4 },
      variant: { id: "variant-1" },
      day: { id: "day-1" },
      activity: { id: "activity-1", estimatedCost: 200 }
    });

    await expect(repository.updateActivity(
      "activity-1",
      "editor-1",
      { estimatedCost: 420 },
      3
    )).resolves.toBeUndefined();
    expect(connection.execute).toHaveBeenCalledTimes(1);
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it("persists grounded activity provenance through the MySQL adapter", async () => {
    const execute = vi.fn(async () => [{ affectedRows: 1 }]);
    const repository = new MySqlRepository({ execute, query: vi.fn() });
    await repository.insertActivity({ execute }, "day-1", validActivity({
      sourceAttractionId: "approved-1",
      sourceProvider: "Mafengwo",
      sourceUrl: "https://m.mafengwo.cn/poi/approved-1.html",
      imageUrl: "/api/attractions/approved-1/image",
      imageAttribution: "Image source: Mafengwo",
      visitDetails: validVisitDetails(),
      locationIsEstimated: true
    }));

    expect(execute.mock.calls[0][0]).toContain("source_attraction_id");
    expect(execute.mock.calls[0][0]).toContain("location_is_estimated");
    expect(execute.mock.calls[0][0]).toContain("image_url");
    expect(execute.mock.calls[0][0]).toContain("visit_details_json");
    expect(execute.mock.calls[0][1]).toEqual(expect.arrayContaining([
      "approved-1",
      "Mafengwo",
      "https://m.mafengwo.cn/poi/approved-1.html",
      "/api/attractions/approved-1/image",
      "Image source: Mafengwo",
      JSON.stringify(validVisitDetails()),
      1
    ]));
  });

  it("loads a MySQL trip graph with fixed queries instead of nested day queries", async () => {
    const execute = vi.fn(async (sql) => {
      if (sql.includes("FROM trips WHERE id IN")) {
        return [[{
          id: "trip-1",
          ownerId: "user-1",
          status: "draft",
          title_en: "Trip",
          title_zh: "行程",
          destination: "huangshan",
          startDate: "2026-08-10",
          endDate: "2026-08-11",
          totalBudget: 2000,
          selectedVariantId: "variant-1",
          preferences_json: "{}",
          createdAt: "created",
          updatedAt: "updated"
        }]];
      }
      if (sql.includes("FROM itinerary_variants")) {
        return [[{
          id: "variant-1",
          tripId: "trip-1",
          style: "budget",
          title_json: "{}",
          summary_json: "{}",
          pace: "active",
          highlights_json: "[]",
          budget_json: "{}",
          is_fallback: 0
        }]];
      }
      if (sql.includes("FROM trip_days")) {
        return [[
          { id: "day-1", variantId: "variant-1", dayNumber: 1, tripDate: "2026-08-10", title_json: "{}" },
          { id: "day-2", variantId: "variant-1", dayNumber: 2, tripDate: "2026-08-11", title_json: "{}" }
        ]];
      }
      if (sql.includes("FROM activities")) {
        return [[
          {
            id: "activity-1",
            dayId: "day-1",
            sortOrder: 0,
            startTime: "09:00:00",
            endTime: "10:00:00",
            name_json: "{}",
            description_json: "{}",
            category: "natural_scenery",
            address_json: "{}",
            longitude: 118,
            latitude: 30,
            estimatedCost: 20,
            transport_note_json: "{}",
            guide_json: "{}",
            locationIsEstimated: null,
            votes: 0
          }
        ]];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repository = new MySqlRepository({ execute, query: vi.fn() });

    const trip = await repository.getTrip("trip-1");

    expect(trip.variants[0].days).toHaveLength(2);
    expect(trip.variants[0].days[0].activities).toHaveLength(1);
    expect(execute).toHaveBeenCalledTimes(4);
  });
});
