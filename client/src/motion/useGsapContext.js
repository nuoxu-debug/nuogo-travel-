import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "../hooks/useAnime.js";

const canUseScrollTrigger = typeof window !== "undefined"
  && typeof window.matchMedia === "function"
  && !window.navigator?.userAgent?.includes("jsdom");

if (canUseScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

export function useGsapContext(setup, dependencies = []) {
  const scope = useRef(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (!scope.current || reducedMotion) return undefined;
    const context = gsap.context(
      () => setup({ gsap, ScrollTrigger: canUseScrollTrigger ? ScrollTrigger : null }),
      scope
    );
    return () => context.revert();
  }, [reducedMotion, ...dependencies]);

  return { scope, reducedMotion };
}
