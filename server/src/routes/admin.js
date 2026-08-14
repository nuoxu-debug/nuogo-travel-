import { Router } from "express";
import { supportedDestinationIds } from "@nuogo/shared/constants";
import { z } from "zod";
import { authorizeRole } from "../middleware/authorizeRole.js";

const statusSchema = z.enum(["ACTIVE", "OUTDATED", "UNAVAILABLE"]);
const destinationIdSchema = z.enum(supportedDestinationIds);
const bilingualSchema = z.object({ en: z.string().min(1).max(240), zh: z.string().min(1).max(240) }).strict();
const httpsUrlSchema = z.string().url().refine((value) => value.startsWith("https://"), "Source URL must use HTTPS.");
const sourceSchema = z.object({
  provider: z.string().min(1).max(40),
  sourceId: z.string().min(1).max(160),
  sourceUrl: httpsUrlSchema.optional(),
  retrievedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional()
}).strict();
const poiSchema = z.object({
  id: z.string().min(1).max(80),
  destinationId: destinationIdSchema,
  name: bilingualSchema,
  category: z.enum(["ATTRACTION", "HOTEL", "RESTAURANT", "TRANSPORT_HUB", "OTHER"]),
  coordinates: z.object({
    latitude: z.number().min(18).max(54),
    longitude: z.number().min(73).max(135)
  }).strict(),
  address: bilingualSchema.optional(),
  status: statusSchema,
  sources: z.array(sourceSchema).min(1).max(20)
}).strict();
const costReferenceSchema = z.object({
  id: z.string().min(1).max(80),
  destinationId: destinationIdSchema,
  category: z.enum([
    "ACCOMMODATION_ROOM_NIGHT", "FOOD_PERSON_MEAL", "ATTRACTION_PERSON_ENTRY",
    "ENTERTAINMENT_PERSON_ENTRY", "OTHER_TRIP", "FUEL_LITRE", "PARKING_DAY"
  ]),
  unit: z.string().min(1).max(40),
  amountFen: z.number().int().nonnegative(),
  source: z.object({
    provider: z.string().min(1).max(80),
    sourceUrl: httpsUrlSchema.optional(),
    retrievedAt: z.string().datetime()
  }).strict(),
  effectiveFrom: z.string().date().optional(),
  effectiveTo: z.string().date().optional(),
  status: statusSchema
}).strict().refine((value) => !value.effectiveFrom || !value.effectiveTo || value.effectiveTo >= value.effectiveFrom, {
  path: ["effectiveTo"],
  message: "Effective-to date must not precede effective-from date."
});

function notFound(resource) {
  return Object.assign(new Error(`${resource} was not found.`), { code: "NOT_FOUND", status: 404 });
}

function assertPathId(pathId, bodyId) {
  if (pathId !== bodyId) {
    throw Object.assign(new Error("Path and record IDs must match."), { code: "VALIDATION_ERROR", status: 400 });
  }
}

export function createAdminRouter({ repository, authenticate }) {
  const router = Router();
  router.use(authenticate, authorizeRole(repository, "admin"));

  router.get("/destinations", async (_req, res, next) => {
    try {
      res.json({ destinations: await repository.listSupportedDestinations() });
    } catch (error) { next(error); }
  });

  router.patch("/destinations/:destinationId", async (req, res, next) => {
    try {
      const destinationId = destinationIdSchema.parse(req.params.destinationId);
      const status = statusSchema.parse(req.body.status);
      const destination = await repository.setDestinationStatus(destinationId, status);
      if (!destination) throw notFound("Destination");
      res.json({ destination });
    } catch (error) { next(error); }
  });

  router.get("/pois", async (req, res, next) => {
    try {
      const destinationId = destinationIdSchema.parse(req.query.destinationId);
      res.json({ pois: await repository.listCanonicalPois(destinationId) });
    } catch (error) { next(error); }
  });

  router.put("/pois/:poiId", async (req, res, next) => {
    try {
      const poi = poiSchema.parse(req.body);
      assertPathId(req.params.poiId, poi.id);
      res.json({ poi: await repository.upsertCanonicalPoi(poi) });
    } catch (error) { next(error); }
  });

  router.delete("/pois/:poiId", async (req, res, next) => {
    try {
      const destinations = await repository.listSupportedDestinations();
      let poi;
      for (const { id } of destinations) {
        poi = (await repository.listCanonicalPois(id)).find(({ id: poiId }) => poiId === req.params.poiId);
        if (poi) break;
      }
      if (!poi) throw notFound("POI");
      res.json({ poi: await repository.upsertCanonicalPoi({ ...poi, status: "UNAVAILABLE" }) });
    } catch (error) { next(error); }
  });

  router.get("/cost-references", async (req, res, next) => {
    try {
      const destinationId = destinationIdSchema.parse(req.query.destinationId);
      res.json({ costReferences: await repository.listCostReferences(destinationId) });
    } catch (error) { next(error); }
  });

  router.put("/cost-references/:referenceId", async (req, res, next) => {
    try {
      const costReference = costReferenceSchema.parse(req.body);
      assertPathId(req.params.referenceId, costReference.id);
      res.json({ costReference: await repository.upsertCostReference(costReference) });
    } catch (error) { next(error); }
  });

  router.delete("/cost-references/:referenceId", async (req, res, next) => {
    try {
      const destinations = await repository.listSupportedDestinations();
      let costReference;
      for (const { id } of destinations) {
        costReference = (await repository.listCostReferences(id))
          .find(({ id: referenceId }) => referenceId === req.params.referenceId);
        if (costReference) break;
      }
      if (!costReference) throw notFound("Cost reference");
      res.json({
        costReference: await repository.upsertCostReference({ ...costReference, status: "UNAVAILABLE" })
      });
    } catch (error) { next(error); }
  });

  return router;
}
