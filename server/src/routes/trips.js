import { Router } from "express";
import { travelPreferenceSchema, tripRevisionSchema } from "@nuogo/shared/schemas";
import { generateThreePlans } from "../services/generator.js";
import { getTripAccess, requireTripRole } from "../services/tripAccess.js";
import { validatePreferences } from "../services/validation.js";

function notFound() {
  const error = new Error("Trip was not found.");
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

function publicAccess(access) {
  return {
    role: access.role,
    canEdit: access.canEdit,
    isOwner: access.isOwner
  };
}

function expectedRevision(body) {
  return tripRevisionSchema.parse({
    expectedRevision: body.expectedRevision
  }).expectedRevision;
}

async function accessFor(repository, tripId, userId, roles) {
  const access = await getTripAccess(repository, tripId, userId);
  if (!access) throw notFound();
  return requireTripRole(access, roles);
}

export function createTripsRouter({
  repository,
  planProvider,
  objectivePlanner,
  attractionCatalogue,
  authenticate
}) {
  const router = Router();
  router.use(authenticate);

  router.post("/generate", async (req, res, next) => {
    try {
      if (req.body?.totalBudgetCny !== undefined) {
        if (!objectivePlanner) throw Object.assign(new Error("Validated planning is unavailable."), {
          code: "PLANNER_UNAVAILABLE",
          status: 503
        });
        const result = await objectivePlanner(travelPreferenceSchema.parse(req.body));
        if (result.state !== "FINAL_VALIDATED") return res.status(422).json(result);
        const trip = repository.saveObjectiveTrip
          ? await repository.saveObjectiveTrip(req.user.id, result)
          : result.trip;
        return res.status(201).json({ ...result, trip });
      }
      const preferences = validatePreferences(req.body);
      const attractions = attractionCatalogue?.listApproved(preferences.destination) ?? [];
      if (preferences.destination === "huangshan" && attractions.length === 0) {
        const error = new Error(
          "No approved Huangshan attractions are available. Review local attraction records first."
        );
        error.code = "ATTRACTION_CATALOGUE_EMPTY";
        error.status = 422;
        throw error;
      }
      const generated = await generateThreePlans(preferences, planProvider, { attractions });
      const trip = await repository.createTrip(req.user.id, preferences, generated.variants);
      res.status(201).json({ trip, variants: trip.variants });
    } catch (error) {
      next(error);
    }
  });

  router.get("/", async (req, res, next) => {
    try {
      res.json({ trips: await repository.listTrips(req.user.id) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:tripId", async (req, res, next) => {
    try {
      const access = await accessFor(
        repository,
        req.params.tripId,
        req.user.id,
        ["viewer"]
      );
      res.json({ trip: access.trip, access: publicAccess(access) });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:tripId", async (req, res, next) => {
    try {
      await accessFor(
        repository,
        req.params.tripId,
        req.user.id,
        ["editor"]
      );
      const revision = expectedRevision(req.body);
      const patch = {};
      if (["draft", "upcoming", "completed"].includes(req.body.status)) patch.status = req.body.status;
      if (req.body.title?.en && req.body.title?.zh) patch.title = req.body.title;
      if (!Object.keys(patch).length) {
        throw validationError("Provide a supported trip field to update.");
      }
      const trip = await repository.updateTrip(
        req.params.tripId,
        req.user.id,
        patch,
        revision,
        {
          action: "trip.updated",
          entityType: "trip",
          entityId: req.params.tripId,
          summary: { fields: Object.keys(patch) }
        }
      );
      if (!trip) throw versionConflict();
      res.json({ trip, revision: trip.revision });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:tripId", async (req, res, next) => {
    try {
      await accessFor(repository, req.params.tripId, req.user.id, ["owner"]);
      if (!(await repository.deleteTrip(req.params.tripId, req.user.id))) throw notFound();
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.post("/:tripId/duplicate", async (req, res, next) => {
    try {
      await accessFor(repository, req.params.tripId, req.user.id, ["owner"]);
      const trip = await repository.duplicateTrip(req.params.tripId, req.user.id);
      if (!trip) throw notFound();
      res.status(201).json({ trip });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:tripId/select-variant", async (req, res, next) => {
    try {
      const access = await accessFor(
        repository,
        req.params.tripId,
        req.user.id,
        ["editor"]
      );
      const hasVariant = access.trip.variants.some((variant) => (
        (variant.id ?? variant.itinerary?.variant) === req.body.variantId
      ));
      if (!hasVariant) throw notFound();
      const revision = expectedRevision(req.body);
      const select = access.trip.objectiveAligned && repository.selectObjectiveVariant
        ? repository.selectObjectiveVariant.bind(repository)
        : repository.selectVariant.bind(repository);
      const trip = await select(
        req.params.tripId,
        req.user.id,
        req.body.variantId,
        revision,
        {
          action: "trip.variant_selected",
          entityType: "variant",
          entityId: req.body.variantId,
          summary: {}
        }
      );
      if (!trip) throw versionConflict();
      res.json({ trip, revision: trip.revision });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
