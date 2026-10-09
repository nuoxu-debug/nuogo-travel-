import { useState } from "react";
import { ArrowRight, Check, Clock3, Heart, MapPin, X } from "lucide-react";
import { getAttractionImageUrl } from "../utils/attractionAssets.js";

const labels = {
  en: { ALL: "All", HISTORY: "History", CULTURE: "Culture", NATURE: "Nature", FOOD: "Food", FAMILY: "Family", ENTERTAINMENT: "Entertainment", OTHER: "Other" },
  zh: { ALL: "全部", HISTORY: "历史文化", CULTURE: "文化", NATURE: "自然生态", FOOD: "美食", FAMILY: "亲子玩乐", ENTERTAINMENT: "娱乐", OTHER: "其他" }
};

export const categoryLabel = (category, language) => labels[language]?.[category] ?? labels[language]?.OTHER ?? "Other";

function sourceLabel(attraction, language) {
  const source = attraction.sourceType ?? attraction.source?.sourceType ?? (attraction.providerMode === "DEMO" ? "DEMO_FIXTURE" : "OPENTRIPMAP_API");
  const chinese = language === "zh";
  if (source === "OPENTRIPMAP_API") return chinese ? "OpenTripMap 支持" : "OpenTripMap-supported";
  if (source === "DEMO_FIXTURE") return chinese ? "演示资料" : "Demo data";
  if (source === "DATABASE") return chinese ? "本地资料" : "Local data";
  if (source === "APPLICATION_CONTENT") return chinese ? "Nuogo \u516c\u5f00\u6d4f\u89c8\u8d44\u6599" : "Nuogo public browsing data";
  return chinese ? "来源暂不可用" : "Source unavailable";
}

export default function AttractionCard({ attraction, language, selected, selectionEnabled = true, onToggle, onFocus }) {
  const [imgFailed, setImgFailed] = useState(false);
  const chinese = language === "zh";
  const name = attraction.name?.[language] || attraction.displayName?.[language] || attraction.name?.en || attraction.displayName?.en;
  const description = attraction.description?.[language] || attraction.description?.en || (chinese ? "暂无景点介绍" : "Description unavailable");
  const actionLabel = selected ? (chinese ? `移除${name}` : `Remove ${name}`) : (chinese ? `加入${name}` : `Add ${name}`);
  const actionText = selected ? (chinese ? "已收藏" : "Saved") : (chinese ? "加入收藏" : "Save place");
  const disabledText = chinese ? "切换至自己选择后可加入" : "Switch to Choose Attractions Myself to select";
  const imageUrl = getAttractionImageUrl(attraction);

  return <article className={`discovery-card ${selected ? "is-selected" : ""}`} data-selected={selected ? "true" : "false"}>
    <button type="button" className="discovery-card-main" data-attraction-xid={attraction.xid} onClick={onFocus} aria-label={chinese ? `在地图上查看${name}` : `View ${name} on map`}>
      <div className="discovery-card-visual">
        {imageUrl && !imgFailed ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="discovery-card-photo"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="discovery-card-index"><MapPin aria-hidden="true" /></span>
        )}
      </div>
      <span className="min-w-0">
        <span className="discovery-card-meta"><span>{categoryLabel(attraction.category, language)}</span>{attraction.suggestedVisitDurationMinutes && <span><Clock3 aria-hidden="true" /> {attraction.suggestedVisitDurationMinutes} {chinese ? "分钟" : "min"}</span>}</span>
        <strong>{name}</strong>
        <span className="discovery-card-description">{description}</span>
        <span className="discovery-card-source"><Check aria-hidden="true" /> {sourceLabel(attraction, language)}</span>
        <span className="discovery-card-detail">{chinese ? "查看详情" : "View details"} <ArrowRight aria-hidden="true" /></span>
      </span>
    </button>
    <button type="button" className="discovery-select-button" disabled={!selectionEnabled} aria-pressed={selected} aria-label={selectionEnabled ? actionLabel : disabledText} onClick={onToggle}>
      {selected ? <X aria-hidden="true" /> : <Heart aria-hidden="true" />}<span>{selectionEnabled ? actionText : (chinese ? "推荐模式" : "Suggestion mode")}</span>
    </button>
  </article>;
}
