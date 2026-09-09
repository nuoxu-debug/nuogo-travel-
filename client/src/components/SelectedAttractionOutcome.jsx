import { Check, Info, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { localizedText } from "../i18n/display.js";

export default function SelectedAttractionOutcome({ outcome, mode, legacyPreferredSights = [] }) {
  const { language } = useLanguage();
  const zh = language === "zh";
  if (!outcome && legacyPreferredSights.length) {
    return <section className="border-t border-ink/10 pt-4"><h3 className="text-xs font-extrabold uppercase text-ink/45">{zh ? "历史偏好景点" : "Historical attraction preferences"}</h3><ul className="mt-2 flex flex-wrap gap-2">{legacyPreferredSights.map((name) => <li key={name} className="rounded-full bg-lake/8 px-3 py-1 text-xs font-bold text-lake">{name}</li>)}</ul></section>;
  }
  if (!outcome || mode === "AUTO") {
    return <p className="flex gap-2 border-t border-ink/10 pt-4 text-sm text-ink/60"><Info className="mt-0.5 h-4 w-4 shrink-0 text-lake" />{zh ? "已根据经过验证的目的地景点资料自动推荐。" : "Recommendations use the validated destination attraction pool."}</p>;
  }
  return <section className="border-t border-ink/10 pt-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <div><h3 className="text-xs font-extrabold uppercase text-jade">{zh ? "已加入的已选景点" : "Selected attractions included"}</h3><ul className="mt-2 grid gap-1.5 text-sm">{outcome.included?.length ? outcome.included.map((item) => <li key={item.requestId} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-jade" />{localizedText(item.displayName, language)}</li>) : <li className="text-ink/45">{zh ? "暂无" : "None"}</li>}</ul></div>
      <div><h3 className="text-xs font-extrabold uppercase text-vermilion">{zh ? "未加入的已选景点" : "Selected attractions not included"}</h3><ul className="mt-2 grid gap-2 text-sm">{outcome.excluded?.length ? outcome.excluded.map((item) => <li key={item.requestId} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-vermilion" /><span><strong>{localizedText(item.displayName, language)}</strong><span className="mt-0.5 block text-ink/55">{localizedText(item.reason, language)}</span></span></li>) : <li className="text-ink/45">{zh ? "暂无" : "None"}</li>}</ul></div>
    </div>
  </section>;
}
