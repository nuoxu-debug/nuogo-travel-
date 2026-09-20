import { Check, ChevronRight, Info, MapPinned, Sparkles, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { localizedText } from "../i18n/display.js";

const autoHighlights = [
  { name: { en: "Gardens by the Bay", zh: "滨海湾花园" }, tag: { en: "Garden landmark", zh: "花园地标" } },
  { name: { en: "National Gallery Singapore", zh: "新加坡国家美术馆" }, tag: { en: "Culture", zh: "文化" } },
  { name: { en: "Singapore Botanic Gardens", zh: "新加坡植物园" }, tag: { en: "Nature", zh: "自然" } }
];

export default function SelectedAttractionOutcome({ outcome, mode, legacyPreferredSights = [] }) {
  const { language } = useLanguage();
  const zh = language === "zh";

  if (!outcome && legacyPreferredSights.length) {
    return <section className="border-t border-ink/10 pt-4">
      <h3 className="text-xs font-extrabold uppercase text-ink/45">{zh ? "历史偏好景点" : "Historical attraction preferences"}</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {legacyPreferredSights.map((name) => <li key={name} className="rounded-full bg-lake/8 px-3 py-1 text-xs font-bold text-lake">{name}</li>)}
      </ul>
    </section>;
  }

  if (!outcome || mode === "AUTO") {
    return <section className="border-t border-ink/10 pt-4">
      <div className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-lake"><Sparkles className="h-4 w-4" />{zh ? "推荐池预览" : "Recommendation pool preview"}</p>
            <p className="mt-2 flex gap-2 text-sm leading-6 text-ink/62"><Info className="mt-0.5 h-4 w-4 shrink-0 text-lake" />{zh ? "已根据经过验证的目的地景点资料自动推荐。" : "Recommendations use the validated destination attraction pool."}</p>
          </div>
          <a href="/discover/singapore" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-ink px-3 text-sm font-extrabold text-white transition-colors hover:bg-ink/88">
            {zh ? "打开新加坡景点发现" : "Open Singapore discovery"}<ChevronRight className="h-4 w-4" />
          </a>
        </div>
        <ul className="grid gap-2 sm:grid-cols-3">
          {autoHighlights.map((item) => <li key={item.name.en} className="min-h-[5.25rem] rounded-lg border border-ink/10 bg-paper p-3">
            <MapPinned className="h-4 w-4 text-jade" />
            <strong className="mt-2 block text-sm leading-5 text-ink">{localizedText(item.name, language)}</strong>
            <span className="mt-1 block text-xs font-bold text-ink/45">{localizedText(item.tag, language)}</span>
          </li>)}
        </ul>
      </div>
    </section>;
  }

  return <section className="border-t border-ink/10 pt-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <h3 className="text-xs font-extrabold uppercase text-jade">{zh ? "已加入的已选景点" : "Selected attractions included"}</h3>
        <ul className="mt-2 grid gap-1.5 text-sm">
          {outcome.included?.length ? outcome.included.map((item) => <li key={item.requestId} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-jade" />{localizedText(item.displayName, language)}</li>) : <li className="text-ink/45">{zh ? "暂无" : "None"}</li>}
        </ul>
      </div>
      <div>
        <h3 className="text-xs font-extrabold uppercase text-vermilion">{zh ? "未加入的已选景点" : "Selected attractions not included"}</h3>
        <ul className="mt-2 grid gap-2 text-sm">
          {outcome.excluded?.length ? outcome.excluded.map((item) => <li key={item.requestId} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-vermilion" /><span><strong>{localizedText(item.displayName, language)}</strong><span className="mt-0.5 block text-ink/55">{localizedText(item.reason, language)}</span></span></li>) : <li className="text-ink/45">{zh ? "暂无" : "None"}</li>}
        </ul>
      </div>
    </div>
  </section>;
}
