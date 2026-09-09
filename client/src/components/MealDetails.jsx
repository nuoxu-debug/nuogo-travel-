import { Clock3, Coins, MapPin } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { displayLabel, localizedText } from "../i18n/display.js";

const sgd = (minor) => `S$ ${(Number(minor ?? 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export default function MealDetails({ activity }) {
  const { language } = useLanguage();
  const zh = language === "zh";
  const data = activity?.presentation;
  if (!data || activity.activityType !== "MEAL") return null;
  return <section className="mt-4 border-t border-ink/10 pt-4">
    <h3 className="font-display text-xl font-bold">{localizedText(data.name, language)}</h3>
    <p className="mt-2 flex items-center gap-1.5 text-sm text-ink/60"><MapPin className="h-4 w-4 text-lake" />{localizedText(data.area, language)}</p>
    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink/55"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{data.startTime}–{data.endTime} · {data.durationMinutes} {zh ? "分钟" : "min"}</span><span>{localizedText(data.style, language)}</span><span className="flex items-center gap-1"><Coins className="h-3.5 w-3.5" />{zh ? "每人" : "Per traveller"} {sgd(data.estimatedCostPerTravellerMinor)} · {displayLabel(language, "source", data.costSourceType)}</span></p>
    {data.reason && <p className="mt-3 text-sm leading-6 text-ink/60">{localizedText(data.reason, language)}</p>}
  </section>;
}
