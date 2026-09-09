import { Check, Clock3, MapPin, Plus, X } from "lucide-react";

const labels = {
  en: { ALL: "All", HISTORY: "History", CULTURE: "Culture", NATURE: "Nature", FOOD: "Food", FAMILY: "Family", ENTERTAINMENT: "Entertainment", OTHER: "Other" },
  zh: { ALL: "全部", HISTORY: "历史", CULTURE: "文化", NATURE: "自然", FOOD: "美食", FAMILY: "亲子", ENTERTAINMENT: "娱乐", OTHER: "其他" }
};

export const categoryLabel = (category, language) => labels[language]?.[category] ?? labels[language]?.OTHER ?? "Other";

function sourceLabel(attraction, language) {
  const source = attraction.sourceType ?? attraction.source?.sourceType ?? (attraction.providerMode === "DEMO" ? "DEMO_FIXTURE" : "OPENTRIPMAP_API");
  const chinese = language === "zh";
  if (source === "OPENTRIPMAP_API") return chinese ? "OpenTripMap 支持" : "OpenTripMap-supported";
  if (source === "DEMO_FIXTURE") return chinese ? "演示资料" : "Demo data";
  if (source === "DATABASE") return chinese ? "本地资料" : "Local data";
  return chinese ? "来源暂不可用" : "Source unavailable";
}

export default function AttractionCard({ attraction, language, selected, selectionEnabled = true, onToggle, onFocus }) {
  const chinese = language === "zh";
  const name = attraction.name?.[language] || attraction.displayName?.[language] || attraction.name?.en || attraction.displayName?.en;
  const description = attraction.description?.[language] || attraction.description?.en || (chinese ? "暂无景点介绍" : "Description unavailable");
  const actionLabel = selected ? (chinese ? `移除${name}` : `Remove ${name}`) : (chinese ? `加入${name}` : `Add ${name}`);
  const actionText = selected ? (chinese ? "已选择" : "Selected") : (chinese ? "加入行程" : "Add to trip");
  const disabledText = chinese ? "切换至自主选择后可加入" : "Switch to Choose Attractions Myself to select";

  return <article className={`discovery-card ${selected ? "is-selected" : ""}`} data-selected={selected ? "true" : "false"}>
    <button type="button" className="discovery-card-main" data-attraction-xid={attraction.xid} onClick={onFocus} aria-label={chinese ? `在地图上查看${name}` : `View ${name} on map`}>
      <span className="discovery-card-index"><MapPin aria-hidden="true" /></span>
      <span className="min-w-0">
        <span className="discovery-card-meta"><span>{categoryLabel(attraction.category, language)}</span>{attraction.suggestedVisitDurationMinutes && <span><Clock3 aria-hidden="true" /> {attraction.suggestedVisitDurationMinutes} {chinese ? "分钟" : "min"}</span>}</span>
        <strong>{name}</strong>
        <span className="discovery-card-description">{description}</span>
        <span className="discovery-card-source"><Check aria-hidden="true" /> {sourceLabel(attraction, language)}</span>
      </span>
    </button>
    <button type="button" className="discovery-select-button" disabled={!selectionEnabled} aria-pressed={selected} aria-label={selectionEnabled ? actionLabel : disabledText} onClick={onToggle}>
      {selected ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}<span>{selectionEnabled ? actionText : (chinese ? "建议模式" : "Suggestion mode")}</span>
    </button>
  </article>;
}
