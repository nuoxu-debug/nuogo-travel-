import { Navigation } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";

function project(activities) {
  const longitudes = activities.map((item) => item.location.longitude);
  const latitudes = activities.map((item) => item.location.latitude);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  return activities.map((item) => ({
    ...item,
    x: 12 + ((item.location.longitude - minLon) / Math.max(0.001, maxLon - minLon)) * 76,
    y: 84 - ((item.location.latitude - minLat) / Math.max(0.001, maxLat - minLat)) * 68
  }));
}

export default function DemoRouteMap({ activities, selectedActivityId, onSelect }) {
  const { language } = useLanguage();
  const animate = useAnime();
  const root = useRef(null);
  const points = useMemo(() => project(activities), [activities]);
  const route = points.map((point) => `${point.x},${point.y}`).join(" ");
  const hasEstimatedLocation = activities.some((activity) => activity.locationIsEstimated);

  useEffect(() => {
    animate({
      targets: root.current?.querySelector(".route-polyline"),
      strokeDashoffset: [160, 0],
      duration: 1100,
      easing: "easeInOutSine"
    });
    animate({
      targets: root.current?.querySelectorAll(".map-marker-selected"),
      scale: [1, 1.18],
      direction: "alternate",
      loop: true,
      duration: 780,
      easing: "easeInOutSine"
    });
  }, [activities, animate, selectedActivityId]);

  if (!activities.length) return <div className="grid aspect-[4/3] place-items-center bg-ink text-white/50">No route points</div>;

  return (
    <section ref={root} className="relative aspect-[4/3] min-h-[310px] overflow-hidden bg-[#dfe8df]">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(#789788 1px, transparent 1px), linear-gradient(90deg,#789788 1px,transparent 1px)", backgroundSize: "36px 36px" }} />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M 0 22 C 28 8, 48 36, 100 16" fill="none" stroke="#96b7bd" strokeWidth="6" opacity=".8" />
        <polyline className="route-polyline" points={route} fill="none" stroke="#e44d32" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2" />
      </svg>
      {points.map((point, index) => {
        const selected = point.id === selectedActivityId;
        return (
          <button
            type="button"
            key={point.id}
            aria-label={`Map marker: ${point.name[language]}`}
            onClick={() => onSelect(point.id)}
            className={`absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-xs font-bold text-white shadow-lg ${selected ? "map-marker-selected bg-vermilion" : "bg-ink"}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            {index + 1}
          </button>
        );
      })}
      <div className="absolute left-4 top-4 flex items-center gap-2 bg-white/90 px-3 py-2 text-xs font-bold text-ink shadow">
        <Navigation className="h-4 w-4 text-jade" />
        {hasEstimatedLocation
          ? (language === "zh" ? "预估路线预览 · 非实时导航" : "Estimated route preview · not live navigation")
          : (language === "zh" ? "静态路线预览 · 非实时导航" : "Route preview · not live navigation")}
      </div>
    </section>
  );
}
