import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { MapPin, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";
import ActivityCard from "./ActivityCard.jsx";

export default function Timeline({
  day,
  selectedActivityId,
  readOnly,
  onSelect,
  onOpenDetails,
  onEdit,
  onDelete,
  onRegenerate,
  onFavorite,
  onAdd,
  onReorder,
  sharedToken,
  onVoted
}) {
  const { language } = useLanguage();
  const animate = useAnime();
  const root = useRef(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    animate({
      targets: root.current?.querySelectorAll("article"),
      translateY: [12, 0],
      opacity: [0, 1],
      delay: (_target, index) => index * 55,
      duration: 500,
      easing: "easeOutExpo"
    });
  }, [animate, day.id]);

  function dragEnd(event) {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = day.activities.findIndex((item) => item.id === event.active.id);
    const newIndex = day.activities.findIndex((item) => item.id === event.over.id);
    onReorder(arrayMove(day.activities, oldIndex, newIndex));
  }

  const selectedIndex = Math.max(0, day.activities.findIndex((item) => item.id === selectedActivityId));
  const selectedActivity = day.activities[selectedIndex];
  const legLabel = language === "zh"
    ? `第 ${selectedIndex + 1} 站，共 ${day.activities.length} 站`
    : `Stop ${selectedIndex + 1} of ${day.activities.length}`;

  return (
    <div ref={root} className="mt-5">
      <div className="workspace-leg-progress" role="status" aria-label={language === "zh" ? "路线进度" : "Route leg progress"}>
        <MapPin aria-hidden="true" />
        <span>{legLabel}</span>
        <strong>{selectedActivity?.name?.[language]}</strong>
        <progress max={Math.max(1, day.activities.length)} value={selectedIndex + 1} aria-hidden="true" />
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={day.activities.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-4">
            {day.activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                selected={selectedActivityId === activity.id}
                readOnly={readOnly}
                onSelect={onSelect}
                onOpenDetails={onOpenDetails}
                onEdit={onEdit}
                onDelete={onDelete}
                onRegenerate={onRegenerate}
                onFavorite={onFavorite}
                sharedToken={sharedToken}
                onVoted={onVoted}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {!readOnly && (
        <button type="button" onClick={onAdd} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 border border-dashed border-ink/25 bg-paper text-sm font-bold text-ink/55 transition-colors hover:border-jade hover:text-jade">
          <Plus className="h-4 w-4" /> {language === "zh" ? "添加行程点" : "Add activity"}
        </button>
      )}
    </div>
  );
}
