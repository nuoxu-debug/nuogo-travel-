import { itineraryVariantSchema } from "@nuogo/shared/schemas";

export function validateGroundedItinerary(
  variant,
  attractions,
  expectedDestination = variant.destination
) {
  if (variant.destination !== expectedDestination) {
    throw new Error("Generated itinerary destination does not match the requested destination.");
  }
  if (expectedDestination !== "huangshan") {
    const cleaned = {
      ...variant,
      days: variant.days.map((day) => ({
        ...day,
        activities: day.activities.map((activity) => {
          const {
            sourceAttractionId: _sourceAttractionId,
            sourceProvider: _sourceProvider,
            sourceUrl: _sourceUrl,
            imageUrl: _imageUrl,
            imageAttribution: _imageAttribution,
            visitDetails: _visitDetails,
            locationIsEstimated: _locationIsEstimated,
            ...rest
          } = activity;
          return rest;
        })
      }))
    };
    return itineraryVariantSchema.parse(cleaned);
  }

  const approved = new Map(attractions.map((item) => [item.id, item]));
  const grounded = {
    ...variant,
    days: variant.days.map((day) => ({
      ...day,
      activities: day.activities.map((activity) => {
        if (!activity.sourceAttractionId) {
          return activity;
        }
        const source = approved.get(activity.sourceAttractionId);
        if (!source || activity.name.zh !== source.nameZh) {
          throw new Error("Huangshan activity is not in the approved attraction catalogue.");
        }
        const hasVerifiedLocation =
          Number.isFinite(source.longitude) &&
          Number.isFinite(source.latitude);
        const {
          imageUrl: _providerImageUrl,
          imageAttribution: _providerImageAttribution,
          visitDetails: _providerVisitDetails,
          ...trustedActivity
        } = activity;
        return {
          ...trustedActivity,
          location: hasVerifiedLocation
            ? {
                longitude: source.longitude,
                latitude: source.latitude
              }
            : activity.location,
          locationIsEstimated: !hasVerifiedLocation,
          sourceProvider: source.sourceProvider,
          sourceUrl: source.sourceUrl,
          ...(source.thumbnailUrl ? {
            imageUrl: `/api/attractions/${source.id}/image`,
            imageAttribution: source.imageAttribution || `Image source: ${source.sourceProvider}`
          } : {}),
          ...(source.visitDetails ? { visitDetails: source.visitDetails } : {})
        };
      })
    }))
  };
  return itineraryVariantSchema.parse(grounded);
}
