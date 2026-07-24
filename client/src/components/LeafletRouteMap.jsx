import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";

function markerIcon(index, selected) {
  return L.divIcon({
    className: "nuogo-map-marker-shell",
    html: `<span class="nuogo-map-marker${selected ? " is-selected" : ""}">${index + 1}</span>`,
    iconSize: [38, 46],
    iconAnchor: [19, 43],
    popupAnchor: [0, -42]
  });
}

function popupContent(activity, language) {
  const root = document.createElement("div");
  root.className = "nuogo-map-popup";

  const title = document.createElement("strong");
  title.textContent = activity.name[language];
  root.appendChild(title);

  const time = document.createElement("span");
  time.textContent = `${activity.startTime} - ${activity.endTime}`;
  root.appendChild(time);

  const address = document.createElement("p");
  address.textContent = activity.address[language];
  root.appendChild(address);
  return root;
}

export default function LeafletRouteMap({
  activities,
  selectedActivityId,
  onSelect
}) {
  const { language } = useLanguage();
  const element = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const hasEstimatedLocation = activities.some((activity) => activity.locationIsEstimated);

  useEffect(() => {
    const supportsVectorMap = typeof window.SVGSVGElement !== "undefined" &&
      typeof window.SVGSVGElement.prototype.createSVGRect === "function";
    if (!element.current || !activities.length || !supportsVectorMap) return undefined;

    const map = L.map(element.current, {
      zoomControl: true,
      attributionControl: true
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const route = activities.map((activity) => [
      activity.location.latitude,
      activity.location.longitude
    ]);
    if (route.length > 1) {
      L.polyline(route, {
        color: "#e44d32",
        weight: 5,
        opacity: 0.9,
        lineJoin: "round"
      }).addTo(map);
      map.fitBounds(route, { padding: [46, 46], maxZoom: 15 });
    } else {
      map.setView(route[0], 15);
    }

    markersRef.current = new Map();
    activities.forEach((activity, index) => {
      const marker = L.marker(route[index], {
        icon: markerIcon(index, activity.id === selectedActivityId),
        title: activity.name[language],
        keyboard: true
      })
        .bindPopup(popupContent(activity, language))
        .on("click", () => onSelect(activity.id))
        .addTo(map);
      markersRef.current.set(activity.id, { marker, index });
    });

    return () => {
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [activities, language, onSelect]);

  useEffect(() => {
    for (const [activityId, entry] of markersRef.current) {
      entry.marker.setIcon(markerIcon(entry.index, activityId === selectedActivityId));
    }
    const selected = activities.find((activity) => activity.id === selectedActivityId);
    if (selected && mapRef.current) {
      mapRef.current.panTo([
        selected.location.latitude,
        selected.location.longitude
      ], { animate: true });
    }
  }, [activities, selectedActivityId]);

  if (!activities.length) {
    return (
      <div data-testid="route-map-panel" className="grid h-[280px] place-items-center bg-white text-sm text-ink/50 sm:h-[300px] xl:h-[320px]">
        {language === "zh" ? "当天暂无路线点" : "No route points for this day"}
      </div>
    );
  }

  return (
    <section data-testid="route-map-panel" className="relative h-[280px] overflow-hidden border border-ink/10 bg-[#dfe8df] sm:h-[300px] xl:h-[320px]">
      <div
        ref={element}
        className="h-full w-full"
        role="application"
        aria-label={language === "zh" ? "互动行程地图" : "Interactive itinerary map"}
      />
      <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-2 bg-white/95 px-3 py-2 text-xs font-bold text-ink shadow">
        <MapPin className="h-4 w-4 text-jade" />
        <span>
          {hasEstimatedLocation
            ? (language === "zh" ? "互动地图 · 部分位置为估算" : "Interactive map · some locations estimated")
            : (language === "zh" ? "互动路线地图" : "Interactive route map")}
        </span>
      </div>
      <div className="sr-only" aria-label="Map locations">
        {activities.map((activity) => (
          <button
            type="button"
            key={activity.id}
            aria-label={`Map marker: ${activity.name[language]}`}
            onClick={() => onSelect(activity.id)}
          >
            {activity.name[language]}
          </button>
        ))}
      </div>
    </section>
  );
}
