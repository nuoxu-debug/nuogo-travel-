import { randomUUID } from "node:crypto";
import { Router } from "express";
import { activitySchema, tripRevisionSchema } from "@nuogo/shared/schemas";
import { calculateBudget } from "../services/budget.js";
import { validateGroundedItinerary } from "../services/grounding.js";
import { parseItinerary } from "../services/parser.js";
import { getTripAccess, requireTripRole } from "../services/tripAccess.js";

function activityNotFound() {
  const error = new Error("Activity or day was not found.");
  error.code = "NOT_FOUND";
  error.status = 404;
  return error;
}

function versionConflict() {
  const error = new Error(
    "This trip changed while you were editing. The latest version has been loaded."
  );
  error.code = "TRIP_VERSION_CONFLICT";
  error.status = 409;
  return error;
}

function validationError(message) {
  const error = new Error(message);
  error.code = "VALIDATION_ERROR";
  error.status = 400;
  return error;
}

function expectedRevision(body) {
  return tripRevisionSchema.parse({
    expectedRevision: body.expectedRevision
  }).expectedRevision;
}

async function authorizeContext(repository, context, userId) {
  if (!context) throw activityNotFound();
  return requireTripRole(
    await getTripAccess(repository, context.trip.id, userId),
    ["editor"]
  );
}

function budgetFor(context) {
  return calculateBudget(context.variant, context.trip.totalBudget);
}

function buildActivity(body, order) {
  return activitySchema.parse({
    id: randomUUID(),
    order,
    startTime: body.startTime,
    endTime: body.endTime,
    name: body.name,
    description: body.description,
    category: body.category,
    address: body.address,
    location: body.location,
    estimatedCost: Number(body.estimatedCost),
    transportNote: body.transportNote,
    guide: body.guide,
    votes: 0,
    isFavorite: false
  });
}

async function generateGroundedVariant(current, planProvider, attractionCatalogue) {
  const destination = current.trip.preferences.destination;
  const attractions = attractionCatalogue?.listApproved(destination) ?? [];
  if (destination === "huangshan" && attractions.length === 0) {
    const error = new Error("No approved Huangshan attractions are available.");
    error.code = "ATTRACTION_CATALOGUE_EMPTY";
    error.status = 422;
    throw error;
  }
  const raw = await planProvider.generate(
    current.trip.preferences,
    current.variant.style,
    { attractions }
  );
  return validateGroundedItinerary(
    parseItinerary(raw),
    attractions,
    destination
  );
}

export function createActivitiesRouter({
  repository,
  planProvider,
  attractionCatalogue,
  authenticate
}) {
  const router = Router();

  router.post("/trips/:tripId/days/:dayId/activities", authenticate, async (req, res, next) => {
    try {
      const context = await repository.findDayContext(req.params.tripId, req.params.dayId);
      await authorizeContext(repository, context, req.user.id);
      const revision = expectedRevision(req.body);
      const activity = buildActivity(req.body, context.day.activities.length);
      const saved = await repository.addActivity(
        req.params.tripId,
        req.params.dayId,
        req.user.id,
        activity,
        revision,
        {
          action: "activity.created",
          entityType: "activity",
          entityId: activity.id,
          summary: { dayId: req.params.dayId }
        }
      );
      if (!saved) throw versionConflict();
      res.status(201).json({
        activity: saved.activity,
        budget: budgetFor(saved),
        revision: saved.revision
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/activities/:activityId", authenticate, async (req, res, next) => {
    try {
      const allowed = [
        "startTime", "endTime", "name", "description", "category",
        "address", "location", "estimatedCost", "transportNote", "guide"
      ];
      const patch = Object.fromEntries(
        allowed.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]])
      );
      if (typeof patch.estimatedCost === "string" && patch.estimatedCost.trim()) {
        patch.estimatedCost = Number(patch.estimatedCost);
      }
      const current = await repository.findActivityContext(req.params.activityId);
      await authorizeContext(repository, current, req.user.id);
      if (!Object.keys(patch).length) {
        throw validationError("Provide a supported activity field to update.");
      }
      const revision = expectedRevision(req.body);
      const changesSourcedFacts = [
        "name",
        "description",
        "category",
        "address",
        "location",
        "guide"
      ].some((key) =>
        patch[key] !== undefined &&
        JSON.stringify(patch[key]) !== JSON.stringify(current.activity[key])
      );
      if (changesSourcedFacts) {
        patch.sourceAttractionId = undefined;
        patch.sourceProvider = undefined;
        patch.sourceUrl = undefined;
        patch.imageUrl = undefined;
        patch.imageAttribution = undefined;
        patch.visitDetails = undefined;
        if (patch.location !== undefined) patch.locationIsEstimated = undefined;
      }
      const validated = activitySchema.parse({ ...current.activity, ...patch });
      for (const key of Object.keys(patch)) patch[key] = validated[key];
      const context = await repository.updateActivity(
        req.params.activityId,
        req.user.id,
        patch,
        revision,
        {
          action: "activity.updated",
          entityType: "activity",
          entityId: req.params.activityId,
          summary: { fields: Object.keys(patch) }
        }
      );
      if (!context) throw versionConflict();
      res.json({
        activity: context.activity,
        budget: budgetFor(context),
        revision: context.revision
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/activities/:activityId", authenticate, async (req, res, next) => {
    try {
      const current = await repository.findActivityContext(req.params.activityId);
      await authorizeContext(repository, current, req.user.id);
      const revision = expectedRevision(req.body);
      const context = await repository.deleteActivity(
        req.params.activityId,
        req.user.id,
        revision,
        {
          action: "activity.deleted",
          entityType: "activity",
          entityId: req.params.activityId,
          summary: { dayId: current.day.id }
        }
      );
      if (!context) throw versionConflict();
      res.json({
        deletedId: req.params.activityId,
        budget: budgetFor(context),
        revision: context.revision
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/trips/:tripId/days/:dayId/reorder", authenticate, async (req, res, next) => {
    try {
      const current = await repository.findDayContext(req.params.tripId, req.params.dayId);
      await authorizeContext(repository, current, req.user.id);
      const revision = expectedRevision(req.body);
      const context = await repository.reorderDay(
        req.params.tripId,
        req.params.dayId,
        req.user.id,
        req.body.activityIds ?? [],
        revision,
        {
          action: "day.reordered",
          entityType: "day",
          entityId: req.params.dayId,
          summary: { activityIds: req.body.activityIds ?? [] }
        }
      );
      if (context === null) {
        const error = new Error("Reorder list must contain every activity exactly once.");
        error.code = "INVALID_REORDER";
        error.status = 400;
        throw error;
      }
      if (!context) throw versionConflict();
      res.json({
        day: context.day,
        budget: budgetFor(context),
        revision: context.revision
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/activities/:activityId/cheaper-alternative", authenticate, async (req, res, next) => {
    try {
      const current = await repository.findActivityContext(req.params.activityId);
      await authorizeContext(repository, current, req.user.id);
      const revision = expectedRevision(req.body);
      const context = await repository.updateActivity(req.params.activityId, req.user.id, {
        estimatedCost: Math.max(0, Math.floor(current.activity.estimatedCost * 0.55)),
        description: {
          en: `${current.activity.description.en} Switched to a lower-cost local option.`,
          zh: `${current.activity.description.zh} 已替换为更省预算的本地选择。`
        },
        sourceAttractionId: undefined,
        sourceProvider: undefined,
        sourceUrl: undefined,
        imageUrl: undefined,
        imageAttribution: undefined,
        visitDetails: undefined
      }, revision, {
        action: "activity.cheaper_alternative",
        entityType: "activity",
        entityId: req.params.activityId,
        summary: {}
      });
      if (!context) throw versionConflict();
      res.json({
        activity: context.activity,
        budget: budgetFor(context),
        revision: context.revision
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/activities/:activityId/regenerate", authenticate, async (req, res, next) => {
    try {
      const current = await repository.findActivityContext(req.params.activityId);
      await authorizeContext(repository, current, req.user.id);
      const revision = expectedRevision(req.body);
      const variant = await generateGroundedVariant(
        current,
        planProvider,
        attractionCatalogue
      );
      const generated = variant.days[0]?.activities[0];
      if (!generated) throw new Error("Generated itinerary contained no activities.");
      const { id: _generatedId, order: _generatedOrder, ...patch } = generated;
      if (current.trip.destination !== "huangshan") {
        patch.name = {
          en: `${generated.name.en} alternative`,
          zh: `${generated.name.zh}新方案`
        };
      }
      const context = await repository.updateActivity(
        req.params.activityId,
        req.user.id,
        { ...patch },
        revision,
        {
          action: "activity.regenerated",
          entityType: "activity",
          entityId: req.params.activityId,
          summary: {}
        }
      );
      if (!context) throw versionConflict();
      res.json({
        activity: context.activity,
        budget: budgetFor(context),
        revision: context.revision
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/trips/:tripId/days/:dayId/regenerate", authenticate, async (req, res, next) => {
    try {
      const current = await repository.findDayContext(req.params.tripId, req.params.dayId);
      await authorizeContext(repository, current, req.user.id);
      const revision = expectedRevision(req.body);
      const variant = await generateGroundedVariant(
        current,
        planProvider,
        attractionCatalogue
      );
      const generated = variant.days[0]?.activities ?? [];
      const activities = generated.map((activity, order) => ({
        ...activity,
        id: randomUUID(),
        order
      }));
      const context = await repository.replaceDay(
        req.params.tripId,
        req.params.dayId,
        req.user.id,
        activities,
        revision,
        {
          action: "day.regenerated",
          entityType: "day",
          entityId: req.params.dayId,
          summary: {}
        }
      );
      if (!context) throw versionConflict();
      res.json({
        day: context.day,
        budget: budgetFor(context),
        revision: context.revision
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
