import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinned } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

const markerIcon = (index, focused, selected) => L.divIcon({ className: "nuogo-map-marker-shell", html: `<span class="nuogo-map-marker${focused ? " is-focused" : ""}${selected ? " is-selected" : ""}">${index + 1}</span>`, iconSize: [38, 46], iconAnchor: [19, 43] });

export default function AttractionDiscoveryMap({ attractions, focusedXid, selectedXids = [], onFocus, language, label }) {
  const element = useRef(null); const mapRef = useRef(null); const markers = useRef(new Map());
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const valid = useMemo(() => attractions.filter(({ coordinates }) => coordinates?.coordinateSystem === "WGS84"), [attractions]);
  const selected = useMemo(() => new Set(selectedXids), [selectedXids]);

  useEffect(() => {
    const supportsSvg = typeof window.SVGSVGElement !== "undefined" && typeof window.SVGSVGElement.prototype.createSVGRect === "function";
    if (!element.current || !valid.length || !supportsSvg) return undefined;
    const map = L.map(element.current); mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    const points = valid.map(({ coordinates }) => [coordinates.latitude, coordinates.longitude]);
    points.length > 1 ? map.fitBounds(points, { padding: [42, 42], maxZoom: 13 }) : map.setView(points[0], 13);
    markers.current = new Map(valid.map((attraction, index) => {
      const name = attraction.name?.[language] || attraction.displayName?.[language] || attraction.name?.en;
      const marker = L.marker(points[index], { icon: markerIcon(index, false, selected.has(attraction.xid)), title: name, keyboard: true }).on("click", () => onFocus(attraction.xid)).addTo(map);
      return [attraction.xid, { marker, index }];
    }));
    return () => { markers.current.clear(); map.remove(); mapRef.current = null; };
  }, [language, onFocus, selected, valid]);

  useEffect(() => {
    for (const [xid, entry] of markers.current) entry.marker.setIcon(markerIcon(entry.index, xid === focusedXid, selected.has(xid)));
    const focused = valid.find(({ xid }) => xid === focusedXid);
    if (focused && mapRef.current) mapRef.current.panTo([focused.coordinates.latitude, focused.coordinates.longitude], { animate: !reducedMotion });
  }, [focusedXid, reducedMotion, selected, valid]);

  const mapLabel = label || (language === "zh" ? "景点地图" : "Attraction map");
  return <section data-testid="discovery-map" data-motion={reducedMotion ? "reduced" : "full"} className="discovery-map" aria-label={mapLabel}>
    <div ref={element} className="absolute inset-0" aria-hidden="true" />
    <div className="discovery-map-label"><MapPinned aria-hidden="true" /> {mapLabel}</div>
    <div className="sr-only">{valid.map((attraction) => { const name = attraction.name?.[language] || attraction.displayName?.[language] || attraction.name?.en; return <button key={attraction.xid} type="button" aria-label={language === "zh" ? `地图位置：${name}` : `Map location: ${name}`} aria-current={focusedXid === attraction.xid ? "location" : undefined} onClick={() => onFocus(attraction.xid)}>{name}</button>; })}</div>
  </section>;
}
