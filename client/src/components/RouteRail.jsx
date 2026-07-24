import { useEffect, useRef } from "react";
import { useAnime } from "../hooks/useAnime.js";

const tones = {
  jade: "#4fd2b1",
  vermilion: "#ee5138",
  gold: "#e1a91a",
  lake: "#54b7cf"
};

export default function RouteRail({ stops, tone = "vermilion", compact = false, className = "" }) {
  const root = useRef(null);
  const animate = useAnime();

  useEffect(() => {
    animate({
      targets: root.current?.querySelector(".route-rail-line"),
      scaleX: [0, 1],
      duration: 900,
      easing: "easeInOutCubic"
    });
    animate({
      targets: root.current?.querySelectorAll(".route-stop"),
      opacity: [0, 1],
      translateY: [12, 0],
      scale: [0.86, 1],
      delay: (_target, index) => 260 + index * 150,
      duration: 560,
      easing: "easeOutBack"
    });
  }, [animate, stops]);

  return (
    <ol
      ref={root}
      className={`route-rail grid grid-flow-col auto-cols-fr gap-2 ${className}`}
      style={{ "--route-tone": tones[tone] ?? tones.vermilion }}
    >
      <span className="route-rail-line" aria-hidden="true" />
      {stops.map((stop, index) => (
        <li key={`${stop.label}-${index}`} className={`route-stop min-w-0 opacity-0 ${index === 0 ? "is-active" : ""}`}>
          <span className="route-stop-index">{String(index + 1).padStart(2, "0")}</span>
          <strong className={`mt-3 block truncate ${compact ? "text-xs" : "text-sm"}`}>{stop.label}</strong>
          {stop.meta && <span className="mt-1 block text-xs opacity-55">{stop.meta}</span>}
        </li>
      ))}
    </ol>
  );
}
