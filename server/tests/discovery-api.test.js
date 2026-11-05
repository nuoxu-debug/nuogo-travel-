import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { MemoryRepository } from "../src/repositories/memory.js";

function appWith(discoverAttractions) {
  const repository = new MemoryRepository();
  const app = createApp({
    repository,
    objectivePlanner: vi.fn(),
    discoverAttractions,
    config: {
      jwtSecret: "test-secret-with-enough-length",
      demoMode: true,
      runtimeMode: "demo",
      aiProvider: "demo",
      travelDataProvider: "demo",
      clientOrigin: "http://localhost:5173"
    }
  });
  return { app, repository };
}

async function register(app, email = "discover@nuogo.test") {
  const response = await request(app).post("/api/auth/register").send({
    name: "Discovery User",
    email,
    password: "Nuogo123!"
  }).expect(201);
  return { Authorization: `Bearer ${response.body.token}` };
}

const attraction = {
  xid: "otm-bj-forbidden-city",
  destination: "singapore",
  name: { en: "Forbidden City", zh: "故宫博物院" },
  description: { en: "A palace complex.", zh: "皇家宫殿建筑群。" },
  category: "HISTORY",
  suggestedVisitDurationMinutes: 180,
  coordinates: { longitude: 116.397, latitude: 39.918, coordinateSystem: "WGS84" },
  source: {
    provider: "DEMO",
    sourceType: "DEMO",
    retrievedAt: "2026-08-27T00:00:00.000Z",
    matchStatus: "MATCHED",
    verificationStatus: "SUPPORTING_ONLY"
  }
};

describe("destination discovery API", () => {
  it("lets anonymous visitors browse attractions without creating an account", async () => {
    const { app, repository } = appWith(vi.fn(async () => [attraction]));
    const response = await request(app)
      .get("/api/meta/destinations/singapore/attractions")
      .expect(200);
    expect(response.body).toMatchObject({ candidateCount: 1, attractions: [{ xid: attraction.xid }] });
    expect(repository.users.size).toBe(0);
  });

  it("returns controlled destination content and normalized candidates", async () => {
    const discoverAttractions = vi.fn(async () => [attraction]);
    const { app } = appWith(discoverAttractions);
    const auth = await register(app);
    const response = await request(app)
      .get("/api/meta/destinations/singapore/attractions")
      .set(auth)
      .expect(200);
    expect(response.body).toMatchObject({
      destination: "singapore",
      introduction: { zh: expect.any(String) },
      candidateCount: 1,
      providerMode: "demo",
      attractions: [{ xid: "otm-bj-forbidden-city" }]
    });
    expect(discoverAttractions).toHaveBeenCalledWith({ destination: "singapore", signal: expect.any(AbortSignal) });
  });

  it("returns an empty grounded result without invoking planning", async () => {
    const objectivePlanner = vi.fn();
    const repository = new MemoryRepository();
    const app = createApp({
      repository,
      objectivePlanner,
      discoverAttractions: vi.fn(async () => []),
      config: {
        jwtSecret: "test-secret-with-enough-length",
        demoMode: true,
        runtimeMode: "demo",
        aiProvider: "demo",
        travelDataProvider: "demo",
        clientOrigin: "http://localhost:5173"
      }
    });
    const auth = await register(app, "empty-discovery@nuogo.test");
    const response = await request(app)
      .get("/api/meta/destinations/singapore/attractions")
      .set(auth)
      .expect(200);
    expect(response.body).toMatchObject({ candidateCount: 0, attractions: [] });
    expect(objectivePlanner).not.toHaveBeenCalled();
  });

  it.each(["chengdu", "..%2Fadmin"])("rejects unsupported destination %s", async (destination) => {
    const { app } = appWith(vi.fn());
    const auth = await register(app, `unsupported-${destination.replace(/\W/g, "")}@nuogo.test`);
    await request(app)
      .get(`/api/meta/destinations/${destination}/attractions`)
      .set(auth)
      .expect(400);
  });

  it("maps provider failures to a safe response", async () => {
    const error = Object.assign(new Error("private upstream detail"), { code: "PROVIDER_UNAVAILABLE" });
    const { app } = appWith(vi.fn().mockRejectedValue(error));
    const auth = await register(app, "provider-failure@nuogo.test");
    const response = await request(app)
      .get("/api/meta/destinations/singapore/attractions")
      .set(auth)
      .expect(503);
    expect(response.body.error.code).toBe("ATTRACTION_DISCOVERY_UNAVAILABLE");
    expect(JSON.stringify(response.body)).not.toContain("private upstream detail");
  });
});
