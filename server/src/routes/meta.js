import { Router } from "express";
import {
  accommodationTypes,
  chinaCities,
  groupTypes,
  poiCategories,
  tripStyles
} from "@nuogo/shared/constants";
import { validatePreferences } from "../services/validation.js";

function sendChinaMetadata(res, { demoMode, aiProvider }) {
  res.json({
    product: "Nuogo",
    demoMode,
    aiProvider,
    cities: chinaCities,
    poiCategories,
    groupTypes,
    accommodationTypes,
    tripStyles
  });
}

function sendPreferenceValidation(req, res, next) {
  try {
    res.json(validatePreferences(req.body));
  } catch (error) {
    next(error);
  }
}

export function createMetaRouter({ authenticate, demoMode, aiProvider }) {
  const router = Router();

  router.get("/china", (_req, res) => {
    sendChinaMetadata(res, { demoMode, aiProvider });
  });

  router.post("/preferences/validate", authenticate, sendPreferenceValidation);

  return router;
}

export function createLegacyMetaRouter({ authenticate, demoMode, aiProvider }) {
  const router = Router();

  router.use((_req, res, next) => {
    res.set("Deprecation", "true");
    res.set("Link", "</api/meta>; rel=\"successor-version\"");
    next();
  });

  router.get("/china", (_req, res) => {
    sendChinaMetadata(res, { demoMode, aiProvider });
  });

  router.post("/preferences/validate", authenticate, sendPreferenceValidation);

  return router;
}
