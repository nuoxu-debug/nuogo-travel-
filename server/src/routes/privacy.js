import { Router } from "express";
import { z } from "zod";

const consentSchema = z.object({
  accepted: z.literal(true),
  version: z.string().trim().min(1).max(40)
}).strict();

const deletionSchema = z.object({ confirmation: z.literal("DELETE") }).strict();

export function createPrivacyRouter({ repository, authenticate }) {
  const router = Router();
  router.use(authenticate);

  router.post("/consent", async (req, res, next) => {
    try {
      const input = consentSchema.parse(req.body);
      const consent = await repository.recordPrivacyConsent(req.user.id, input);
      res.status(201).json({ consent });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/account", async (req, res, next) => {
    try {
      deletionSchema.parse(req.body);
      await repository.deleteAccount(req.user.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
