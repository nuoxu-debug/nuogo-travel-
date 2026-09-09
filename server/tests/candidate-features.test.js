import { describe, expect, it } from "vitest";
import { buildCandidateFeatures } from "../src/services/poi/buildCandidateFeatures.js";

const candidate = { xid: "A", category: "HISTORY", interestMatch: true, estimatedCostMinor: 2000, coordinates: { latitude: 39.9, longitude: 116.4 } };
const context = { preferences: { interests: ["HISTORY"] }, selectedIds: new Set(), selectedCandidates: [], routeContext: { currentLocation: { latitude: 39.91, longitude: 116.41 } }, costReferences: [] };

describe("candidate features", () => {
  it("normalizes every planning factor", () => {
    const features = buildCandidateFeatures(candidate, context);
    expect(features).toMatchObject({ selectedAttractionPriority: 0, preferenceMatch: 1 });
    expect(Object.values(features).filter(Number.isFinite).every((value) => value >= 0 && value <= 1)).toBe(true);
  });
  it("raises selected priority and recalculates marginal diversity", () => {
    expect(buildCandidateFeatures(candidate, { ...context, selectedIds: new Set(["A"]) }).selectedAttractionPriority).toBe(1);
    expect(buildCandidateFeatures(candidate, { ...context, selectedCandidates: [{ category: "HISTORY" }] }).categoryDiversity).toBeLessThan(buildCandidateFeatures(candidate, context).categoryDiversity);
  });
  it("uses neutral values when cost and route evidence are absent", () => {
    const features = buildCandidateFeatures({ xid: "B", category: "CULTURE" }, { ...context, routeContext: null });
    expect(features.costEfficiency).toBe(.5); expect(features.travelEfficiency).toBe(.5);
  });
});
