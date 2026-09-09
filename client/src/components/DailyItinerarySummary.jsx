import { CalendarDays, Coins, Route } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { localizedText } from "../i18n/display.js";

const sgd = (minor) => `S$ ${(Number(minor ?? 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export default function DailyItinerarySummary({ day }) {
  const { language } = useLanguage();
  const zh = language === "zh";
  const data = day?.presentation;
  if (!data) return null;
  return <section aria-label={zh ? `第 ${day.dayNumber} 天摘要` : `Day ${day.dayNumber} summary`} className="mb-4 border-b border-ink/10 pb-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-1.5 text-xs font-bold text-jade"><CalendarDays className="h-3.5 w-3.5" />{day.date}</p><h3 className="mt-1 font-display text-lg font-bold">{localizedText(data.theme, language)}</h3></div><strong className="flex items-center gap-1.5 text-sm text-sky"><Coins className="h-4 w-4" />{sgd(data.estimatedDailyCostMinor)}</strong></div>
    <p className="mt-2 flex items-center gap-2 text-xs text-ink/55"><Route className="h-4 w-4" />{zh ? `${data.activityCount} 个活动 · ${data.mealCount} 次用餐 · ${data.transportLegCount} 段交通` : `${data.activityCount} activities · ${data.mealCount} meals · ${data.transportLegCount} transport legs`}</p>
  </section>;
}
