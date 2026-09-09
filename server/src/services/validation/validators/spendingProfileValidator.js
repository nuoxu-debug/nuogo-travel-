import { getSpendingProfile, spendingProfileIds } from "../../budget/spendingProfiles.js";

// Legacy comparison compatibility: one SGD is the smallest meaningful money delta.
export const MIN_PROFILE_DIFFERENTIATION_FEN = 100;

function profileOf(variant) {
  return variant.itinerary?.travelStyle ?? variant.itinerary?.variant ?? variant.summary?.profile;
}

function configuredAs(variant, profile) {
  const expected = getSpendingProfile(profile);
  const actual = variant.variantMetrics ?? variant.summary ?? {};
  return actual.accommodationTier === expected.accommodationTier &&
    actual.localTransportationTier === expected.localTransportationTier &&
    actual.foodTier === expected.foodTier;
}

function issue(reasons, variants) {
  return {
    code: "PROFILE_DIFFERENTIATION_UNAVAILABLE",
    path: ["variants"],
    severity: "ERROR",
    metadata: {
      minimumDifferentiationFen: MIN_PROFILE_DIFFERENTIATION_FEN,
      reasons: [...reasons],
      totalsFen: variants.map(({ summary }) => summary?.totalMinor),
      budgetsFen: variants.map(({ summary }) => summary?.budgetMinor)
    }
  };
}

export function validateSpendingProfiles(variants) {
  if (!variants.length) return [];
  const ordered = spendingProfileIds.map((profile) =>
    variants.find((variant) => profileOf(variant) === profile));
  const reasons = new Set();
  if (ordered.some((variant) => !variant)) {
    reasons.add("PROFILE_SET");
    return [issue(reasons, variants)];
  }
  if (ordered.some(({ summary }) => !summary)) reasons.add("MONETARY_DATA");
  if (ordered.some((variant, index) => !configuredAs(variant, spendingProfileIds[index]))) {
    reasons.add("PROFILE_CONFIGURATION");
  }

  const budgets = ordered.map(({ summary }) => summary?.budgetMinor);
  if (new Set(budgets).size !== 1) reasons.add("SHARED_BUDGET");
  if (ordered.some(({ summary }) => !summary?.withinBudget || summary.totalMinor > summary.budgetMinor)) {
    reasons.add("HARD_BUDGET");
  }
  return reasons.size ? [issue(reasons, ordered)] : [];
}
