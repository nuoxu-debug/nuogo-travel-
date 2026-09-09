import { Router } from "express";
import {
  localTransportModes,
  spendingProfiles,
  supportedDestinationIds,
  supportedDestinations
} from "@nuogo/shared/constants";
import { getDestinationDiscoveryContent } from "@nuogo/shared/destination-discovery";

function sendSingaporeMetadata(res, { demoMode, aiProvider }) {
  res.json({
    product: "Nuogo",
    demoMode,
    aiProvider,
    destinations: supportedDestinations,
    spendingProfiles,
    localTransportModes
  });
}

export function createMetaRouter({ demoMode, aiProvider, travelDataProvider, discoverAttractions }) {
  const router = Router();

  router.get("/singapore", (_req, res) => {
    sendSingaporeMetadata(res, { demoMode, aiProvider });
  });

  router.get("/destinations/:destination/attractions", async (req, res, next) => {
    const { destination } = req.params;
    if (!supportedDestinationIds.includes(destination)) {
      const error = new Error("This destination is not supported.");
      error.code = "UNSUPPORTED_DESTINATION";
      error.status = 400;
      return next(error);
    }
    if (!discoverAttractions) {
      const error = new Error("Attraction discovery is unavailable.");
      error.code = "ATTRACTION_DISCOVERY_UNAVAILABLE";
      error.status = 503;
      return next(error);
    }
    try {
      const attractions = await discoverAttractions({
        destination,
        signal: new AbortController().signal
      });
      const content = getDestinationDiscoveryContent(destination);
      return res.json({
        destination,
        introduction: content.introduction,
        themes: content.themes,
        attractions,
        candidateCount: attractions.length,
        providerMode: travelDataProvider ?? (demoMode ? "demo" : "live")
      });
    } catch {
      const error = new Error("Attraction discovery is temporarily unavailable.");
      error.code = "ATTRACTION_DISCOVERY_UNAVAILABLE";
      error.status = 503;
      return next(error);
    }
  });

  return router;
}
