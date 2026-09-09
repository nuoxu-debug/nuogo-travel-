import { useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import { useGsapContext } from "../motion/useGsapContext.js";

export default function ScrollJourneyMap({ workflow, language, title, body, heading, headingTitle }) {
  const zh = language === "zh";
  const reducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(reducedMotion ? 1 : 0);
  const lastProgress = useRef(reducedMotion ? 1 : 0);
  const { scope } = useGsapContext(({ ScrollTrigger }) => {
    const section = scope.current;
    if (!ScrollTrigger || !section) return;
    ScrollTrigger.create({
      trigger: section,
      start: "top 72%",
      end: "bottom 45%",
      scrub: 0.4,
      onUpdate: ({ progress: next }) => {
        const rounded = Math.round(next * 100) / 100;
        if (rounded !== lastProgress.current) {
          lastProgress.current = rounded;
          setProgress(rounded);
        }
      }
    });
  }, []);
  const activeCount = Math.max(1, Math.ceil(progress * workflow.length));

  return <section ref={scope} className="nuogo-workflow" aria-labelledby="workflow-title">
    <div className="workflow-inner">
      <header>
        <p>{headingTitle}</p>
        <h2 id="workflow-title">{heading}</h2>
      </header>
      <div className="workflow-route-shell" data-testid="singapore-route-journey" data-layout="timeline" data-motion={reducedMotion ? "reduced" : "full"} role="img" aria-label={zh ? "\u4e92\u52a8\u5f0f\u65b0\u52a0\u5761\u65c5\u7a0b\u8def\u7ebf" : "Interactive Singapore journey route"} style={{ "--workflow-step-count": workflow.length }}>
        <div className="workflow-line" aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></div>
        <ol className="workflow-steps">
          {workflow.map((step, index) => {
            const Icon = step.icon;
            const active = index < activeCount;
            return <li className={active ? "is-active" : ""} key={step.en}>
              <span className="workflow-step-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="workflow-step-icon"><Icon /></span>
              <div><b>{zh ? step.zh : step.en}</b><small>{zh ? step.note.zh : step.note.en}</small></div>
            </li>;
          })}
        </ol>
        <footer className="workflow-route-copy"><span>{zh ? "\u4f60\u7684\u65b0\u52a0\u5761\u65c5\u7a0b" : "Your Singapore journey"}</span><h3>{title}</h3><p>{body}</p><progress aria-label="Journey progress" max="100" value={Math.round(progress * 100)} /></footer>
      </div>
    </div>
  </section>;
}
