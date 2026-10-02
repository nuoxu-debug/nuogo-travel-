import { validateBudget } from "./validators/budgetValidator.js";
import { validateContinuity } from "./validators/continuityValidator.js";
import { validatePois } from "./validators/poiValidator.js";
import { calculateOpeningHoursVerificationCoverage, validateOperatingHours } from "./validators/operatingHoursValidator.js";
import { validateSchedule } from "./validators/scheduleValidator.js";
import { validateDailyDensity } from "./validators/dailyDensityValidator.js";
import { validateGenericActivityQuality } from "./validators/genericActivityQualityValidator.js";

export function validateItinerary({ preferences, itinerary, candidatePool }) {
  const issues = [
    ...validatePois(itinerary, candidatePool),
    ...validateContinuity(preferences, itinerary),
    ...validateSchedule(preferences, itinerary),
    ...validateOperatingHours(itinerary, candidatePool),
    ...validateGenericActivityQuality(itinerary),
    ...validateDailyDensity({ preferences, itinerary, candidatePool }),
    ...validateBudget(itinerary)
  ];
  const result = { valid: issues.every(({ severity }) => severity !== "ERROR"), issues };
  if (candidatePool.operatingHours) {
    result.metrics = {
      openingHoursVerificationCoverage: calculateOpeningHoursVerificationCoverage(itinerary, candidatePool)
    };
  }
  return result;
}
