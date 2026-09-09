import { Clock3, Coins, MapPin } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { displayLabel, localizedText } from "../i18n/display.js";

const sgd = (minor) => `S$ ${(Number(minor ?? 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export default function ItineraryActivityDetails({ activity }) {
  const { language } = useLanguage();
  const zh = language === "zh";
  const data = activity?.presentation;
  if (!data || activity.activityType === "MEAL") return null;
  return <section className="mt-4 border-t border-ink/10 pt-4">
    <h3 className="font-display text-xl font-bold">{localizedText(data.name, language)}</h3>
    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink/55"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{data.startTime}–{data.endTime} · {data.durationMinutes} {zh ? "分钟" : "min"}</span><span>{displayLabel(language, "activity", activity.activityType)}</span><span className="flex items-center gap-1"><Coins className="h-3.5 w-3.5" />{sgd(data.estimatedCostMinor)} · {displayLabel(language, "source", data.costSourceType)}</span></p>
    <p className="mt-3 leading-7 text-ink/65">{localizedText(data.description, language, "common.descriptionUnavailable")}</p>
    {data.descriptionSourceType && <p className="mt-2 text-xs font-bold text-jade">{displayLabel(language, "source", data.descriptionSourceType)}</p>}
    {data.reason && <p className="mt-3 text-sm text-ink/60"><strong className="mr-2 text-lake">{zh ? "推荐理由" : "Why it fits"}</strong>{localizedText(data.reason, language)}</p>}
    {data.nextTransport && <p className="mt-3 flex items-center gap-2 text-xs text-ink/55"><MapPin className="h-3.5 w-3.5 text-lake" />{zh ? "下一段" : "Next"}: {displayLabel(language, "transport", data.nextTransport.mode)} · {data.nextTransport.durationMinutes} {zh ? "分钟" : "min"}</p>}
  </section>;
}
