import { describe, expect, it, vi } from "vitest";
import { itineraryDraftJsonSchema } from "@nuogo/shared/itinerary-draft-schema";
import { OpenRouterProvider } from "../src/providers/openRouter.js";

const structuredRequest = {
  system: "Return a travel plan as JSON.",
  user: "{}",
  jsonSchema: { type: "object", additionalProperties: false }
};

function providerWith(fetchImpl, options = {}) {
  return new OpenRouterProvider({
    apiKey: "test-openrouter-key",
    model: "test-model",
    timeoutMs: 5,
    fetchImpl,
    ...options
  });
}

describe("OpenRouterProvider", () => {
  it("leaves provider routing unrestricted for the selected model", async () => {
    let requestBody;
    const fetchImpl = vi.fn(async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "{}" } }] })
      };
    });
    const provider = new OpenRouterProvider({ apiKey: "test-key", fetchImpl });

    await provider.generateStructured(structuredRequest);

    expect(requestBody).toMatchObject({ model: "google/gemini-3.1-flash-lite" });
    expect(requestBody).not.toHaveProperty("provider");
    expect(requestBody).not.toHaveProperty("models");
  });

  it("aborts slow OpenRouter requests", async () => {
    const provider = providerWith((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(options.signal.reason));
    }));

    await expect(provider.generateStructured(structuredRequest))
      .rejects.toMatchObject({
        code: "OPENROUTER_TIMEOUT",
        status: 504
      });
  });

  it.each([
    { model: "google/gemini-3.1-flash-lite", omitMaximums: true },
    { model: "test-model", omitMaximums: false }
  ])("preserves local validation while preparing initial and repair schemas for $model", async ({ model, omitMaximums }) => {
    const bodies = [];
    const originalSchema = structuredClone(itineraryDraftJsonSchema);
    const expectedSchema = structuredClone(itineraryDraftJsonSchema);
    if (omitMaximums) {
      delete expectedSchema.properties.days.maxItems;
      delete expectedSchema.$defs.day.properties.activities.maxItems;
    }
    const provider = providerWith(async (_url, options) => {
      bodies.push(JSON.parse(options.body));
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: "{}" } }] })
      };
    }, { model });

    for (const temperature of [0.2, 0.1]) {
      await provider.generateStructured({ ...structuredRequest, jsonSchema: itineraryDraftJsonSchema, temperature });
    }

    for (const body of bodies) {
      expect(body.response_format).toEqual({
        type: "json_schema",
        json_schema: { name: "nuogo_itinerary_draft", strict: true, schema: expectedSchema }
      });
    }
    expect(itineraryDraftJsonSchema).toEqual(originalSchema);
    expect(itineraryDraftJsonSchema.properties.days.maxItems).toBe(14);
    expect(itineraryDraftJsonSchema.$defs.day.properties.activities.maxItems).toBe(12);
  });

  it("returns a typed error for non-2xx responses", async () => {
    const provider = providerWith(async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: "rate limited" } })
    }));

    await expect(provider.generateStructured(structuredRequest))
      .rejects.toMatchObject({
        code: "OPENROUTER_RATE_LIMITED",
        status: 502
      });
  });

  it("returns a controlled error when OpenRouter is unavailable", async () => {
    const provider = providerWith(async () => ({ ok: false, status: 503 }));

    await expect(provider.generateStructured(structuredRequest))
      .rejects.toMatchObject({ code: "OPENROUTER_UNAVAILABLE", status: 502 });
  });

  it("returns a typed error for invalid response JSON", async () => {
    const provider = providerWith(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("invalid json");
      }
    }));

    await expect(provider.generateStructured(structuredRequest))
      .rejects.toMatchObject({
        code: "OPENROUTER_RESPONSE_INVALID",
        status: 502
      });
  });

  it("returns a typed error for empty itinerary content", async () => {
    const provider = providerWith(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "" } }] })
    }));

    await expect(provider.generateStructured(structuredRequest))
      .rejects.toMatchObject({
        code: "OPENROUTER_EMPTY_RESPONSE",
        status: 502
      });
  });
});
