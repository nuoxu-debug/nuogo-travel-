import { describe, expect, it } from "vitest";
import { splitEqually, summarizeExpenses } from "../src/services/expenseSplit.js";

describe("expense splitting", () => {
  it("splits integer fen deterministically and preserves the total", () => {
    expect(splitEqually(10000, ["user-c", "user-a", "user-b"])).toEqual([
      { userId: "user-a", shareFen: 3334 },
      { userId: "user-b", shareFen: 3333 },
      { userId: "user-c", shareFen: 3333 }
    ]);
  });

  it("excludes travellers who did not participate", () => {
    const allocations = splitEqually(30000, ["user-1", "user-2", "user-3"]);
    expect(allocations).toHaveLength(3);
    expect(allocations.some(({ userId }) => userId === "user-4")).toBe(false);
  });

  it("allows the payer to be outside the participant set", () => {
    const summary = summarizeExpenses(
      [
        { userId: "payer", name: "Chen" },
        { userId: "guest", name: "Li" }
      ],
      [{
        amountFen: 10000,
        paidByUserId: "payer",
        participants: [{ userId: "guest", shareFen: 10000 }]
      }]
    );
    expect(summary.members.find(({ userId }) => userId === "payer").netFen).toBe(10000);
    expect(summary.members.find(({ userId }) => userId === "guest").netFen).toBe(-10000);
  });

  it("creates a small deterministic settlement list", () => {
    const summary = summarizeExpenses(
      [
        { userId: "a", name: "A" },
        { userId: "b", name: "B" },
        { userId: "c", name: "C" }
      ],
      [{
        amountFen: 30000,
        paidByUserId: "a",
        participants: [
          { userId: "a", shareFen: 10000 },
          { userId: "b", shareFen: 10000 },
          { userId: "c", shareFen: 10000 }
        ]
      }]
    );
    expect(summary.settlements).toEqual([
      { fromUserId: "b", fromName: "B", toUserId: "a", toName: "A", amountFen: 10000 },
      { fromUserId: "c", fromName: "C", toUserId: "a", toName: "A", amountFen: 10000 }
    ]);
  });

  it("settles the most-negative debtor before smaller debts", () => {
    const summary = summarizeExpenses(
      [
        { userId: "creditor", name: "Creditor" },
        { userId: "large-debtor", name: "Large debtor" },
        { userId: "small-debtor", name: "Small debtor" }
      ],
      [{
        amountFen: 30000,
        paidByUserId: "creditor",
        participants: [
          { userId: "large-debtor", shareFen: 20000 },
          { userId: "small-debtor", shareFen: 10000 }
        ]
      }]
    );

    expect(summary.settlements).toEqual([
      {
        fromUserId: "large-debtor",
        fromName: "Large debtor",
        toUserId: "creditor",
        toName: "Creditor",
        amountFen: 20000
      },
      {
        fromUserId: "small-debtor",
        fromName: "Small debtor",
        toUserId: "creditor",
        toName: "Creditor",
        amountFen: 10000
      }
    ]);
  });

  it("rejects non-positive or non-integer amounts", () => {
    expect(() => splitEqually(0, ["user-1"])).toThrow(RangeError);
    expect(() => splitEqually(-1, ["user-1"])).toThrow(RangeError);
    expect(() => splitEqually(1.5, ["user-1"])).toThrow(RangeError);
  });

  it("rejects empty participants", () => {
    expect(() => splitEqually(100, [])).toThrow(RangeError);
  });
});
