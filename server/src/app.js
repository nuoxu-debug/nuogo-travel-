import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ZodError } from "zod";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createAuthRouter } from "./routes/auth.js";
import { createActivitiesRouter } from "./routes/activities.js";
import { createAttractionMediaRouter } from "./routes/attractionMedia.js";
import { createCollaborationRouter } from "./routes/collaboration.js";
import { createFavoritesRouter } from "./routes/favorites.js";
import { createLegacyMetaRouter, createMetaRouter } from "./routes/meta.js";
import { createTripsRouter } from "./routes/trips.js";
import { AuthService } from "./services/authService.js";

export function createApp({
  repository,
  planProvider,
  attractionCatalogue,
  attractionMediaService,
  config
}) {
  const app = express();
  const authenticate = createAuthMiddleware(config.jwtSecret);
  const authService = new AuthService(repository, config.jwtSecret);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: "100kb" }));
  app.use(rateLimit({
    windowMs: 60_000,
    limit: process.env.NODE_ENV === "test" ? 5000 : 240,
    standardHeaders: "draft-7",
    legacyHeaders: false
  }));

  app.get("/api/health", (_req, res) => {
    res.json({
      product: "Nuogo",
      status: "ok",
      demoMode: config.demoMode,
      aiProvider: config.aiProvider
    });
  });
  if (attractionMediaService) {
    app.use("/api", createAttractionMediaRouter({ attractionMediaService }));
  }
  app.use("/api/auth", createAuthRouter({
    authService,
    authenticate,
    demoMode: config.demoMode
  }));
  app.use("/api/meta", createMetaRouter({
    authenticate,
    demoMode: config.demoMode,
    aiProvider: config.aiProvider
  }));
  app.use("/api", createLegacyMetaRouter({
    authenticate,
    demoMode: config.demoMode,
    aiProvider: config.aiProvider
  }));
  app.use("/api/trips", createTripsRouter({
    repository,
    planProvider,
    attractionCatalogue,
    authenticate
  }));
  app.use("/api", createActivitiesRouter({
    repository,
    planProvider,
    attractionCatalogue,
    authenticate
  }));
  app.use("/api", createCollaborationRouter({
    repository,
    authenticate,
    clientOrigin: config.clientOrigin
  }));
  app.use("/api/favorites", createFavoritesRouter({ repository, authenticate }));

  app.use((_req, _res, next) => {
    const error = new Error("Route was not found.");
    error.code = "NOT_FOUND";
    error.status = 404;
    next(error);
  });

  app.use((error, _req, res, _next) => {
    const isValidation = error instanceof ZodError;
    const status = isValidation ? 400 : error.status ?? 500;
    const code = isValidation ? "VALIDATION_ERROR" : error.code ?? "INTERNAL_ERROR";
    res.status(status).json({
      error: {
        code,
        message: isValidation ? "The submitted data is invalid." : error.message,
        details: isValidation
          ? error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
          : undefined
      }
    });
  });

  return app;
}
