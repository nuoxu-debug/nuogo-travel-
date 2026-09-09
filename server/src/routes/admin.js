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
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).strict(),
  address: bilingualSchema.optional(),
  status: statusSchema,
  sources: z.array(sourceSchema).min(1).max(20)
}).strict();
const costReferenceTiers = Object.freeze({
  ACCOMMODATION_ROOM_NIGHT: ["BUDGET", "MID_RANGE", "COMFORT"],
  LOCAL_TRANSPORT_PERSON_DAY: ["BUDGET", "BALANCED", "COMFORT"],
  FOOD_PERSON_DAY: ["ECONOMY", "BALANCED", "COMFORT"],
  MISCELLANEOUS_PERSON_DAY: ["BUDGET", "BALANCED", "COMFORT"]
});
const costReferenceSchema = z.object({
  id: z.string().min(1).max(80),
  city: destinationIdSchema,
  category: z.enum([
    "ACCOMMODATION_ROOM_NIGHT", "LOCAL_TRANSPORT_PERSON_DAY", "FOOD_PERSON_DAY",
    "ATTRACTION_PERSON_ENTRY", "ENTERTAINMENT_PERSON_ENTRY", "MISCELLANEOUS_PERSON_DAY"
  ]),
  tier: z.enum(["BUDGET", "MID_RANGE", "COMFORT", "BALANCED", "ECONOMY"]).nullable(),
  minMinor: z.number().int().nonnegative(),
  maxMinor: z.number().int().nonnegative(),
  representativeMinor: z.number().int().nonnegative(),
  currency: z.literal("SGD"),
  sourceName: z.string().trim().min(1).max(160),
  sourceUrl: httpsUrlSchema,
  collectedOn: z.string().date(),
  updatedAt: z.string().datetime(),
  status: statusSchema
}).strict().superRefine((value, context) => {
  const allowedTiers = costReferenceTiers[value.category];
  if (allowedTiers ? !allowedTiers.includes(value.tier) : value.tier !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["tier"], message: "Tier is invalid for this cost category." });
  }
  if (value.minMinor > value.representativeMinor || value.representativeMinor > value.maxMinor) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["representativeMinor"], message: "Representative value must be within the supplied range." });
  }
  if (value.collectedOn > value.updatedAt.slice(0, 10)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["collectedOn"], message: "Collected-on date cannot follow the update timestamp." });
  }
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
      const city = destinationIdSchema.parse(req.query.city);
      res.json({ costReferences: await repository.listCostReferences(city) });
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
