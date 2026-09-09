import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { MemoryRepository } from "../src/repositories/memory.js";

const config = {
  jwtSecret: "test-secret-with-enough-length",
  demoMode: true,
  aiProvider: "demo",
  clientOrigin: "http://localhost:5173"
};

async function register(app, repository, suffix, role = "user") {
  const response = await request(app).post("/api/auth/register").send({
    name: `${role} Student`,
    email: `${suffix}@nuogo.test`,
    password: "Nuogo123!"
  });
  await repository.setUserRole(response.body.user.id, role);
  return response.body.token;
}

const poi = {
  id: "poi-singapore-palace",
  destinationId: "singapore",
  name: { en: "Palace Museum", zh: "故宫博物院" },
  category: "ATTRACTION",
  coordinates: { latitude: 1.2903, longitude: 103.8514 },
  address: { en: "4 Jingshan Front Street", zh: "景山前街4号" },
  status: "ACTIVE",
  sources: [{
    provider: "AMAP",
    sourceId: "B000A8UIN8",
    sourceUrl: "https://www.amap.com/place/B000A8UIN8",
    retrievedAt: "2026-08-14T00:00:00.000Z"
  }]
};

const costReference = {
  id: "cost-singapore-food",
  city: "singapore",
  category: "FOOD_PERSON_DAY",
  tier: "BALANCED",
  minMinor: 3000,
  maxMinor: 4000,
  representativeMinor: 3500,
  currency: "SGD",
  sourceName: "University travel survey",
  sourceUrl: "https://example.edu/travel-costs",
  collectedOn: "2026-08-14",
  updatedAt: "2026-08-14T12:00:00.000Z",
  status: "ACTIVE"
};

describe("administration API", () => {
  let app;
  let repository;
  let adminToken;

  beforeEach(async () => {
    repository = new MemoryRepository();
    app = createApp({
      repository,
      planProvider: {},
      attractionCatalogue: { listApproved: () => [] },
      config
    });
    adminToken = await register(app, repository, "admin", "admin");
  });

  it("requires authentication and the admin role", async () => {
    await request(app).get("/api/admin/destinations").expect(401);
    const userToken = await register(app, repository, "ordinary");
    const denied = await request(app).get("/api/admin/destinations")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
    expect(denied.body.error.code).toBe("ADMIN_REQUIRED");
  });

  it("lists destinations and updates lifecycle status", async () => {
    const listed = await request(app).get("/api/admin/destinations")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.destinations.map(({ id }) => id)).toEqual(["singapore"]);

    await request(app).patch("/api/admin/destinations/singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "OUTDATED" })
      .expect(200, { destination: { id: "singapore", status: "OUTDATED" } });
    await request(app).patch("/api/admin/destinations/singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "deleted" })
      .expect(400);
  });

  it("creates, lists, updates, and retires canonical POI metadata", async () => {
    await request(app).put(`/api/admin/pois/${poi.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(poi)
      .expect(200);
    const listed = await request(app).get("/api/admin/pois?destinationId=singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.pois).toEqual([poi]);

    await request(app).put(`/api/admin/pois/${poi.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...poi, status: "OUTDATED" })
      .expect(200);
    const retired = await request(app).delete(`/api/admin/pois/${poi.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(retired.body.poi.status).toBe("UNAVAILABLE");
  });

  it("rejects POIs with invalid source metadata or coordinates", async () => {
    await request(app).put(`/api/admin/pois/${poi.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...poi, coordinates: { latitude: 70, longitude: 116 }, sources: [] })
      .expect(400);
    await request(app).put(`/api/admin/pois/${poi.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...poi, sources: [{ ...poi.sources[0], sourceUrl: "http://insecure.test" }] })
      .expect(400);
  });

  it("creates, lists, updates, and retires evidenced cost references", async () => {
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(costReference)
      .expect(200);
    const listed = await request(app).get("/api/admin/cost-references?city=singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.costReferences).toEqual([costReference]);

    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, maxMinor: 4500, representativeMinor: 4200 })
      .expect(200);
    const retired = await request(app).delete(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(retired.body.costReference.status).toBe("UNAVAILABLE");
  });

  it("accepts and returns null tiers for untiered cost references", async () => {
    const untiered = {
      ...costReference,
      id: "cost-singapore-entry",
      category: "ATTRACTION_PERSON_ENTRY",
      tier: null,
      sourceName: "  University entry survey  "
    };
    const persisted = { ...untiered, sourceName: "University entry survey" };
    await request(app).put(`/api/admin/cost-references/${untiered.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(untiered)
      .expect(200, { costReference: persisted });

    const listed = await request(app).get("/api/admin/cost-references?city=singapore")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.costReferences).toEqual([persisted]);
  });

  it("rejects incoherent ranges, tiers, statuses, and missing evidence", async () => {
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, representativeMinor: 5000 })
      .expect(400);
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, sourceUrl: undefined })
      .expect(400);
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, status: "DRAFT" })
      .expect(400);
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, tier: "LUXURY" })
      .expect(400);
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, amountFen: 3500 })
      .expect(400);
    await request(app).put(`/api/admin/cost-references/${costReference.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...costReference, sourceName: "   " })
      .expect(400);
  });

  it("does not expose user, system-record, or separate provider-cache maintenance", async () => {
    for (const path of ["/api/admin/users", "/api/admin/system-records", "/api/admin/provider-records?destinationId=singapore"]) {
      await request(app).get(path)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    }
  });
});
