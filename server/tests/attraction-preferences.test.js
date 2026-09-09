import { describe, expect, it } from "vitest";
import { resolveAttractionPreferences } from "../src/services/poi/resolveAttractionPreferences.js";

const pool = { city: "singapore", candidates: [
  { xid: "N123", candidateId: "N123", city: "singapore", name: "Forbidden City", displayName: { en: "Forbidden City", zh: "故宫博物院" }, primarySource: "OPENTRIPMAP" },
  { xid: "N456", candidateId: "N456", city: "singapore", name: "Temple of Heaven", displayName: { en: "Temple of Heaven", zh: "天坛公园" }, primarySource: "OPENTRIPMAP" }
] };

describe("attraction preference resolution", () => {
  it("uses structured AUTO ahead of legacy names", () => expect(resolveAttractionPreferences({ attractionSelectionMode: "AUTO", selectedAttractions: [], preferredSights: ["Forbidden City"] }, pool)).toMatchObject({ mode: "AUTO", requested: [] }));
  it("resolves MANUAL ids authoritatively and drops client provenance", () => {
    const result = resolveAttractionPreferences({ attractionSelectionMode: "MANUAL", selectedAttractions: [{ xid: "N123", displayName: "Fake", provider: "DEMO" }] }, pool);
    expect(result.supported[0]).toMatchObject({ xid: "N123", primarySource: "OPENTRIPMAP" });
    expect(result.supported[0]).not.toHaveProperty("provider");
  });
  it("preserves duplicate, unavailable, and wrong-city requests as unresolved", () => {
    const result = resolveAttractionPreferences({ attractionSelectionMode: "MANUAL", selectedAttractions: [{ xid: "N123", displayName: "One" }, { xid: "N123", displayName: "Again" }, { xid: "missing", displayName: "Missing" }] }, pool);
    expect(result.supported).toHaveLength(1);
    expect(result.unresolved.map(({ reason }) => reason)).toEqual(["DUPLICATE_SELECTION", "UNAVAILABLE_ATTRACTION"]);
  });
  it("resolves legacy names exactly after normalization and never fuzzy guesses", () => {
    expect(resolveAttractionPreferences({ preferredSights: ["  forbidden CITY ", "Forbidden"] }, pool)).toMatchObject({ mode: "LEGACY", supported: [{ xid: "N123" }], unresolved: [{ displayName: "Forbidden", reason: "UNMATCHED_ATTRACTION" }] });
  });
  it("uses AUTO only when no current or legacy attraction preference exists", () => expect(resolveAttractionPreferences({ preferredSights: [] }, pool)).toMatchObject({ mode: "AUTO", requested: [], supported: [], unresolved: [] }));
});
