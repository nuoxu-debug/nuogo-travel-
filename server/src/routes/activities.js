import { randomUUID } from "node:crypto";
import { Router } from "express";
import { activitySchema } from "@nuogo/shared/schemas";
import { calculateBudget } from "../services/budget.js";
import { validateGroundedItinerary } from "../services/grounding.js";
import { parseItinerary } from "../services/parser.js";

function activityNotFound() {
  const error = new Error("Activity or day was not found.");
  error.code = "NOT_FOUND";
  error.status = 404;
  return error;
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
      if (!context || context.trip.ownerId !== req.user.id) throw activityNotFound();
      const activity = buildActivity(req.body, context.day.activities.length);
      const saved = await repository.addActivity(req.params.tripId, req.params.dayId, req.user.id, activity);
      res.status(201).json({ activity: saved.activity, budget: budgetFor(saved) });
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
      if (patch.estimatedCost !== undefined) patch.estimatedCost = Number(patch.estimatedCost);
      const current = await repository.findActivityContext(req.params.activityId);
      if (!current || current.trip.ownerId !== req.user.id) throw activityNotFound();
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
      const context = await repository.updateActivity(req.params.activityId, req.user.id, patch);
      if (!context) throw activityNotFound();
      res.json({ activity: context.activity, budget: budgetFor(context) });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/activities/:activityId", authenticate, async (req, res, next) => {
    try {
      const context = await repository.deleteActivity(req.params.activityId, req.user.id);
      if (!context) throw activityNotFound();
      res.json({ deletedId: req.params.activityId, budget: budgetFor(context) });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/trips/:tripId/days/:dayId/reorder", authenticate, async (req, res, next) => {
    try {
      const context = await repository.reorderDay(
        req.params.tripId,
        req.params.dayId,
        req.user.id,
        req.body.activityIds ?? []
      );
      if (context === null) {
        const error = new Error("Reorder list must contain every activity exactly once.");
        error.code = "INVALID_REORDER";
        error.status = 400;
        throw error;
      }
      if (!context) throw activityNotFound();
      res.json({ day: context.day, budget: budgetFor(context) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/activities/:activityId/cheaper-alternative", authenticate, async (req, res, next) => {
    try {
      const current = await repository.findActivityContext(req.params.activityId);
      if (!current || current.trip.ownerId !== req.user.id) throw activityNotFound();
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
      });
      res.json({ activity: context.activity, budget: budgetFor(context) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/activities/:activityId/regenerate", authenticate, async (req, res, next) => {
    try {
      const current = await repository.findActivityContext(req.params.activityId);
      if (!current || current.trip.ownerId !== req.user.id) throw activityNotFound();
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
      const context = await repository.updateActivity(req.params.activityId, req.user.id, {
        ...patch
      });
      res.json({ activity: context.activity, budget: budgetFor(context) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/trips/:tripId/days/:dayId/regenerate", authenticate, async (req, res, next) => {
    try {
      const current = await repository.findDayContext(req.params.tripId, req.params.dayId);
      if (!current || current.trip.ownerId !== req.user.id) throw activityNotFound();
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
      const context = await repository.replaceDay(req.params.tripId, req.params.dayId, req.user.id, activities);
      res.json({ day: context.day, budget: budgetFor(context) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
