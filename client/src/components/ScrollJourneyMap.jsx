import { Navigation } from "lucide-react";
import { useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useGsapContext } from "../motion/useGsapContext.js";
import LivingAtlasScene from "./LivingAtlasScene.jsx";

export default function ScrollJourneyMap() {
  const { language } = useLanguage();
  const zh = language === "zh";
  const stops = zh ? ["出发", "停留点 01", "停留点 02", "停留点 03"] : ["Departure", "Stop 01", "Stop 02", "Stop 03"];
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
            <p><Navigation aria-hidden="true" /> {zh ? "路线预览" : "Route preview"}</p>
            <h2>{zh ? "随着前行，" : "Your journey,"}<br />{zh ? "旅程逐步展开。" : "drawn as you move."}</h2>
            <span>{zh ? "日期、节奏或预算改变时，路线也会随之调整。" : "The route adapts when your dates, pace, or budget change."}</span>
          </div>

          <div
            className="journey-map-canvas"
            role="img"
            aria-label={zh ? "中国旅行路线动画" : "Animated journey across China"}
            data-motion={reducedMotion ? "reduced" : "full"}
          >
            <LivingAtlasScene progress={journeyProgress} stops={stops} />
          </div>
        </div>
      </section>
    </div>
  );
}
