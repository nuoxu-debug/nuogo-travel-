import { Router } from "express";
import { z } from "zod";
import { passwordSchema } from "@nuogo/shared/schemas";

const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  preferredLanguage: z.enum(["zh", "en"]).optional()
}).strict().refine(
  (value) => value.name !== undefined || value.preferredLanguage !== undefined,
  { message: "At least one profile field is required." }
);

const passwordChangeSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema
}).strict();

export function createProfileRouter({ authService, authenticate }) {
  const router = Router();
  router.use(authenticate);

  router.get("/", async (req, res, next) => {
    try {
      res.json({ profile: await authService.getProfile(req.user.id) });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/", async (req, res, next) => {
    try {
      const input = profileUpdateSchema.parse(req.body);
      res.json({ profile: await authService.updateProfile(req.user.id, input) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/password", async (req, res, next) => {
    try {
      const input = passwordChangeSchema.parse(req.body);
      await authService.changePassword(req.user.id, input);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
