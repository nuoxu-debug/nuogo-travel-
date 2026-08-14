import { Navigation } from "lucide-react";
import { useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import { useGsapContext } from "../motion/useGsapContext.js";
import LivingAtlasScene from "./LivingAtlasScene.jsx";

const stops = ["Departure", "Stop 01", "Stop 02", "Stop 03"];

export default function ScrollJourneyMap() {
  const reducedMotion = useReducedMotion();
  const [journeyProgress, setJourneyProgress] = useState(reducedMotion ? 1 : 0);
  const lastPercentageRef = useRef(reducedMotion ? 100 : 0);
  const { scope } = useGsapContext(({ gsap, ScrollTrigger }) => {
    const section = scope.current?.querySelector(".journey-map-section");
    const updateProgress = (progress) => {
      const percentage = Math.round(progress * 100);
      if (percentage !== lastPercentageRef.current) {
        lastPercentageRef.current = percentage;
        setJourneyProgress(percentage / 100);
      }
    };

    updateProgress(ScrollTrigger ? 0 : 1);
    if (ScrollTrigger && section) {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=1900",
        pin: section,
        scrub: true,
        onUpdate: ({ progress }) => updateProgress(progress)
      });
    }

    gsap.fromTo(".journey-map-heading", { y: 22, opacity: 0 }, {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: "power3.out"
    });
  }, []);

  return (
    <div ref={scope}>
      <section id="journey-map" className="journey-map-section">
        <div className="journey-map-sticky">
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
            <LivingAtlasScene progress={journeyProgress} stops={stops} />
          </div>
        </div>
      </section>
    </div>
  );
}
