import { itineraryVariantSchema } from "@nuogo/shared/schemas";

function extractFencedBlock(raw) {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return match?.[1] ?? null;
}

function extractBalancedObject(raw) {
  const start = raw.indexOf("{");
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < raw.length; index += 1) {
    const character = raw[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === "\\" && inString) {
      escaped = true;
      continue;
    }

    if (character === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, index + 1);
      }
    }
  }

  return null;
}

/**
 * FYP novelty: AI text passes through deterministic extraction and strict
 * mainland-China itinerary validation before it can reach persistence or UI.
 */
export function parseItinerary(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("AI response is empty.");
  }

  const candidates = [
    raw.trim(),
    extractFencedBlock(raw),
    extractBalancedObject(raw)
  ].filter(Boolean);

  let lastError = new Error("No JSON object found in AI response.");

  for (const candidate of candidates) {
    try {
      return itineraryVariantSchema.parse(JSON.parse(candidate));
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
