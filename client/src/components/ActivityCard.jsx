import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, Heart, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import AttractionImage from "./AttractionImage.jsx";
import VoteButton from "./VoteButton.jsx";

const categoryColors = {
  natural_scenery: "bg-emerald-100 text-emerald-800",
  historical_relics: "bg-amber-100 text-amber-900",
  city_landmarks: "bg-sky-100 text-sky-900",
  local_street_food: "bg-rose-100 text-rose-900",
  regional_cuisines: "bg-orange-100 text-orange-900",
  boutique_homestays: "bg-violet-100 text-violet-900",
  budget_hotels: "bg-teal-100 text-teal-900",
  family_resorts: "bg-pink-100 text-pink-900"
};

const categoryLabels = {
  natural_scenery: { en: "Natural scenery", zh: "自然风光" },
  historical_relics: { en: "Historical relics", zh: "历史古迹" },
  city_landmarks: { en: "City landmarks", zh: "城市地标" },
  local_street_food: { en: "Local street food", zh: "本地小吃" },
  regional_cuisines: { en: "Regional cuisines", zh: "地方菜系" },
  boutique_homestays: { en: "Boutique homestay", zh: "精品民宿" },
  budget_hotels: { en: "Budget hotel", zh: "经济酒店" },
  family_resorts: { en: "Family resort", zh: "亲子度假" }
};

export default function ActivityCard({
  activity,
  selected,
  readOnly,
  onSelect,
  onOpenDetails,
  onEdit,
  onDelete,
  onRegenerate,
  onFavorite,
  sharedToken,
  onVoted
}) {
  const { language } = useLanguage();
  const sortable = useSortable({ id: activity.id, disabled: readOnly });
  const hasMedia = Boolean(activity.imageUrl);
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.55 : 1,
    zIndex: sortable.isDragging ? 20 : "auto"
  };

  return (
    <article
      ref={sortable.setNodeRef}
      style={style}
      data-testid={`activity-${activity.id}`}
      data-selected={selected ? "true" : "false"}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => {
        onSelect(activity.id);
        onOpenDetails?.(activity);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(activity.id);
          onOpenDetails?.(activity);
        }
      }}
      className={`interactive-lift relative grid min-h-[168px] cursor-pointer ${hasMedia ? "grid-cols-[60px_92px_minmax(0,1fr)]" : "grid-cols-[60px_minmax(0,1fr)]"} border bg-paper transition-colors ${selected ? "border-jade shadow-[0_0_0_3px_rgba(7,134,111,.12)]" : "border-ink/10"}`}
    >
      <div className="border-r border-ink/10 p-3 text-center">
        <span className="block text-xs font-bold text-vermilion">{activity.startTime}</span>
        <span className="mt-1 block text-[10px] text-ink/35">{activity.endTime}</span>
        {!readOnly && (
          <button
            type="button"
            aria-label={`Drag ${activity.name[language]}`}
            className="mx-auto mt-4 grid h-11 w-11 place-items-center text-ink/30"
            {...sortable.attributes}
            {...sortable.listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </div>
      {hasMedia && (
        <div className="border-r border-ink/10 p-2">
          <AttractionImage
            activity={activity}
            className="h-full min-h-[150px] w-full"
          />
        </div>
      )}
      <div className="min-w-0 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase ${categoryColors[activity.category]}`}>
              {categoryLabels[activity.category]?.[language] ?? activity.category.replaceAll("_", " ")}
            </span>
            <h3 className="mt-2 truncate font-display text-lg font-bold">{activity.name[language]}</h3>
          </div>
          <strong className="shrink-0 text-sm text-jade">¥{activity.estimatedCost}</strong>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/55">{activity.description[language]}</p>
        <div className="mt-3 flex items-center justify-end gap-1">
          {sharedToken && <VoteButton token={sharedToken} activity={activity} onVoted={onVoted} />}
          {!readOnly && (
            <>
            <button type="button" aria-label={`Favorite ${activity.name[language]}`} title="Favorite" onClick={(event) => { event.stopPropagation(); onFavorite(activity); }} className="grid h-11 w-11 place-items-center text-ink/45 hover:text-vermilion">
              <Heart className={`h-4 w-4 ${activity.isFavorite ? "fill-current text-vermilion" : ""}`} />
            </button>
            <button type="button" aria-label={`Regenerate ${activity.name[language]}`} title="Regenerate" onClick={(event) => { event.stopPropagation(); onRegenerate(activity); }} className="grid h-11 w-11 place-items-center text-ink/45 hover:text-jade">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button type="button" aria-label={`Edit ${activity.name[language]}`} title="Edit" onClick={(event) => { event.stopPropagation(); onEdit(activity); }} className="grid h-11 w-11 place-items-center text-ink/45 hover:text-jade">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" aria-label={`Delete ${activity.name[language]}`} title="Delete" onClick={(event) => { event.stopPropagation(); onDelete(activity); }} className="grid h-11 w-11 place-items-center text-ink/45 hover:text-vermilion">
              <Trash2 className="h-4 w-4" />
            </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
