import { Router } from "express";
import { generateThreePlans } from "../services/generator.js";
import { validatePreferences } from "../services/validation.js";

function notFound() {
  const error = new Error("Trip was not found.");
  error.code = "NOT_FOUND";
  error.status = 404;
  return error;
}

export function createTripsRouter({
  repository,
  planProvider,
  attractionCatalogue,
  authenticate
}) {
  const router = Router();
  router.use(authenticate);

  router.post("/generate", async (req, res, next) => {
    try {
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
      const trip = await repository.getTrip(req.params.tripId);
      if (!trip || trip.ownerId !== req.user.id) throw notFound();
      res.json({ trip });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:tripId", async (req, res, next) => {
    try {
      const patch = {};
      if (["draft", "upcoming", "completed"].includes(req.body.status)) patch.status = req.body.status;
      if (req.body.title?.en && req.body.title?.zh) patch.title = req.body.title;
      const trip = await repository.updateTrip(req.params.tripId, req.user.id, patch);
      if (!trip) throw notFound();
      res.json({ trip });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:tripId", async (req, res, next) => {
    try {
      if (!(await repository.deleteTrip(req.params.tripId, req.user.id))) throw notFound();
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.post("/:tripId/duplicate", async (req, res, next) => {
    try {
      const trip = await repository.duplicateTrip(req.params.tripId, req.user.id);
      if (!trip) throw notFound();
      res.status(201).json({ trip });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:tripId/select-variant", async (req, res, next) => {
    try {
      const trip = await repository.selectVariant(req.params.tripId, req.user.id, req.body.variantId);
      if (!trip) throw notFound();
      res.json({ trip });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
