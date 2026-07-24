import { describe, expect, it } from "vitest";
import { OpenRouterProvider } from "../src/providers/openRouter.js";
import { validPreferences } from "./helpers.js";

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
  it("aborts slow OpenRouter requests", async () => {
    const provider = providerWith((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(options.signal.reason));
    }));

    await expect(provider.generate(validPreferences(), "budget"))
      .rejects.toMatchObject({
        code: "OPENROUTER_TIMEOUT",
        status: 504
      });
  });

  it("returns a typed error for non-2xx responses", async () => {
    const provider = providerWith(async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: "rate limited" } })
    }));

    await expect(provider.generate(validPreferences(), "budget"))
      .rejects.toMatchObject({
        code: "OPENROUTER_REQUEST_FAILED",
        status: 502
      });
  });

  it("returns a typed error for invalid response JSON", async () => {
    const provider = providerWith(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("invalid json");
      }
    }));

    await expect(provider.generate(validPreferences(), "budget"))
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

    await expect(provider.generate(validPreferences(), "budget"))
      .rejects.toMatchObject({
        code: "OPENROUTER_EMPTY_RESPONSE",
        status: 502
      });
  });
});
