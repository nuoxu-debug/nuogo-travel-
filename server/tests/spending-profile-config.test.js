import { describe, expect, it } from "vitest";
import { profileWeights, spendingProfileIds, validateProfileWeights } from "../src/services/budget/spendingProfiles.js";

describe("profile weights", () => {
  it("keeps all approved factors at exact unit totals", () => spendingProfileIds.forEach((id) => { expect(Object.keys(profileWeights[id])).toHaveLength(7); expect(Object.values(profileWeights[id]).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1); expect(validateProfileWeights(profileWeights[id])).toEqual([]); }));
  it("rejects invalid values", () => expect(validateProfileWeights({ ...profileWeights.BALANCED, costEfficiency: -1 })).not.toEqual([]));
});
