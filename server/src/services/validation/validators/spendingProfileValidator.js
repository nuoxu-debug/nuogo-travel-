function signature(variant) {
  const metrics = variant.variantMetrics ?? {};
  const poiOrder = variant.itinerary?.days
    .flatMap((day) => day.activities.map(({ poiId }) => poiId)) ?? [];
  return JSON.stringify({
    poiOrder,
    accommodationTier: metrics.accommodationTier,
    foodTier: metrics.foodTier,
    transportDistribution: Object.entries(metrics.transportDistribution ?? {}).sort()
  });
}

export function validateSpendingProfiles(variants) {
  const finalVariants = variants.filter(({ state }) => state === "FINAL_VALIDATED");
  if (finalVariants.length !== 3) return [];
  if (new Set(finalVariants.map(signature)).size === finalVariants.length) return [];
  return [{
    code: "INSUFFICIENT_VARIANT_DIFFERENTIATION",
    path: ["variants"],
    severity: "ERROR",
    metadata: { distinctVariantCount: new Set(finalVariants.map(signature)).size }
  }];
}
