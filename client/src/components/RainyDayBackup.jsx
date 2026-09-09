import { CloudRain, MapPin, WalletCards } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { displayLabel, localizedText } from "../i18n/display.js";

function sgd(minor) {
  return `S$ ${(Number(minor ?? 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export default function RainyDayBackup({ backups = [] }) {
  const { language } = useLanguage();
  const zh = language === "zh";
  if (!backups.length) return null;

  return (
    <section aria-label={zh ? "雨天备选方案" : "Rainy-day contingency"} className="border border-sky/20 bg-sky/5 px-4 py-4">
      <div className="flex items-start gap-3">
        <CloudRain className="mt-0.5 h-5 w-5 shrink-0 text-sky" aria-hidden="true" />
        <div>
          <h2 className="font-display text-lg font-bold">{zh ? "可选雨天备选" : "Optional rainy-day alternative"}</h2>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            {zh
              ? "此备选目前未启用，也不会自动替换原活动。只有您明确选择后才使用；本功能不检测天气。"
              : "This contingency is inactive and never replaces the original activity automatically. Use it only if you explicitly choose to; Nuogo does not detect weather."}
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-3">
        {backups.map((backup) => {
          const alternative = backup.alternative ?? backup;
          return (
          <li key={`${backup.dayNumber}-${alternative.xid}`} className="border-l-2 border-sky bg-white px-4 py-3">
            <p className="text-xs font-bold uppercase text-sky">{zh ? `第 ${backup.dayNumber} 天 · 未启用` : `Day ${backup.dayNumber} · Inactive`}</p>
            <h3 className="mt-1 font-display text-base font-bold">{localizedText(alternative.displayName ?? alternative.name, language)}</h3>
            {backup.replacesDisplayName && <p className="mt-1 text-sm text-ink/55">{zh ? "可替代" : "Alternative to"}: {localizedText(backup.replacesDisplayName, language)}</p>}
            <p className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-ink/55">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{zh ? "来源：" : "Source: "}{displayLabel(language, "source", alternative.primarySource ?? alternative.sourceType)}</span>
              <span className="flex items-center gap-1"><WalletCards className="h-3.5 w-3.5" aria-hidden="true" />{zh ? "替换后估算" : "Estimated if used"}: {sgd(backup.estimatedCostMinor ?? backup.estimatedActivityCostMinor)}</span>
            </p>
          </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ink/45">{zh ? "未使用的备选费用不计入行程总预算。" : "Unused contingency costs are excluded from the itinerary total."}</p>
    </section>
  );
}
