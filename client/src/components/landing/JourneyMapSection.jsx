import { useRef, useState } from "react";
import { Compass, MapPin } from "lucide-react";
import { useGsapContext } from "../../motion/useGsapContext.js";

const stops = [
  { label: "Marina Bay", x: 145, y: 294, at: 0.06 },
  { label: "Gardens", x: 312, y: 160, at: 0.34 },
  { label: "Chinatown", x: 498, y: 282, at: 0.62 },
  { label: "Sentosa", x: 704, y: 196, at: 0.9 },
];
const route = "M145 294C214 298 218 143 312 160S402 327 498 282s117-153 206-86";

function pauseAtWaypoints(value) {
  const pause = stops.find((stop) => Math.abs(value - stop.at) < 0.022);
  return pause ? pause.at : value;
}

export default function JourneyMapSection({ copy }) {
  const pathRef = useRef(null);
  const travellerRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const { scope, reducedMotion } = useGsapContext(({ ScrollTrigger }) => {
    const section = scope.current;
    if (!ScrollTrigger || !section || !pathRef.current || !travellerRef.current) return undefined;

    // A single SVG path maps scroll progress to carriage position, bearing and wheel rotation without a heavy 3D renderer.
    return ScrollTrigger.create({
      trigger: section,
      start: "top 74%",
      end: "bottom 28%",
      scrub: 0.5,
      onUpdate: ({ progress: rawProgress }) => {
        const path = pathRef.current;
        const carriage = travellerRef.current;
        if (!path || !carriage) return;
        const next = pauseAtWaypoints(rawProgress);
        const length = path.getTotalLength();
        const point = path.getPointAtLength(length * next);
        const ahead = path.getPointAtLength(Math.min(length, length * next + 2));
        const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * (180 / Math.PI);
        carriage.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle})`);
        carriage.querySelector(".journey-map__wheel")?.setAttribute("transform", `translate(-10 11) rotate(${next * 1440})`);
        carriage.querySelector(".journey-map__wheel--rear")?.setAttribute("transform", `translate(12 11) rotate(${next * 1440})`);
        setProgress(Math.round(next * 100) / 100);
      },
    });
  }, []);

  const routeProgress = reducedMotion ? 1 : progress;
  return (
    <section ref={scope} className="journey-map" data-testid="singapore-journey-map" aria-labelledby="journey-map-title">
      <header className="journey-map__heading">
        <p className="atlas-kicker">{copy.eyebrow}</p>
        <h2 id="journey-map-title">{copy.title}</h2>
        <p>{copy.body}</p>
      </header>
      <div className="journey-map__canvas" role="img" aria-label="Singapore illustrated journey map">
        <div className="journey-map__legend"><Compass size={17} /> {copy.legend}</div>
        <svg viewBox="0 0 840 430" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
          <path className="journey-map__water" d="M0 305C125 256 191 340 310 309s187-76 294-22 167 8 236-35v178H0Z" />
          <path className="journey-map__island" d="M49 235C75 154 184 84 294 96c89-43 224-12 294 39 103-8 182 51 190 117-12 83-111 132-218 114-89 42-209 22-285-23C176 373 78 331 49 235Z" />
          <path className="journey-map__coast" d="M68 247c101-51 132-113 232-120 114-28 156 34 262 28 101-3 130-58 217 6" />
          <path className="journey-map__terrain" d="M112 232c30-68 67-85 104-63 33-50 73-59 119-38 52-43 91-29 130 8 61-8 117 12 158 66-156 17-330 42-511 27Z" />
          <path className="journey-map__landmark" d="M257 204v-48h15v48m7 0v-81h19v81m9 0v-57h15v57M519 232v-79h16v79m9 0v-47h14v47m10 0v-102h20v102" />
          <path className="journey-map__route-base" d={route} />
          <path ref={pathRef} className="journey-map__route-progress" pathLength="1" style={{ strokeDashoffset: 1 - routeProgress }} d={route} />
          {stops.map((stop) => <g className={routeProgress >= stop.at ? "journey-map__stop is-active" : "journey-map__stop"} key={stop.label} transform={`translate(${stop.x} ${stop.y})`}><circle r="10" /><circle r="3" /></g>)}
          <g ref={travellerRef} data-testid="journey-carriage" className="journey-map__carriage" transform="translate(145 294)">
            <path className="journey-map__carriage-body" d="M-21 8Q-18-8-5-8h20q12 0 15 16H-21Z" />
            <path className="journey-map__carriage-roof" d="M-13-8q13-17 27 0Z" />
            <circle className="journey-map__traveller-head" cx="0" cy="-17" r="5" />
            <path className="journey-map__traveller-seat" d="M-7-10h14v12H-7Z" />
            <g className="journey-map__wheel"><circle r="7" /><path d="M-5 0h10M0-5v10" /></g>
            <g className="journey-map__wheel journey-map__wheel--rear" transform="translate(12 11)"><circle r="7" /><path d="M-5 0h10M0-5v10" /></g>
          </g>
        </svg>
        {stops.map((stop) => routeProgress >= stop.at && <span className="journey-map__label" style={{ left: `${(stop.x / 840) * 100}%`, top: `${(stop.y / 430) * 100}%` }} key={stop.label}><MapPin size={13} /> {stop.label}</span>)}
      </div>
    </section>
  );
}
