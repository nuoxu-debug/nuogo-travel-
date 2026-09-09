import { Router } from "express";
import { loginRequest, registrationRequest } from "../validation/requestValidators.js";
import { validateRequest } from "../validation/validateRequest.js";

export function createAuthRouter({ authService, authenticate, demoMode = false }) {
  const router = Router();

  router.post("/register", registrationRequest, validateRequest, async (req, res, next) => {
    try {
      res.status(201).json(await authService.register(req.body));
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", loginRequest, validateRequest, async (req, res, next) => {
    try {
      res.json(await authService.login(req.body));
    } catch (error) {
      next(error);
    }
  });

  router.post("/guest", async (_req, res, next) => {
    try {
      if (!demoMode) {
        const error = new Error("Route was not found.");
        error.code = "NOT_FOUND";
        error.status = 404;
        throw error;
      }
      res.json(await authService.guest());
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", authenticate, async (req, res, next) => {
    try {
      const user = await authService.getPublicUser(req.user.id);
      if (!user) {
        const error = new Error("User was not found.");
        error.status = 404;
        error.code = "NOT_FOUND";
        throw error;
      }
      res.json({ user });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
