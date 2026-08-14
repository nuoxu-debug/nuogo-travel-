import { Router } from "express";
import { getTripAccess, requireTripRole } from "../services/tripAccess.js";

export function createFavoritesRouter({ repository, authenticate }) {
  const router = Router();
  router.use(authenticate);

  router.get("/", async (req, res, next) => {
    try {
      res.json({ favorites: await repository.listFavorites(req.user.id) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const context = await repository.findActivityContext(req.body.activityId);
      if (context) {
        const access = await getTripAccess(repository, context.trip.id, req.user.id);
        requireTripRole(access, ["viewer"]);
      }
      const favorite = await repository.addFavorite(req.user.id, req.body.activityId);
      if (!favorite) {
        const error = new Error("Activity was not found.");
        error.status = 404;
        error.code = "NOT_FOUND";
        throw error;
      }
      res.status(201).json({ favorite });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:favoriteId", async (req, res, next) => {
    try {
      if (!(await repository.deleteFavorite(req.user.id, req.params.favoriteId))) {
        const error = new Error("Favorite was not found.");
        error.status = 404;
        error.code = "NOT_FOUND";
        throw error;
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
