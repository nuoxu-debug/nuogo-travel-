const stable = (value) => JSON.stringify(value ?? {});
const poiSet = (variant, selected) => new Set((variant.itinerary?.days ?? []).flatMap(({ activities }) => activities ?? []).map(({ xid }) => xid).filter((xid) => xid && !selected.has(xid)));
const jaccard = (left, right) => { const union = new Set([...left, ...right]); if (!union.size) return "NOT_APPLICABLE"; return [...left].filter((id) => right.has(id)).length / union.size; };

export function evaluateProfileDifferentiation(variants, { selectedCandidateIds = [], config }) {
  const selected = new Set(selectedCandidateIds); const pairs = []; const diagnostics = [];
  for (let leftIndex = 0; leftIndex < variants.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < variants.length; rightIndex += 1) {
    const left = variants[leftIndex]; const right = variants[rightIndex]; const overlap = jaccard(poiSet(left, selected), poiSet(right, selected));
    const dimensions = {
      nonSelectedPois: overlap !== "NOT_APPLICABLE" && overlap <= config.maxNonSelectedPoiJaccard,
      costAllocation: stable(left.summary?.categoriesMinor) !== stable(right.summary?.categoriesMinor),
      transport: stable(left.variantMetrics?.transportDistribution) !== stable(right.variantMetrics?.transportDistribution),
      accommodation: left.variantMetrics?.accommodationTier !== right.variantMetrics?.accommodationTier,
      food: left.variantMetrics?.foodTier !== right.variantMetrics?.foodTier,
      pace: left.variantMetrics?.pace !== right.variantMetrics?.pace,
      dayAssignments: stable(left.itinerary?.days?.map((day) => day.activities?.map(({ xid }) => xid).filter(Boolean))) !== stable(right.itinerary?.days?.map((day) => day.activities?.map(({ xid }) => xid).filter(Boolean)))
    };
    const pair = { leftIndex, rightIndex, profiles: [left.itinerary?.travelStyle ?? left.itinerary?.variant, right.itinerary?.travelStyle ?? right.itinerary?.variant], nonSelectedPoiJaccard: overlap, meaningfulDimensionCount: Object.values(dimensions).filter(Boolean).length, dimensions };
    pairs.push(pair);
    if (pair.meaningfulDimensionCount < config.minimumMeaningfulDimensions) diagnostics.push({ code: "LIMITED_PROFILE_DIFFERENTIATION", severity: "INFO", profiles: pair.profiles, nonSelectedPoiJaccard: overlap, meaningfulDimensionCount: pair.meaningfulDimensionCount });
  }
  return { valid: true, pairs, diagnostics };
}
