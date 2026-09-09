import { describe, expect, it, vi } from "vitest";
import { MemoryRepository } from "../src/repositories/memory.js";
import { MySqlRepository } from "../src/repositories/mysql.js";

async function createTrip(repository, ownerId, id) {
  const trip = {
    id,
    ownerId,
    title: `${id} title`,
    objectiveAligned: true,
    variants: [],
    revision: 0,
    updatedAt: new Date().toISOString()
  };
  repository.trips.set(id, trip);
  return trip;
}

describe("profile repository lifecycle", () => {
  it("removes owned Memory data while preserving another account", async () => {
    const repository = new MemoryRepository();
    const user = await repository.createUser({
      name: "Delete Me",
      email: "delete@nuogo.test",
      passwordHash: "hash"
    });
    const other = await repository.createUser({
      name: "Keep Me",
      email: "keep@nuogo.test",
      passwordHash: "hash"
    });
    const ownedTrip = await createTrip(repository, user.id, "owned-trip");
    const otherTrip = await createTrip(repository, other.id, "other-trip");
    repository.privacyConsents.set(`${user.id}:GENERAL`, { userId: user.id });
    repository.privacyConsents.set(`${other.id}:GENERAL`, { userId: other.id });
    repository.itineraryRuns.set("run-delete", { id: "run-delete", tripId: ownedTrip.id });
    repository.itineraryRuns.set("run-keep", { id: "run-keep", tripId: otherTrip.id });

    await expect(repository.deleteAccount(user.id)).resolves.toBe(true);

    expect(await repository.findUserById(user.id)).toBeUndefined();
    expect(await repository.findUserById(other.id)).toBeDefined();
    expect(await repository.getTrip(ownedTrip.id)).toBeUndefined();
    expect(await repository.getTrip(otherTrip.id)).toBeDefined();
    expect(repository.privacyConsents.size).toBe(1);
    expect(repository.itineraryRuns.size).toBe(1);
  });

  it("commits current MySQL account deletion in one transaction", async () => {
    const connection = {
      beginTransaction: vi.fn(),
      execute: vi.fn(async (sql) => (
        /SELECT id FROM users/i.test(sql)
          ? [[{ id: "user-1" }]]
          : [{ affectedRows: 1 }]
      )),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn()
    };
    const repository = new MySqlRepository({
      query: vi.fn(),
      getConnection: vi.fn(async () => connection)
    });

    await expect(repository.deleteAccount("user-1")).resolves.toBe(true);

    const sql = connection.execute.mock.calls.map(([statement]) => statement).join("\n");
    for (const table of ["trips", "privacy_consents", "users"]) {
      expect(sql).toContain(table);
    }
    for (const retiredTable of ["trip_expenses", "trip_invitations", "favorites", "trip_members"]) {
      expect(sql).not.toContain(retiredTable);
    }
    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it("rolls back MySQL account deletion when a current delete fails", async () => {
    const connection = {
      beginTransaction: vi.fn(),
      execute: vi.fn()
        .mockResolvedValueOnce([[{ id: "user-1" }]])
        .mockRejectedValueOnce(new Error("delete failed")),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn()
    };
    const repository = new MySqlRepository({
      query: vi.fn(),
      getConnection: vi.fn(async () => connection)
    });

    await expect(repository.deleteAccount("user-1")).rejects.toThrow("delete failed");
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
  });
});
