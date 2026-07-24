import { getHuangshanDetails } from "../data/huangshanAttractions.js";

const destinationRegions = {
  huangshan: "huangshan"
};

function displayProvider(provider) {
  return provider === "mafengwo" ? "Mafengwo" : provider;
}

export class SqliteAttractionCatalogue {
  constructor(repository) {
    this.repository = repository;
  }

  listApproved(destination, { limit = 40 } = {}) {
    const regionId = destinationRegions[destination];
    if (!regionId) return [];

    return this.repository.listAttractions({
      status: "approved",
      regionId,
      active: true,
      limit
    }).map((record) => {
      const curated = getHuangshanDetails(record.nameZh);
      return {
        ...record,
        ...(curated ? {
          nameEn: curated.nameEn,
          descriptionZh: curated.descriptionZh,
          descriptionEn: curated.descriptionEn,
          visitDetails: {
            ...curated.visitDetails,
            popularity: {
              reviews: record.reviewCount,
              travelNotes: record.travelNoteCount,
              images: record.imageCount
            }
          }
        } : {}),
        imageAttribution: record.thumbnailUrl ? "Image source: Mafengwo" : undefined,
        sourceProvider: displayProvider(record.sourceProvider)
      };
    });
  }
}
