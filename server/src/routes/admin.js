import { Router } from "express";
import { supportedDestinationIds } from "@nuogo/shared/constants";
import { z } from "zod";
import { authorizeRole } from "../middleware/authorizeRole.js";
import { attractionPriceReferenceTiers } from "../services/budget/attractionPriceResolver.js";

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
  PUBLIC_TRANSPORT_DISTANCE_FARE: ["KM_0_32", "KM_32_42", "KM_42_52", "KM_52_72", "KM_72_999"],
  TAXI_OR_RIDE_HAIL_ESTIMATE: ["BASE_FARE", "PER_KM"],
  FOOD_PERSON_DAY: ["ECONOMY", "BALANCED", "COMFORT"],
  ATTRACTION_PERSON_ENTRY: attractionPriceReferenceTiers,
  MISCELLANEOUS_PERSON_DAY: ["BUDGET", "BALANCED", "COMFORT"]
});
const referenceTypeSchema = z.enum(["EXACT", "FREE", "CATEGORY_FALLBACK", "GENERIC_FALLBACK"]);
const sourceTypeSchema = z.enum(["OFFICIAL", "GOVERNMENT", "COMMERCIAL", "SYSTEM_ESTIMATE"]);
const unitTypeSchema = z.enum(["PER_PERSON_ENTRY", "PER_PERSON_DAY", "PER_ROOM_NIGHT", "PER_TRIP", "PER_LEG"]);
const operatingHourVerificationStatusSchema = z.enum(["PENDING_REVIEW", "VERIFIED", "REJECTED"]);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const operatingHourBaseSchema = z.object({
  sourceName: z.string().trim().min(1).max(160),
  sourceUrl: httpsUrlSchema,
  sourceType: sourceTypeSchema,
  lastReviewedDate: z.string().date(),
  verificationStatus: operatingHourVerificationStatusSchema.default("PENDING_REVIEW"),
  verifiedAt: z.string().datetime().optional(),
  verifiedByUserId: z.string().min(1).max(120).optional(),
  status: statusSchema,
  notes: z.string().trim().min(1).max(500).optional()
}).strict();
const operatingHourSchema = operatingHourBaseSchema.extend({
  id: z.string().min(1).max(120),
  poiId: z.string().min(1).max(120),
  dayOfWeek: z.number().int().min(0).max(6),
  opensAt: timeSchema.nullable(),
  closesAt: timeSchema.nullable(),
  isClosed: z.boolean()
}).strict().superRefine((value, context) => {
  if (!value.isClosed && (!value.opensAt || !value.closesAt || value.opensAt >= value.closesAt)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["opensAt"], message: "Open records require a valid opening interval." });
  }
});
const operatingHourExceptionSchema = operatingHourBaseSchema.extend({
  id: z.string().min(1).max(120),
  poiId: z.string().min(1).max(120),
  exceptionDate: z.string().date(),
  opensAt: timeSchema.nullable(),
  closesAt: timeSchema.nullable(),
  isClosed: z.boolean(),
  reason: z.string().trim().min(1).max(240).optional()
}).strict().superRefine((value, context) => {
  if (!value.isClosed && (!value.opensAt || !value.closesAt || value.opensAt >= value.closesAt)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["opensAt"], message: "Open exception records require a valid opening interval." });
  }
});
const costReferenceSchema = z.object({
  id: z.string().min(1).max(80),
  city: destinationIdSchema,
  destinationId: destinationIdSchema.optional(),
  poiId: z.string().trim().min(1).max(120).optional(),
  category: z.enum([
    "ACCOMMODATION_ROOM_NIGHT", "LOCAL_TRANSPORT_PERSON_DAY", "PUBLIC_TRANSPORT_DISTANCE_FARE",
    "TAXI_OR_RIDE_HAIL_ESTIMATE", "FOOD_PERSON_DAY",
    "ATTRACTION_PERSON_ENTRY", "ENTERTAINMENT_PERSON_ENTRY", "MISCELLANEOUS_PERSON_DAY"
  ]),
  tier: z.enum([
    "BUDGET", "MID_RANGE", "COMFORT", "BALANCED", "ECONOMY",
    "KM_0_32", "KM_32_42", "KM_42_52", "KM_52_72", "KM_72_999",
    "BASE_FARE", "PER_KM",
    ...attractionPriceReferenceTiers
  ]).nullable(),
  minMinor: z.number().int().nonnegative(),
  maxMinor: z.number().int().nonnegative(),
  representativeMinor: z.number().int().nonnegative(),
  currency: z.literal("SGD"),
  sourceName: z.string().trim().min(1).max(160),
  sourceUrl: httpsUrlSchema,
  collectedOn: z.string().date(),
  updatedAt: z.string().datetime(),
  referenceType: referenceTypeSchema.optional(),
  unitType: unitTypeSchema.optional(),
  priceBasis: z.string().trim().min(1).max(160).optional(),
  sourceType: sourceTypeSchema.optional(),
  lastReviewedDate: z.string().date().optional(),
  notes: z.string().trim().min(1).max(500).optional(),
  status: statusSchema
}).strict().superRefine((value, context) => {
  const allowedTiers = costReferenceTiers[value.category];
  if (allowedTiers ? !(value.tier === null || allowedTiers.includes(value.tier)) : value.tier !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["tier"], message: "Tier is invalid for this cost category." });
  }
  if (value.minMinor > value.representativeMinor || value.representativeMinor > value.maxMinor) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["representativeMinor"], message: "Representative value must be within the supplied range." });
  }
  if (value.collectedOn > value.updatedAt.slice(0, 10)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["collectedOn"], message: "Collected-on date cannot follow the update timestamp." });
  }
  if (value.destinationId && value.destinationId !== value.city) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["destinationId"], message: "Destination ID must match city." });
  }
  if (["EXACT", "FREE"].includes(value.referenceType) && !value.poiId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["poiId"], message: "POI-specific price references require a POI ID." });
  }
  if (value.referenceType === "FREE" && (value.minMinor !== 0 || value.representativeMinor !== 0 || value.maxMinor !== 0)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["representativeMinor"], message: "Free references must use a zero price range." });
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

function isVerifiedOperatingHour(record) {
  return record.status === "ACTIVE" && record.verificationStatus === "VERIFIED";
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

  router.get("/poi-operating-hours", async (req, res, next) => {
    try {
      const destinationId = destinationIdSchema.parse(req.query.destinationId);
      const [pois, operatingHours, operatingHourExceptions] = await Promise.all([
        repository.listCanonicalPois(destinationId),
        repository.listPoiOperatingHours(destinationId),
        repository.listPoiOperatingHourExceptions(destinationId)
      ]);
      const activePoiIds = new Set([
        ...operatingHours.filter(isVerifiedOperatingHour).map(({ poiId }) => poiId),
        ...operatingHourExceptions.filter(isVerifiedOperatingHour).map(({ poiId }) => poiId)
      ]);
      const canonicalPoiCount = pois.filter(({ status }) => status !== "UNAVAILABLE").length;
      res.json({
        operatingHours,
        operatingHourExceptions,
        coverage: {
          canonicalPoiCount,
          activeOperatingHoursPoiCount: activePoiIds.size,
          activeOperatingHoursPoiPercentage: canonicalPoiCount === 0 ? null : Math.round((activePoiIds.size / canonicalPoiCount) * 100)
        }
      });
    } catch (error) { next(error); }
  });

  router.put("/poi-operating-hours/:recordId", async (req, res, next) => {
    try {
      const operatingHour = operatingHourSchema.parse(req.body);
      assertPathId(req.params.recordId, operatingHour.id);
      res.json({ operatingHour: await repository.upsertPoiOperatingHour(operatingHour) });
    } catch (error) { next(error); }
  });

  router.patch("/poi-operating-hours/:recordId/verification", async (req, res, next) => {
    try {
      const verificationStatus = operatingHourVerificationStatusSchema.parse(req.body.verificationStatus);
      const destinations = await repository.listSupportedDestinations();
      let operatingHour;
      for (const { id } of destinations) {
        operatingHour = (await repository.listPoiOperatingHours(id))
          .find(({ id: recordId }) => recordId === req.params.recordId);
        if (operatingHour) break;
      }
      if (!operatingHour) throw notFound("Operating hour");
      const reviewed = {
        ...operatingHour,
        verificationStatus,
        verifiedAt: new Date().toISOString(),
        verifiedByUserId: req.user.id
      };
      res.json({ operatingHour: await repository.upsertPoiOperatingHour(reviewed) });
    } catch (error) { next(error); }
  });

  router.put("/poi-operating-hour-exceptions/:recordId", async (req, res, next) => {
    try {
      const operatingHourException = operatingHourExceptionSchema.parse(req.body);
      assertPathId(req.params.recordId, operatingHourException.id);
      res.json({
        operatingHourException: await repository.upsertPoiOperatingHourException(operatingHourException)
      });
    } catch (error) { next(error); }
  });

  router.patch("/poi-operating-hour-exceptions/:recordId/verification", async (req, res, next) => {
    try {
      const verificationStatus = operatingHourVerificationStatusSchema.parse(req.body.verificationStatus);
      const destinations = await repository.listSupportedDestinations();
      let operatingHourException;
      for (const { id } of destinations) {
        operatingHourException = (await repository.listPoiOperatingHourExceptions(id))
          .find(({ id: recordId }) => recordId === req.params.recordId);
        if (operatingHourException) break;
      }
      if (!operatingHourException) throw notFound("Operating hour exception");
      const reviewed = {
        ...operatingHourException,
        verificationStatus,
        verifiedAt: new Date().toISOString(),
        verifiedByUserId: req.user.id
      };
      res.json({
        operatingHourException: await repository.upsertPoiOperatingHourException(reviewed)
      });
    } catch (error) { next(error); }
  });

  router.delete("/poi-operating-hours/:recordId", async (req, res, next) => {
    try {
      const destinations = await repository.listSupportedDestinations();
      let operatingHour;
      for (const { id } of destinations) {
        operatingHour = (await repository.listPoiOperatingHours(id))
          .find(({ id: recordId }) => recordId === req.params.recordId);
        if (operatingHour) break;
      }
      if (!operatingHour) throw notFound("Operating hour");
      res.json({
        operatingHour: await repository.upsertPoiOperatingHour({ ...operatingHour, status: "UNAVAILABLE" })
      });
    } catch (error) { next(error); }
  });

  router.delete("/poi-operating-hour-exceptions/:recordId", async (req, res, next) => {
    try {
      const destinations = await repository.listSupportedDestinations();
      let operatingHourException;
      for (const { id } of destinations) {
        operatingHourException = (await repository.listPoiOperatingHourExceptions(id))
          .find(({ id: recordId }) => recordId === req.params.recordId);
        if (operatingHourException) break;
      }
      if (!operatingHourException) throw notFound("Operating hour exception");
      res.json({
        operatingHourException: await repository.upsertPoiOperatingHourException({ ...operatingHourException, status: "UNAVAILABLE" })
      });
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
