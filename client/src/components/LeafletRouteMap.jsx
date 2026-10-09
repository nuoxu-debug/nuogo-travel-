import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { displayLabel } from "../i18n/display.js";

export const ROUTE_MAP_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function markerIcon(index, selected) {
  return L.divIcon({
    className: "nuogo-map-marker-shell",
    html: `<span class="nuogo-map-marker${selected ? " is-selected" : ""}">${index + 1}</span>`,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
    popupAnchor: [0, -26]
  });
}

function textValue(value, language, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value[language] ?? value.en ?? value.zh ?? fallback;
}

function curveSegment(start, end, index) {
  const [startLat, startLng] = start;
  const [endLat, endLng] = end;
  const latDelta = endLat - startLat;
  const lngDelta = endLng - startLng;
  const distance = Math.hypot(latDelta, lngDelta);
  if (!Number.isFinite(distance) || distance === 0) return [start, end];
  const direction = index % 2 === 0 ? 1 : -1;
  const bend = Math.min(distance * 0.18, 0.012) * direction;
  const control = [
    (startLat + endLat) / 2 - (lngDelta / distance) * bend,
    (startLng + endLng) / 2 + (latDelta / distance) * bend
  ];
  return Array.from({ length: 18 }, (_, step) => {
    const t = step / 17;
    const oneMinus = 1 - t;
    return [
      oneMinus * oneMinus * startLat + 2 * oneMinus * t * control[0] + t * t * endLat,
      oneMinus * oneMinus * startLng + 2 * oneMinus * t * control[1] + t * t * endLng
    ];
  });
}

function routeSegments(route) {
  return route.slice(0, -1).map((point, index) => curveSegment(point, route[index + 1], index));
}

function popupContent(activity, language, onOpenDetails) {
  const root = document.createElement("div");
  root.className = "nuogo-map-popup";

  if (activity.imageUrl) {
    const image = document.createElement("img");
    image.src = activity.imageUrl;
    image.alt = textValue(activity.name, language);
    image.loading = "lazy";
    root.appendChild(image);
  }

  const meta = document.createElement("span");
  meta.className = "nuogo-map-popup__meta";
  meta.textContent = activity.locationIsEstimated
    ? "Estimated location"
    : [
        activity.activityType ? displayLabel(language, "activity", activity.activityType) : "",
        activity.durationMinutes ? `${activity.durationMinutes} min` : ""
      ].filter(Boolean).join(" - ");
  root.appendChild(meta);

  const title = document.createElement("strong");
  title.textContent = textValue(activity.name, language);
  root.appendChild(title);

  if (activity.startTime || activity.endTime) {
    const time = document.createElement("span");
    time.className = "nuogo-map-popup__time";
    time.textContent = [activity.startTime, activity.endTime].filter(Boolean).join(" - ");
    root.appendChild(time);
  }

  const addressText = textValue(activity.address, language);
  if (addressText) {
    const address = document.createElement("p");
    address.textContent = addressText;
    root.appendChild(address);
  }

  if (activity.costLabel) {
    const cost = document.createElement("span");
    cost.className = "nuogo-map-popup__cost";
    cost.textContent = activity.costLabel;
    root.appendChild(cost);
  }

  if (activity.canOpenDetails && typeof onOpenDetails === "function") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nuogo-map-popup__button";
    button.textContent = "View full details";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onOpenDetails(activity.id);
    });
    root.appendChild(button);
  }
  return root;
}

export default function LeafletRouteMap({
  activities,
  selectedActivityId,
  onSelect,
  onOpenDetails,
  className = ""
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

    L.tileLayer(ROUTE_MAP_TILE_URL, {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTION
    }).addTo(map);

    const route = activities.map((activity) => [
      activity.location.latitude,
      activity.location.longitude
    ]);

    if (route.length > 1) {
      routeSegments(route).forEach((segment) => {
        L.polyline(segment, {
          className: "nuogo-estimated-route-halo",
          color: "#fff8e8",
          weight: 9,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
          interactive: false
        }).addTo(map);
        L.polyline(segment, {
          className: "nuogo-estimated-route",
          color: "#ff6b4a",
          weight: 5,
          opacity: 0.92,
          lineCap: "round",
          lineJoin: "round",
          dashArray: "1 10",
          interactive: false
        }).addTo(map);
      });
      map.fitBounds(route, { padding: [46, 46], maxZoom: 15 });
    } else {
      map.setView(route[0], 15);
    }

    markersRef.current = new Map();
    activities.forEach((activity, index) => {
      const marker = L.marker(route[index], {
        icon: markerIcon(index, activity.id === selectedActivityId),
        title: textValue(activity.name, language),
        keyboard: true
      })
        .bindPopup(popupContent(activity, language, onOpenDetails), {
          className: "nuogo-map-popup-frame",
          maxWidth: 260,
          minWidth: 220
        })
        .on("click", () => onSelect?.(activity.id))
        .addTo(map);
      markersRef.current.set(activity.id, { marker, index });
    });

    return () => {
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [activities, language, onOpenDetails, onSelect, selectedActivityId]);

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
      <div data-testid="route-map-panel" className={`grid place-items-center bg-white text-sm text-ink/50 ${className || "h-[280px] sm:h-[300px] xl:h-[320px]"}`}>
        No route points for this day
      </div>
    );
  }

  return (
    <section data-testid="route-map-panel" className={`relative overflow-hidden border border-ink/10 bg-[#dfe8df] shadow-[0_18px_45px_rgba(19,34,28,.08)] ${className || "h-[280px] sm:h-[300px] xl:h-[320px]"}`}>
      <div
        ref={element}
        className="h-full w-full"
        role="application"
        aria-label="Interactive itinerary map"
      />
      <div className="pointer-events-none absolute right-3 top-3 z-[500] flex max-w-[min(25rem,calc(100%-5.5rem))] items-start gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold text-ink shadow-[0_12px_30px_rgba(19,34,28,.16)]">
        <MapPin className="h-4 w-4 text-jade" />
        <span className="grid gap-0.5">
          <strong className="text-[13px] leading-4">Estimated route map</strong>
          <span className="font-semibold text-ink/58">
            {hasEstimatedLocation
              ? "Route shape is an estimate; some locations are estimated."
              : "Route shape is an estimate, not live navigation."}
          </span>
        </span>
      </div>
      <div className="sr-only" aria-label="Map locations">
        {activities.map((activity) => (
          <button
            type="button"
            key={activity.id}
            aria-label={`Map marker: ${textValue(activity.name, language)}`}
            aria-current={activity.id === selectedActivityId ? "location" : undefined}
            onClick={() => (activity.canOpenDetails ? onOpenDetails?.(activity.id) : onSelect?.(activity.id))}
          >
            {textValue(activity.name, language)}
          </button>
        ))}
      </div>
    </section>
  );
}
