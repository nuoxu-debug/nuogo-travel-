import { BusFront, CarFront, Footprints, Route } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { displayLabel, localizedText } from "../i18n/display.js";

const modeIcons = {
  DRIVE: CarFront,
  TAXI: CarFront,
  WALK: Footprints,
  PUBLIC_TRANSIT: BusFront,
  MIXED: Route
};

function formatSgd(minor = 0) {
  return `S$ ${(Number(minor) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export default function TripLegRow({ leg }) {
  const { language } = useLanguage();
  const Icon = modeIcons[leg.mode] ?? Route;
  const mode = displayLabel(language, "transport", leg.mode);
  const estimateLabel = language === "zh" ? "行程估算" : "Travel estimate";
  return (
    <div role="group" aria-label={estimateLabel} className="ml-5 flex min-h-12 items-center gap-3 border-l border-dashed border-ink/20 py-2 pl-6 text-xs text-ink/55">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lake/8 text-lake">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold uppercase text-sky">{estimateLabel}</p>
        <p className="font-bold text-ink/75">
          {(Number(leg.distanceMeters) / 1000).toFixed(1)} km {"\u00b7"} {leg.durationMinutes} {language === "zh" ? "分钟" : "min"}
        </p>
        {leg.presentation?.origin && leg.presentation?.destination && <p className="mt-0.5 truncate text-ink/60">{localizedText(leg.presentation.origin, language)} → {localizedText(leg.presentation.destination, language)}</p>}
        <p className="mt-0.5 truncate uppercase tracking-normal">
          {mode} {"\u00b7"} {displayLabel(language, "source", leg.routeSource ?? leg.sourceType)}
        </p>
      </div>
      <span className="font-semibold text-ink/70">{formatSgd(leg.estimatedCostMinor)}</span>
    </div>
  );
}
