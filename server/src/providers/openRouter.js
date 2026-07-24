import { buildPrompt } from "../services/promptBuilder.js";
import { ExternalServiceError, ExternalServiceTimeoutError } from "../errors.js";

export class OpenRouterProvider {
  constructor({ apiKey, model = "openai/gpt-4.1-mini", timeoutMs = 30000, fetchImpl = fetch }) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async generate(preferences, style, context = {}) {
    if (!this.apiKey) {
      throw new Error("OpenRouter API key is not configured.");
    }

    const prompt = buildPrompt(preferences, style, context);
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
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user }
          ],
          response_format: { type: "json_object" },
          temperature: 0.5
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
        code: "OPENROUTER_REQUEST_FAILED"
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
