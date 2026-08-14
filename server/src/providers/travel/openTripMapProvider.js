import { z } from "zod";
import { requestJson } from "./httpClient.js";

const tourismRecordSchema = z.object({
  xid: z.string().min(1),
  name: z.string().default(""),
  kinds: z.string().default(""),
  dist: z.number().nonnegative().optional(),
  rate: z.union([z.number(), z.string()]).optional(),
  point: z.object({ lon: z.number(), lat: z.number() })
}).passthrough();

const tourismResponseSchema = z.array(tourismRecordSchema);

export class OpenTripMapProvider {
  constructor({ apiKey, fetchImpl = fetch, timeoutMs = 8000, retries = 2 }) {
    if (!apiKey) throw new TypeError("OpenTripMap API key is required.");
    this.apiKey = apiKey;
    this.requestOptions = { fetchImpl, timeoutMs, retries };
  }

  async enrichTourism({ city, coordinates, radiusMeters = 5000, signal }) {
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
}
