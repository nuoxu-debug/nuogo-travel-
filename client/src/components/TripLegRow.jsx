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

function minutesLabel(minutes, language) {
  return `${minutes} ${language === "zh" ? "分钟" : "min"}`;
}

function oneMapLegLabel(leg, language) {
  const duration = Number(leg?.durationMinutes);
  if (!Number.isInteger(duration) || duration < 0) return null;
  const route = typeof leg.route === "string" && leg.route.trim() ? ` ${leg.route.trim()}` : "";
  switch (String(leg?.mode ?? "").toUpperCase()) {
    case "WALK":
      return `${language === "zh" ? "步行" : "Walk"} ${minutesLabel(duration, language)}`;
    case "SUBWAY":
      return `MRT${route} ${minutesLabel(duration, language)}`;
    case "BUS":
      return `${language === "zh" ? "巴士" : "Bus"}${route} ${minutesLabel(duration, language)}`;
    default:
      return null;
  }
}

function transferLabel(count, language) {
  if (!Number.isInteger(count) || count < 0) return null;
  if (language === "zh") return `${count} 次换乘`;
  return `${count} ${count === 1 ? "transfer" : "transfers"}`;
}

function walkingConnectionLabel(minutes, language) {
  if (!Number.isInteger(minutes) || minutes < 0) return null;
  return language === "zh"
    ? `步行接驳 ${minutesLabel(minutes, language)}`
    : `${minutesLabel(minutes, language)} walking connection`;
}

function transportDetail(leg, language, fallbackMode) {
  const oneMapLegs = (leg.mrtRoute?.legs ?? [])
    .map((item) => oneMapLegLabel(item, language))
    .filter(Boolean);
  if (oneMapLegs.length) return oneMapLegs.join(" → ");

  const accessName = leg.mrtRoute?.accessStation?.name;
  const egressName = leg.mrtRoute?.egressStation?.name;
  if (accessName && egressName) {
    const details = [
      `MRT: ${localizedText(accessName, language)} → ${localizedText(egressName, language)}`,
      transferLabel(leg.mrtRoute.transferCount, language),
      walkingConnectionLabel(leg.mrtRoute.walkMinutes, language)
    ].filter(Boolean);
    if (details.length) return details.join(" · ");
  }

  return fallbackMode;
}

export default function TripLegRow({ leg }) {
  const { language } = useLanguage();
  const Icon = modeIcons[leg.mode] ?? Route;
  const mode = displayLabel(language, "transport", leg.mode);
  const detail = transportDetail(leg, language, mode);
  const estimateLabel = language === "zh" ? "行程估算" : "Travel estimate";
  return (
    <div role="group" aria-label={estimateLabel} className="ml-6 flex min-h-9 items-center gap-2 border-l border-dashed border-ink/18 py-1.5 pl-5 text-xs text-ink/55">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lake/8 text-lake">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-1.5 shadow-[0_1px_0_rgba(19,34,28,.08)]">
        <p className="font-bold leading-5 text-ink/75">
          {(Number(leg.distanceMeters) / 1000).toFixed(1)} km {"\u00b7"} {leg.durationMinutes} {language === "zh" ? "分钟" : "min"} <span className="text-ink/35">{"\u00b7"}</span> <span className="font-semibold text-ink/58">{detail} {"\u00b7"} {displayLabel(language, "source", leg.routeSource ?? leg.sourceType)}</span>
        </p>
        {leg.presentation?.origin && leg.presentation?.destination && <p className="sr-only">{localizedText(leg.presentation.origin, language)} → {localizedText(leg.presentation.destination, language)}</p>}
      </div>
      <span className="shrink-0 font-semibold text-ink/70">{formatSgd(leg.estimatedCostMinor)}</span>
    </div>
  );
}
