import { z } from "zod";
import { requestJson } from "./httpClient.js";
import { TravelProviderError, providerErrorCodes, routeUnavailable } from "./providerError.js";

const cityAdcodes = Object.freeze({ beijing: "110000", shanghai: "310000", xian: "610100" });
const categoryTypes = Object.freeze({
  ATTRACTION: "110000",
  HOTEL: "100000",
  RESTAURANT: "050000",
  TRANSPORT_HUB: "150000"
});

const amapPoiSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.union([z.string(), z.array(z.unknown())]).optional(),
  typecode: z.union([z.string(), z.array(z.unknown())]).optional(),
  address: z.union([z.string(), z.array(z.unknown())]).optional(),
  pname: z.union([z.string(), z.array(z.unknown())]).optional(),
  cityname: z.union([z.string(), z.array(z.unknown())]).optional(),
  adname: z.union([z.string(), z.array(z.unknown())]).optional(),
  location: z.string().regex(/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/)
}).passthrough();

const amapPoiResponseSchema = z.object({
  status: z.string(),
  info: z.string().optional(),
  infocode: z.string().optional(),
  pois: z.array(amapPoiSchema).default([])
}).passthrough();

const amapRouteResponseSchema = z.object({
  status: z.string(),
  info: z.string().optional(),
  infocode: z.string().optional(),
  route: z.object({
    taxi_cost: z.union([z.string(), z.number()]).optional(),
    paths: z.array(z.object({
      distance: z.union([z.string(), z.number()]),
      duration: z.union([z.string(), z.number()]).optional(),
      cost: z.object({
        duration: z.union([z.string(), z.number()]).optional(),
        tolls: z.union([z.string(), z.number()]).optional()
      }).passthrough().optional(),
      steps: z.array(z.object({ polyline: z.string().optional() }).passthrough()).optional()
    }).passthrough()).default([])
  }).passthrough().optional()
}).passthrough();

function assertAmapSuccess(payload) {
  if (payload.status === "1") return;
  const code = ["10001", "10002", "10004", "10007"].includes(payload.infocode)
    ? providerErrorCodes.authFailed
    : ["10003", "10044"].includes(payload.infocode)
      ? providerErrorCodes.rateLimited
      : providerErrorCodes.unavailable;
  throw new TravelProviderError(`AMap request failed: ${payload.info || "unknown error"}.`, { code });
}

function coordinate({ longitude, latitude }) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new TypeError("Route coordinates must contain finite longitude and latitude.");
  }
  return `${longitude.toFixed(6)},${latitude.toFixed(6)}`;
}

export class AmapTravelProvider {
  constructor({ apiKey, fetchImpl = fetch, timeoutMs = 8000, retries = 2 }) {
    if (!apiKey) throw new TypeError("AMap Web Service API key is required.");
    this.apiKey = apiKey;
    this.requestOptions = { fetchImpl, timeoutMs, retries };
  }

  async searchPois({ city, categories = [], signal }) {
    const adcode = cityAdcodes[city];
    if (!adcode) throw new TypeError(`Unsupported AMap city: ${city}.`);
    const params = new URLSearchParams({
      key: this.apiKey,
      city: adcode,
      city_limit: "true",
      types: categories.map((category) => categoryTypes[category]).filter(Boolean).join("|") || "110000",
      page_size: "25",
      page_num: "1",
      show_fields: "business,photos",
      output: "JSON"
    });
    const payload = await requestJson(`https://restapi.amap.com/v5/place/text?${params}`, {
      ...this.requestOptions,
      signal,
      schema: amapPoiResponseSchema
    });
    assertAmapSuccess(payload);
    return payload.pois;
  }

  async getRoute({ from, to, mode, city, signal }) {
    if (!cityAdcodes[city]) throw new TypeError(`Unsupported AMap city: ${city}.`);
    const routeMode = mode === "WALK" ? "walking" : "driving";
    const params = new URLSearchParams({
      key: this.apiKey,
      origin: coordinate(from),
      destination: coordinate(to),
      show_fields: "cost",
      output: "JSON"
    });
    const payload = await requestJson(`https://restapi.amap.com/v5/direction/${routeMode}?${params}`, {
      ...this.requestOptions,
      signal,
      schema: amapRouteResponseSchema
    });
    assertAmapSuccess(payload);
    const path = payload.route?.paths?.[0];
    if (!path) throw routeUnavailable();
    const durationSeconds = Number(path.cost?.duration ?? path.duration);
    const distanceMeters = Number(path.distance);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Number.isFinite(distanceMeters)) {
      throw routeUnavailable("AMap returned an incomplete route.");
    }
    return {
      provider: "AMAP",
      mode,
      distanceMeters: Math.round(distanceMeters),
      durationSeconds: Math.round(durationSeconds),
      tollsCny: Number(path.cost?.tolls ?? 0),
      taxiCostCny: Number(payload.route?.taxi_cost ?? 0),
      polyline: path.steps?.map(({ polyline }) => polyline).filter(Boolean).join(";") || undefined,
      retrievedAt: new Date().toISOString()
    };
  }
}
