import { describe, expect, it } from "vitest";
import { OpenRouterProvider } from "../../src/providers/openRouter.js";
import { OpenTripMapProvider } from "../../src/providers/travel/openTripMapProvider.js";

const runOpenTripMap = process.env.OPENTRIPMAP_LIVE_TEST === "true"
  && Boolean(process.env.OPENTRIPMAP_API_KEY);
const runOpenRouter = process.env.OPENROUTER_LIVE_TEST === "true"
  && Boolean(process.env.OPENROUTER_API_KEY);

describe.skipIf(!runOpenTripMap)("OpenTripMap live provider", () => {
  it("returns a real attraction and its typed details", async () => {
    const provider = new OpenTripMapProvider({
      apiKey: process.env.OPENTRIPMAP_API_KEY,
      timeoutMs: 15_000,
      retries: 1
    });
    const attractions = await provider.listAttractions({
      city: "singapore",
      coordinates: { longitude: 116.3975, latitude: 39.9087 },
      radiusMeters: 3000
    });
    const attraction = attractions.find(({ xid, name }) => xid && name);
    expect(attraction).toBeTruthy();

    const details = await provider.getAttractionDetails({ xid: attraction.xid });
    expect(details).toMatchObject({ xid: attraction.xid });
    expect(details.name || attraction.name).toBeTruthy();
  }, 30_000);
});

describe.skipIf(!runOpenRouter)("OpenRouter live provider", () => {
  it("returns parseable JSON from the configured model", async () => {
    const provider = new OpenRouterProvider({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3.1",
      timeoutMs: 60_000,
      supportsStructuredOutput: process.env.OPENROUTER_STRUCTURED_OUTPUT === "true"
    });
    const content = await provider.generateStructured({
      system: "Return only a JSON object that follows the supplied schema.",
      user: "Return {\"status\":\"ok\"}.",
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["status"],
        properties: { status: { type: "string", const: "ok" } }
      },
      temperature: 0
    });

    expect(JSON.parse(content)).toEqual({ status: "ok" });
  }, 75_000);
});
