import { randomUUID } from "node:crypto";
import { getCity } from "@nuogo/shared/constants";
import { parseItinerary } from "./parser.js";
import { validateGroundedItinerary } from "./grounding.js";

export { generateValidatedTrip } from "./itinerary/generateValidatedTrip.js";

const styles = ["budget", "food", "leisure"];

function addDays(dateString, offset) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function createFallback(preferences, style) {
  const city = getCity(preferences.destination);
  return {
    id: randomUUID(),
    tripId: preferences.tripId ?? randomUUID(),
    style,
    title: {
      en: `Editable ${city.name.en} plan`,
      zh: `可编辑的${city.name.zh}行程`
    },
    summary: {
      en: "Generation was incomplete. Add or regenerate activities in the workspace.",
      zh: "生成未完成，请在行程工作区添加或重新生成活动。"
    },
    destination: preferences.destination,
    startDate: preferences.startDate,
    totalBudget: preferences.totalBudget,
    pace: style === "leisure" ? "slow" : style === "food" ? "balanced" : "active",
    highlights: { en: ["Editable itinerary"], zh: ["可编辑行程"] },
    budget: {
      scenicTickets: 0,
      localFood: 0,
      transportation: 0,
      accommodation: 0
    },
    days: Array.from({ length: preferences.days }, (_, index) => ({
      id: randomUUID(),
      dayNumber: index + 1,
      date: addDays(preferences.startDate, index),
      title: { en: `Day ${index + 1}`, zh: `第${index + 1}天` },
      activities: []
    })),
    isFallback: true
  };
}

async function generateStyle(preferences, style, provider, retries, attractions) {
  let lastError;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const raw = await provider.generate(preferences, style, { attempt, attractions });
      const parsed = parseItinerary(raw);
      const grounded = validateGroundedItinerary(
        parsed,
        attractions,
        preferences.destination
      );
      return {
        ...grounded,
        tripId: preferences.tripId,
        style
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    ...createFallback(preferences, style),
    generationError: lastError?.message ?? "Unknown generation failure."
  };
}

/**
 * FYP novelty: all three planning styles begin concurrently and fail
 * independently, reducing wait time without discarding successful variants.
 */
// Legacy compatibility for the pre-objective UI. New planning requests use generateValidatedTrip.
export async function generateThreePlans(preferences, provider, options = {}) {
  const retries = Math.max(1, Math.min(3, options.retries ?? 3));
  const tripId = preferences.tripId ?? randomUUID();
  const request = { ...preferences, tripId };
  const results = await Promise.allSettled(
    styles.map((style) =>
      generateStyle(request, style, provider, retries, options.attractions ?? [])
    )
  );

  return {
    tripId,
    variants: results.map((result, index) =>
      result.status === "fulfilled"
        ? result.value
        : createFallback(request, styles[index])
    )
  };
}
