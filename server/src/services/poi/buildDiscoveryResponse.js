import { resolveAttractionDisplay } from "@nuogo/shared/destination-discovery";

export function buildDiscoveryResponse(destination, candidates, { runtimeMode }) {
  const isDemo = runtimeMode === "demo";
  return candidates.map((candidate) => {
    const english = resolveAttractionDisplay({
      destination,
      xid: candidate.xid,
      sourceName: candidate.displayName?.en ?? candidate.name,
      sourceDescription: candidate.description?.en,
      language: "en"
    });
    const chinese = resolveAttractionDisplay({
      destination,
      xid: candidate.xid,
      sourceName: candidate.displayName?.zh ?? candidate.name,
      sourceDescription: candidate.description?.zh,
      language: "zh"
    });
    return {
      xid: candidate.xid,
      destination,
      name: { en: english.name, zh: chinese.name },
      description: {
        ...(english.description ? { en: english.description } : {}),
        ...(chinese.description ? { zh: chinese.description } : {})
      },
      category: candidate.category ?? "CULTURE",
      suggestedVisitDurationMinutes: candidate.suggestedVisitDurationMinutes ??
        english.suggestedVisitDurationMinutes,
      coordinates: candidate.coordinates,
      source: {
        provider: isDemo ? "DEMO" : "OPENTRIPMAP",
        sourceType: isDemo ? "DEMO_FIXTURE" : "OPENTRIPMAP_API",
        ...(candidate.sourceUrl ? { sourceUrl: candidate.sourceUrl } : {}),
        retrievedAt: candidate.retrievedAt,
        matchStatus: candidate.matchStatus,
        verificationStatus: candidate.verificationStatus ?? "SUPPORTING_ONLY"
      }
    };
  });
}
