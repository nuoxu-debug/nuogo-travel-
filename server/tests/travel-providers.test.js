import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
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

describe("OpenTripMap and demo travel providers", () => {
  it("requests attraction records around bounded coordinates", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response([{
      xid: "Q80290",
      name: "Temple of Heaven",
      kinds: "architecture,historic",
      dist: 312,
      rate: 3,
      point: { lon: 116.4065, lat: 39.8822 }
    }]));
    const provider = new OpenTripMapProvider({ apiKey: "server-otm-key", fetchImpl });

    const records = await provider.listAttractions({
      city: "singapore",
      coordinates: { longitude: 116.4074, latitude: 39.9042 },
      radiusMeters: 5000
    });

    expect(fetchImpl.mock.calls[0][0]).toContain("radius=5000");
    expect(fetchImpl.mock.calls[0][0]).toContain("apikey=server-otm-key");
    expect(records[0]).toMatchObject({ xid: "Q80290", point: { lon: 116.4065, lat: 39.8822 } });
    expect(JSON.stringify(records)).not.toContain("server-otm-key");
  });

  it("retrieves one attraction detail record by xid", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      xid: "Q80290",
      name: "Temple of Heaven",
      kinds: "architecture,historic",
      point: { lon: 116.4065, lat: 39.8822 },
      otm: "https://opentripmap.com/en/card/Q80290",
      wikipedia_extracts: { text: "A historic ceremonial complex." },
      info: { descr: "Provider detail." },
      address: { city: "Singapore" },
      preview: { source: "https://images.example.test/temple.jpg" }
    }));
    const provider = new OpenTripMapProvider({ apiKey: "server-otm-key", fetchImpl });

    const record = await provider.getAttractionDetails({ xid: "Q80290" });

    expect(fetchImpl.mock.calls[0][0]).toContain("/places/xid/Q80290");
    expect(fetchImpl.mock.calls[0][0]).toContain("apikey=server-otm-key");
    expect(record).toMatchObject({
      xid: "Q80290",
      name: "Temple of Heaven",
      wikipedia_extracts: { text: "A historic ceremonial complex." },
      preview: { source: "https://images.example.test/temple.jpg" }
    });
  });

  it("rejects malformed attraction lists and bounds timed out calls", async () => {
    const malformed = new OpenTripMapProvider({
      apiKey: "server-otm-key",
      fetchImpl: vi.fn().mockResolvedValue(response({ features: [] })),
      retries: 0
    });
    await expect(malformed.listAttractions({
      city: "singapore",
      coordinates: { longitude: 116.4074, latitude: 39.9042 },
      radiusMeters: 5000
    })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });

    const timedOutFetch = vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(options.signal.reason));
    }));
    const timedOut = new OpenTripMapProvider({
      apiKey: "server-otm-key",
      fetchImpl: timedOutFetch,
      timeoutMs: 5,
      retries: 0
    });
    await expect(timedOut.getAttractionDetails({ xid: "Q80290" }))
      .rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(timedOutFetch).toHaveBeenCalledTimes(1);
  });

  it("returns stable demo POIs, routes, and supporting records", async () => {
    const provider = new DemoTravelProvider({ now: () => "2026-08-14T00:00:00.000Z" });
    const first = await provider.searchPois({ city: "singapore", categories: ["ATTRACTION"] });
    const second = await provider.searchPois({ city: "singapore", categories: ["ATTRACTION"] });
    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThanOrEqual(3);

    await expect(provider.getRoute({
      from: { longitude: 103.8514, latitude: 1.2903 },
      to: { longitude: 103.8593, latitude: 1.2863 },
      mode: "WALK",
      city: "singapore"
    })).resolves.toMatchObject({ provider: "DEMO", distanceMeters: expect.any(Number) });

    await expect(provider.listAttractions({
      city: "singapore",
      coordinates: { longitude: 103.8198, latitude: 1.3521 },
      radiusMeters: 20_000
    })).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ xid: expect.any(String) })]));
    const candidates = await provider.listAttractions({
      city: "singapore",
      coordinates: { longitude: 103.8198, latitude: 1.3521 },
      radiusMeters: 20_000
    });
    expect(candidates.map(({ xid }) => xid)).toEqual(expect.arrayContaining([
      "demo-sg-gardens-by-the-bay",
      "demo-sg-national-gallery"
    ]));
    expect(candidates.every(({ xid }) => xid.startsWith("demo-sg-"))).toBe(true);
  });

  it("provides grounded outdoor and indoor candidates for rainy-day demo scenarios", async () => {
    const provider = new DemoTravelProvider({ now: () => "2026-08-14T00:00:00.000Z" });

    for (const [city, center] of [["singapore", { longitude: 103.8198, latitude: 1.3521 }]]) {
      const candidates = await provider.listAttractions({
        city,
        coordinates: center,
        radiusMeters: 20_000
      });

      expect(candidates.some(({ kinds }) => /natural|parks|gardens|viewpoints/.test(kinds))).toBe(true);
      expect(candidates.some(({ kinds }) => /museums|cultural|historic|architecture/.test(kinds))).toBe(true);
    }
  });
});
