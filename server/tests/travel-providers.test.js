import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AmapTravelProvider } from "../src/providers/travel/amapProvider.js";
import { DemoTravelProvider } from "../src/providers/travel/demoTravelProvider.js";
import { requestJson } from "../src/providers/travel/httpClient.js";
import { OpenTripMapProvider } from "../src/providers/travel/openTripMapProvider.js";

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

describe("travel provider HTTP resilience", () => {
  it("retries transient failures within a bounded attempt count", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({}, 503))
      .mockResolvedValueOnce(response({ value: "ready" }));

    await expect(requestJson("https://provider.test/data", {
      fetchImpl,
      retries: 1,
      retryDelayMs: 0,
      schema: z.object({ value: z.string() })
    })).resolves.toEqual({ value: "ready" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry permanent client errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({}, 400));

    await expect(requestJson("https://provider.test/data", {
      fetchImpl,
      retries: 2,
      retryDelayMs: 0,
      schema: z.object({})
    })).rejects.toMatchObject({ code: "PROVIDER_AUTH_FAILED", status: 502 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps rate limits and malformed success payloads to stable provider errors", async () => {
    await expect(requestJson("https://provider.test/data", {
      fetchImpl: vi.fn().mockResolvedValue(response({}, 429)),
      retries: 0,
      schema: z.object({})
    })).rejects.toMatchObject({ code: "PROVIDER_RATE_LIMITED" });

    await expect(requestJson("https://provider.test/data", {
      fetchImpl: vi.fn().mockResolvedValue(response({ value: 3 })),
      retries: 0,
      schema: z.object({ value: z.string() })
    })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });

  it("aborts a request after the configured timeout", async () => {
    const fetchImpl = vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(options.signal.reason));
    }));

    await expect(requestJson("https://provider.test/slow", {
      fetchImpl,
      timeoutMs: 5,
      retries: 0,
      schema: z.object({})
    })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
});

describe("AMap travel provider", () => {
  it("maps bounded city POI searches without exposing its key in returned records", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      status: "1",
      info: "OK",
      infocode: "10000",
      pois: [{
        id: "B001",
        name: "Forbidden City",
        type: "Scenic spot",
        typecode: "110200",
        address: "4 Jingshan Front Street",
        pname: "Beijing",
        cityname: "Beijing",
        adname: "Dongcheng",
        location: "116.397026,39.918058"
      }]
    }));
    const provider = new AmapTravelProvider({ apiKey: "server-amap-key", fetchImpl });

    const pois = await provider.searchPois({ city: "beijing", categories: ["ATTRACTION"] });

    expect(fetchImpl.mock.calls[0][0]).toContain("key=server-amap-key");
    expect(fetchImpl.mock.calls[0][0]).toContain("city=110000");
    expect(pois).toEqual([expect.objectContaining({ id: "B001", location: "116.397026,39.918058" })]);
    expect(JSON.stringify(pois)).not.toContain("server-amap-key");
  });

  it("maps the first route and rejects an unavailable route", async () => {
    const successfulFetch = vi.fn().mockResolvedValue(response({
      status: "1",
      info: "OK",
      infocode: "10000",
      route: { paths: [{ distance: "2300", cost: { duration: "900", tolls: "5" } }] }
    }));
    const provider = new AmapTravelProvider({ apiKey: "server-amap-key", fetchImpl: successfulFetch });

    await expect(provider.getRoute({
      from: { longitude: 116.397, latitude: 39.918 },
      to: { longitude: 116.407, latitude: 39.904 },
      mode: "DRIVE",
      city: "beijing"
    })).resolves.toMatchObject({ distanceMeters: 2300, durationSeconds: 900, tollsCny: 5 });

    const unavailable = new AmapTravelProvider({
      apiKey: "server-amap-key",
      fetchImpl: vi.fn().mockResolvedValue(response({
        status: "1", info: "OK", infocode: "10000", route: { paths: [] }
      }))
    });
    await expect(unavailable.getRoute({
      from: { longitude: 116.397, latitude: 39.918 },
      to: { longitude: 116.407, latitude: 39.904 },
      mode: "DRIVE",
      city: "beijing"
    })).rejects.toMatchObject({ code: "ROUTE_UNAVAILABLE" });
  });
});

describe("OpenTripMap and demo travel providers", () => {
  it("requests tourism records around bounded coordinates", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response([{
      xid: "Q80290",
      name: "Temple of Heaven",
      kinds: "architecture,historic",
      dist: 312,
      rate: 3,
      point: { lon: 116.4065, lat: 39.8822 }
    }]));
    const provider = new OpenTripMapProvider({ apiKey: "server-otm-key", fetchImpl });

    const records = await provider.enrichTourism({
      city: "beijing",
      coordinates: { longitude: 116.4074, latitude: 39.9042 },
      radiusMeters: 5000
    });

    expect(fetchImpl.mock.calls[0][0]).toContain("radius=5000");
    expect(fetchImpl.mock.calls[0][0]).toContain("apikey=server-otm-key");
    expect(records[0]).toMatchObject({ xid: "Q80290", point: { lon: 116.4065, lat: 39.8822 } });
    expect(JSON.stringify(records)).not.toContain("server-otm-key");
  });

  it("returns stable demo POIs, routes, and supporting records", async () => {
    const provider = new DemoTravelProvider({ now: () => "2026-08-14T00:00:00.000Z" });
    const first = await provider.searchPois({ city: "beijing", categories: ["ATTRACTION"] });
    const second = await provider.searchPois({ city: "beijing", categories: ["ATTRACTION"] });
    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThanOrEqual(3);

    await expect(provider.getRoute({
      from: { longitude: 116.397, latitude: 39.918 },
      to: { longitude: 116.407, latitude: 39.904 },
      mode: "WALK",
      city: "beijing"
    })).resolves.toMatchObject({ provider: "DEMO", distanceMeters: expect.any(Number) });

    await expect(provider.enrichTourism({
      city: "beijing",
      coordinates: { longitude: 116.4074, latitude: 39.9042 },
      radiusMeters: 5000
    })).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ xid: expect.any(String) })]));
  });
});
