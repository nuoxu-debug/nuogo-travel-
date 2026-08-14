import { Navigation, Plane } from "lucide-react";
import { useRef } from "react";
import { useGsapContext } from "../motion/useGsapContext.js";

const stops = [
  { label: "Departure", x: 480, y: 430 },
  { label: "Stop 01", x: 650, y: 330 },
  { label: "Stop 02", x: 730, y: 230 },
  { label: "Stop 03", x: 850, y: 150 }
];

export default function ScrollJourneyMap() {
  const routeRef = useRef(null);
  const markerRef = useRef(null);
  const progressRef = useRef(null);
  const progressBarRef = useRef(null);
  const { scope, reducedMotion } = useGsapContext(({ gsap, ScrollTrigger }) => {
    const route = routeRef.current;
    const marker = markerRef.current;
    if (!route || !marker || typeof route.getTotalLength !== "function") return;

    const length = route.getTotalLength();
    const placeMarker = (progress) => {
      const point = route.getPointAtLength(length * progress);
      const next = route.getPointAtLength(Math.min(length, length * progress + 2));
      const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI;
      marker.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle})`);
      route.style.strokeDashoffset = String(length * (1 - progress));
      if (progressRef.current) progressRef.current.textContent = `${Math.round(progress * 100)}%`;
      if (progressBarRef.current) progressBarRef.current.style.transform = `scaleX(${progress})`;

      const section = route.closest(".journey-map-sticky");
      const mapArt = section?.querySelector(".journey-map-art");
      if (mapArt) {
        mapArt.style.transform = `scale(${1.035 + progress * 0.045}) translate3d(${-progress * 1.5}%, ${progress * 0.7}%, 0)`;
      }
      section?.querySelectorAll(".journey-map-stop").forEach((stop, index) => {
        stop.classList.toggle("is-active", progress >= index / (stops.length - 1) - 0.04);
      });
    };

    route.style.strokeDasharray = String(length);
    placeMarker(ScrollTrigger ? 0 : 1);

    if (!ScrollTrigger) return;
    const journeySection = route.closest(".journey-map-section");
    ScrollTrigger.create({
      trigger: journeySection,
      start: "top top",
      end: "+=1900",
      pin: journeySection,
      scrub: true,
      onUpdate: ({ progress }) => placeMarker(progress)
    });

    gsap.fromTo(".journey-map-heading", { y: 22, opacity: 0 }, {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: "power3.out"
    });
  }, []);

  return (
    <section ref={scope} id="journey-map" className="journey-map-section">
      <div className="journey-map-sticky">
        <img
          className="journey-map-art"
          src="/images/china-journey-map-daylight.png"
          alt=""
          aria-hidden="true"
        />
        <div className="journey-map-shade" aria-hidden="true" />

        <div className="journey-map-heading">
          <p><Navigation aria-hidden="true" /> Route preview</p>
          <h2>Your journey,<br />drawn as you move.</h2>
          <span>The route adapts when your dates, pace, or budget change.</span>
        </div>

        <div
          className="journey-map-canvas"
          role="img"
          aria-label="Animated journey across China"
          data-motion={reducedMotion ? "reduced" : "full"}
        >
          <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path
              className="journey-map-route-shadow"
              d="M 480 430 C 555 405 590 355 650 330 S 765 295 730 230 S 805 175 850 150"
            />
            <path
              ref={routeRef}
              className="journey-map-route"
              d="M 480 430 C 555 405 590 355 650 330 S 765 295 730 230 S 805 175 850 150"
            />
            {stops.map((stop, index) => (
              <g key={stop.label} className="journey-map-stop" transform={`translate(${stop.x} ${stop.y})`}>
                <circle r="10" />
                <circle r="4" />
                <text x={index % 2 === 0 ? -18 : 18} y={index % 2 === 0 ? -20 : 30}>
                  {stop.label}
                </text>
              </g>
            ))}
            <g ref={markerRef} className="journey-map-marker" transform="translate(850 150)">
              <circle className="journey-map-marker-pulse" r="31" />
              <circle className="journey-map-marker-core" r="24" />
              <foreignObject x="-12" y="-12" width="24" height="24">
                <Plane aria-hidden="true" />
              </foreignObject>
            </g>
          </svg>
        </div>

        <div className="journey-map-progress" aria-label="Route drawing progress">
          <span>Departure</span>
          <i><b ref={progressBarRef} /></i>
          <strong ref={progressRef}>{reducedMotion ? "100%" : "0%"}</strong>
        </div>
      </div>
    </section>
  );
}
