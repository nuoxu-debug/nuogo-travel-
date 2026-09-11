import { describe, expect, it, vi } from "vitest";
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

    expect(requestBody).toMatchObject({ model: "deepseek/deepseek-chat-v3.1" });
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
