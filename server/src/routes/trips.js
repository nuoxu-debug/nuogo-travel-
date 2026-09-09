import { Router } from "express";
import { travelPreferenceSchema, tripRevisionSchema } from "@nuogo/shared/schemas";
import { createGuestClaim, getTripAccess, guestClaimMatches, requireTripRole } from "../services/tripAccess.js";
import { travelPreferenceRequest } from "../validation/requestValidators.js";
import { validateRequest } from "../validation/validateRequest.js";
import { screenTravelPreferences } from "../services/promptInjection.js";
import { revalidateEditedTrip } from "../services/itinerary/revalidateEditedTrip.js";

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

function failedGenerationResponse(result) {
  const issueCodes = [...new Set((result.validation?.issues ?? []).map(({ code }) => code))];
  return {
    error: {
      code: "GENERATION_CONSTRAINTS_UNSATISFIED",
      message: "Nuogo could not create a valid itinerary within the current requirements and budget.",
      details: {
        issueCodes,
        actionHints: ["ADJUST_BUDGET", "ADJUST_DATES_OR_PREFERENCES"]
      }
    }
  };
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
  objectivePlanner,
  authenticate
}) {
  const router = Router();
  router.use(authenticate);

  router.post(
    "/generate",
    ...travelPreferenceRequest,
    validateRequest,
    async (req, res, next) => {
    try {
      if (!objectivePlanner) throw Object.assign(new Error("Validated planning is unavailable."), {
        code: "PLANNER_UNAVAILABLE",
        status: 503
      });
      const preferences = travelPreferenceSchema.parse(req.body);
      const screening = screenTravelPreferences(preferences);
      if (!screening.safe) {
        const error = new Error("Travel preferences contain instruction-like text that cannot be processed safely.");
        error.code = "PROMPT_INJECTION_REJECTED";
        error.status = 400;
        error.details = { fields: screening.fields };
        throw error;
      }
      await repository.recordPrivacyConsent(req.user.id, {
        type: "LLM_ITINERARY_GENERATION",
        version: "2026-08-21",
        accepted: true
      });
      const result = await objectivePlanner(preferences);
      if (result.state !== "FINAL_VALIDATED") {
        return res.status(422).json(failedGenerationResponse(result));
      }
      const guestClaim = req.user.accountType === "GUEST" ? createGuestClaim() : null;
      const persistedResult = guestClaim
        ? {
            ...result,
            persistenceScope: "SESSION",
            expiresAt: req.user.guestExpiresAt,
            guestClaimTokenHash: guestClaim.tokenHash
          }
        : result;
      const trip = repository.saveObjectiveTrip
        ? await repository.saveObjectiveTrip(req.user.id, persistedResult)
        : result.trip;
      return res.status(201).json({ ...result, trip, ...(guestClaim ? { guestClaimToken: guestClaim.token } : {}) });
    } catch (error) {
      next(error);
    }
    }
  );

  router.get("/", async (req, res, next) => {
    try {
      res.json({ trips: await repository.listTrips(req.user.id) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:tripId/claim", async (req, res, next) => {
    try {
      if (req.user.accountType === "GUEST") {
        const error = new Error("A registered account is required to save this itinerary.");
        error.code = "REGISTERED_ACCOUNT_REQUIRED";
        error.status = 403;
        throw error;
      }
      const claimToken = typeof req.body.claimToken === "string" ? req.body.claimToken : "";
      if (claimToken.length < 16 || claimToken.length > 256) throw validationError("A valid save token is required.");
      const pending = await repository.getTrip(req.params.tripId);
      if (!pending || !guestClaimMatches(pending.guestClaimTokenHash, claimToken)) {
        const error = new Error("This guest itinerary cannot be saved by this account.");
        error.code = "GUEST_TRIP_CLAIM_DENIED";
        error.status = 403;
        throw error;
      }
      const trip = await repository.claimGuestTrip(req.params.tripId, req.user.id, pending.guestClaimTokenHash);
      if (!trip) {
        const error = new Error("This guest itinerary cannot be saved by this account.");
        error.code = "GUEST_TRIP_CLAIM_DENIED";
        error.status = 403;
        throw error;
      }
      res.json({ trip });
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

  router.patch("/:tripId/entries/:entryId", async (req, res, next) => {
    try {
      const access = await accessFor(repository, req.params.tripId, req.user.id, ["editor"]);
      const revision = expectedRevision(req.body);
      if (access.trip.revision !== revision) throw versionConflict();
      const { expectedRevision: _expectedRevision, ...patch } = req.body;
      const { variant } = await revalidateEditedTrip({
        trip: access.trip,
        entryId: req.params.entryId,
        patch
      });
      const trip = await repository.updateObjectiveVariant(
        req.params.tripId,
        req.user.id,
        variant,
        revision
      );
      if (!trip) throw versionConflict();
      res.json({ trip, revision: trip.revision });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:tripId/regenerate", async (req, res, next) => {
    try {
      const access = await accessFor(repository, req.params.tripId, req.user.id, ["owner"]);
      const revision = expectedRevision(req.body);
      if (access.trip.revision !== revision) throw versionConflict();
      const preferences = travelPreferenceSchema.parse({
        ...access.trip.preferences,
        ...(req.body.preferences ?? {})
      });
      const screening = screenTravelPreferences(preferences);
      if (!screening.safe) {
        const error = new Error("Travel preferences contain instruction-like text that cannot be processed safely.");
        error.code = "PROMPT_INJECTION_REJECTED";
        error.status = 400;
        error.details = { fields: screening.fields };
        throw error;
      }
      await repository.recordPrivacyConsent(req.user.id, {
        type: "LLM_ITINERARY_GENERATION",
        version: "2026-08-21",
        accepted: true
      });
      const result = await objectivePlanner(preferences);
      if (result.state !== "FINAL_VALIDATED") {
        return res.status(422).json(failedGenerationResponse(result));
      }
      const linked = {
        ...result,
        trip: { ...result.trip, parentTripId: access.trip.id }
      };
      const trip = await repository.saveObjectiveTrip(req.user.id, linked);
      return res.status(201).json({ ...linked, trip });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
