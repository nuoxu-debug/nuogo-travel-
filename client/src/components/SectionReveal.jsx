import { useEffect, useRef } from "react";
import { useAnime } from "../hooks/useAnime.js";

export default function SectionReveal({ children, className = "", delay = 0, as: Tag = "div" }) {
  const root = useRef(null);
  const animate = useAnime();

  useEffect(() => {
    const element = root.current;
    if (!element) return undefined;

    const reveal = () => {
      element.classList.add("is-visible");
      animate({
        targets: element,
        opacity: [0, 1],
        translateY: [24, 0],
        delay,
        duration: 720,
        easing: "easeOutExpo"
      });
    };

    if (!("IntersectionObserver" in window)) {
      reveal();
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      reveal();
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [animate, delay]);

  return <Tag ref={root} className={`section-reveal ${className}`}>{children}</Tag>;
}
