import { evaluateProfileDifferentiation } from "./evaluateProfileDifferentiation.js";

const quality = (result) => result.pairs.reduce((sum, pair) => sum + pair.meaningfulDimensionCount, 0);

export async function attemptProfileDiversification({ variants, selectedCandidateIds = [], profilePlans, evaluate, config }) {
  let current = variants; let report = evaluateProfileDifferentiation(current, { selectedCandidateIds, config }); const selected = new Set(selectedCandidateIds); const attempted = new Set();
  for (const diagnostic of report.diagnostics) {
    const index = current.findIndex(({ itinerary }) => (itinerary?.travelStyle ?? itinerary?.variant) === diagnostic.profiles[1]);
    if (index < 0 || attempted.has(index) || !current[index]?.itinerary?.days) continue;
    attempted.add(index);
    const plan = profilePlans.find(({ profile }) => profile === diagnostic.profiles[1]);
    const used = new Set(current[index].itinerary.days.flatMap(({ activities }) => activities.map(({ xid }) => xid).filter(Boolean)));
    const replacement = plan?.rankedSupplementalIds.find((id) => !selected.has(id) && !used.has(id));
    const probe = structuredClone(current[index].itinerary); const activity = probe.days.flatMap(({ activities }) => activities).find(({ xid }) => xid && !selected.has(xid));
    if (!replacement || !activity) continue;
    activity.xid = replacement; delete activity.poi;
    const candidate = await evaluate(probe, diagnostic.profiles[1]);
    if (candidate.validation?.valid !== true || candidate.summary?.withinBudget === false) continue;
    const next = current.map((variant, variantIndex) => variantIndex === index ? candidate : variant);
    const nextReport = evaluateProfileDifferentiation(next, { selectedCandidateIds, config });
    if (quality(nextReport) > quality(report)) { current = next; report = nextReport; }
  }
  return { variants: current, diagnostics: report.diagnostics, pairs: report.pairs };
}
