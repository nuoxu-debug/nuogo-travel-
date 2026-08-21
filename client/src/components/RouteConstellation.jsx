import { MapPin, Plane, TrainFront } from "lucide-react";

const iconByType = {
  origin: Plane,
  city: MapPin,
  connection: TrainFront
};

export default function RouteConstellation({ stops, className = "", ariaLabel = "Journey route" }) {
  return (
    <ol className={`route-constellation ${className}`} aria-label={ariaLabel}>
      {stops.map((stop, index) => {
        const Icon = iconByType[stop.type] || MapPin;
        return (
          <li key={`${stop.label}-${index}`} className="route-constellation-stop">
            <span className="route-constellation-marker" aria-hidden="true"><Icon /></span>
            <span className="min-w-0">
              <b>{stop.label}</b>
              <small>{stop.meta}</small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
