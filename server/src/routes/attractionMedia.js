import { Router } from "express";

export function createAttractionMediaRouter({ attractionMediaService }) {
  const router = Router();

  router.get("/attractions/:attractionId/image", (req, res, next) => {
    try {
      const media = attractionMediaService.getMedia(req.params.attractionId);
      if (!media) {
        return res.status(404).json({
          error: {
            code: "ATTRACTION_IMAGE_NOT_FOUND",
            message: "Approved attraction image was not found."
          }
        });
      }
      if (media.state === "cached") {
        res.type(media.contentType);
        return res.sendFile(media.path);
      }
      return res.redirect(302, media.sourceUrl);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
