import { Router } from "express";

export function createCollaborationRouter({ repository, authenticate, clientOrigin }) {
  const router = Router();

  router.post("/trips/:tripId/shares", authenticate, async (req, res, next) => {
    try {
      const permission = req.body.permission === "edit" ? "edit" : "view";
      const share = await repository.createShare(req.params.tripId, req.user.id, permission);
      if (!share) {
        const error = new Error("Trip was not found.");
        error.status = 404;
        error.code = "NOT_FOUND";
        throw error;
      }
      res.status(201).json({
        ...share,
        url: `${clientOrigin}/shared/${share.token}`
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/shared/:token", async (req, res, next) => {
    try {
      const share = await repository.getShare(req.params.token);
      if (!share) {
        const error = new Error("Share link was not found.");
        error.status = 404;
        error.code = "NOT_FOUND";
        throw error;
      }
      res.json(share);
    } catch (error) {
      next(error);
    }
  });

  router.post("/shared/:token/votes", authenticate, async (req, res, next) => {
    try {
      const votes = await repository.vote(req.params.token, req.body.activityId, req.user.id);
      if (votes === undefined) {
        const error = new Error("This share link does not allow voting.");
        error.status = 403;
        error.code = "SHARE_READ_ONLY";
        throw error;
      }
      res.json({ activityId: req.body.activityId, votes });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
