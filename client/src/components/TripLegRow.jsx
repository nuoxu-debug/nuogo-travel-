import { BusFront, CarFront, Footprints, Route } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

const modeIcons = {
  DRIVE: CarFront,
  TAXI: CarFront,
  WALK: Footprints,
  PUBLIC_TRANSIT: BusFront,
  MIXED: Route
};

function formatCny(fen = 0) {
  return `CNY ${(Number(fen) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export default function TripLegRow({ leg }) {
  const { language } = useLanguage();
  const Icon = modeIcons[leg.mode] ?? Route;
  const mode = language === "zh" ? ({ DRIVE: "自驾", TAXI: "出租车", WALK: "步行", PUBLIC_TRANSIT: "公共交通", MIXED: "混合交通" }[leg.mode] ?? leg.mode) : leg.mode.replaceAll("_", " ");
  return (
    <div className="ml-5 flex min-h-12 items-center gap-3 border-l border-dashed border-ink/20 py-2 pl-6 text-xs text-ink/55">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lake/8 text-lake">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink/75">
          {(Number(leg.distanceMeters) / 1000).toFixed(1)} km {"\u00b7"} {leg.durationMinutes} {language === "zh" ? "分钟" : "min"}
        </p>
        <p className="mt-0.5 truncate uppercase tracking-normal">
          {mode} {"\u00b7"} {leg.routeSource}
        </p>
      </div>
      <span className="font-semibold text-ink/70">{formatCny(leg.estimatedCostFen)}</span>
    </div>
  );
}
