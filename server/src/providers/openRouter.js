import { ExternalServiceError, ExternalServiceTimeoutError } from "../errors.js";

export class OpenRouterProvider {
  constructor({
    apiKey,
    model = "deepseek/deepseek-chat-v3.1",
    timeoutMs = 30000,
    fetchImpl = fetch,
    supportsStructuredOutput = true
  }) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
    this.supportsStructuredOutput = supportsStructuredOutput;
  }

  async generateStructured({ system, user, jsonSchema, temperature = 0.2 }) {
    const responseFormat = this.supportsStructuredOutput
      ? {
        type: "json_schema",
        json_schema: {
          name: "nuogo_itinerary_draft",
          strict: true,
          schema: jsonSchema
        }
      }
      : { type: "json_object" };
    return this.#complete({ system, user, responseFormat, temperature });
  }

  async #complete({ system, user, responseFormat, temperature }) {
    if (!this.apiKey) {
      throw new Error("OpenRouter API key is not configured.");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    try {
      response = await this.fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "Nuogo"
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user }
          ],
          response_format: responseFormat,
          temperature,
          provider: {
            data_collection: "deny",
            zdr: true
          }
        }),
        signal: controller.signal
      });
    } catch (error) {
      if (controller.signal.aborted || error?.name === "AbortError") {
        throw new ExternalServiceTimeoutError("OpenRouter request timed out.", {
          code: "OPENROUTER_TIMEOUT",
          cause: error
        });
      }
      throw new ExternalServiceError("OpenRouter request failed before a response was received.", {
        code: "OPENROUTER_NETWORK_ERROR",
        cause: error
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ExternalServiceError(`OpenRouter request failed with status ${response.status}.`, {
        code: response.status === 429
          ? "OPENROUTER_RATE_LIMITED"
          : response.status >= 500 ? "OPENROUTER_UNAVAILABLE" : "OPENROUTER_REQUEST_FAILED"
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new ExternalServiceError("OpenRouter returned invalid response JSON.", {
        code: "OPENROUTER_RESPONSE_INVALID",
        cause: error
      });
    }
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new ExternalServiceError("OpenRouter returned no itinerary content.", {
        code: "OPENROUTER_EMPTY_RESPONSE"
      });
    }
    return content;
  }
}
