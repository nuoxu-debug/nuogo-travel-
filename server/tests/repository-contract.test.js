import { describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "../src/repositories/memory.js";
import { MySqlRepository } from "../src/repositories/mysql.js";
import { validActivity, validVisitDetails } from "./helpers.js";

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
