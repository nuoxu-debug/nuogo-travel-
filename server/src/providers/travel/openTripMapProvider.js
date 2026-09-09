import { z } from "zod";
import { requestJson } from "./httpClient.js";

const tourismResponseSchema = z.array(z.unknown());
const tourismDetailSchema = z.object({
  xid: z.string().min(1),
  name: z.string().optional(),
  kinds: z.string().optional(),
  point: z.object({ lon: z.number(), lat: z.number() }).optional(),
  otm: z.string().url().optional(),
  wikipedia_extracts: z.object({ text: z.string().optional() }).passthrough().optional(),
  info: z.object({ descr: z.string().optional() }).passthrough().optional(),
  address: z.record(z.unknown()).optional(),
  preview: z.object({ source: z.string().url().optional() }).passthrough().optional()
}).passthrough();

export class OpenTripMapProvider {
  constructor({ apiKey, fetchImpl = fetch, timeoutMs = 8000, retries = 2 }) {
    if (!apiKey) throw new TypeError("OpenTripMap API key is required.");
    this.apiKey = apiKey;
    this.requestOptions = { fetchImpl, timeoutMs, retries };
  }

  async listAttractions({ city, coordinates, radiusMeters = 5000, signal }) {
    if (!city) throw new TypeError("A city is required for tourism enrichment.");
    const radius = Math.min(20_000, Math.max(100, Math.round(radiusMeters)));
    const params = new URLSearchParams({
      radius: String(radius),
      lon: String(coordinates.longitude),
      lat: String(coordinates.latitude),
      kinds: "interesting_places",
      rate: "1",
      format: "json",
      limit: "50",
      apikey: this.apiKey
    });
    return requestJson(`https://api.opentripmap.com/0.1/en/places/radius?${params}`, {
      ...this.requestOptions,
      signal,
      schema: tourismResponseSchema
    });
  }

  async getAttractionDetails({ xid, signal }) {
    if (!xid) throw new TypeError("An xid is required for attraction details.");
    const params = new URLSearchParams({ apikey: this.apiKey });
    return requestJson(
      `https://api.opentripmap.com/0.1/en/places/xid/${encodeURIComponent(xid)}?${params}`,
      { ...this.requestOptions, signal, schema: tourismDetailSchema }
    );
  }

  async enrichTourism(input) {
    return this.listAttractions(input);
  }
}
