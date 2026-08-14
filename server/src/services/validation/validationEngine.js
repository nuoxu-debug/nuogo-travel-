import { validateBudget } from "./validators/budgetValidator.js";
import { validateContinuity } from "./validators/continuityValidator.js";
import { validatePois } from "./validators/poiValidator.js";
import { validateSchedule } from "./validators/scheduleValidator.js";

export function validateItinerary({ preferences, itinerary, candidatePool }) {
  const issues = [
    ...validatePois(itinerary, candidatePool),
    ...validateContinuity(preferences, itinerary),
    ...validateSchedule(preferences, itinerary),
    ...validateBudget(itinerary)
  ];
  return { valid: issues.every(({ severity }) => severity !== "ERROR"), issues };
}
