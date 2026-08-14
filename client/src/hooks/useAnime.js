import { useCallback, useEffect, useRef } from "react";
import anime from "animejs/lib/anime.es.js";
import { useReducedMotion } from "./useReducedMotion.js";

export { useReducedMotion } from "./useReducedMotion.js";

function normalizeTargets(targets) {
  if (!targets) return [];
  if (typeof targets === "string") return [...document.querySelectorAll(targets)];
  if (Array.isArray(targets)) return targets;
  if (typeof targets.length === "number" && !targets.nodeType) return [...targets];
  return [targets];
}

function finalValue(value) {
  return Array.isArray(value) ? value[value.length - 1] : value;
}

function applyReducedMotionState(targets, properties) {
  const transformKeys = new Set([
    "translateX", "translateY", "translateZ",
    "scale", "scaleX", "scaleY", "rotate", "rotateX", "rotateY"
  ]);
  for (const target of normalizeTargets(targets)) {
    let resetsTransform = false;
    for (const [property, value] of Object.entries(properties)) {
      const final = finalValue(value);
      if (transformKeys.has(property)) {
        resetsTransform = true;
      } else if (target?.style && property in target.style) {
        target.style[property] = String(final);
      } else if (target) {
        target[property] = final;
      }
    }
    if (resetsTransform && target?.style) target.style.transform = "none";
  }
}

export function useAnime() {
  const animations = useRef([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => () => {
    animations.current.forEach((animation) => animation.pause());
    animations.current = [];
  }, []);

  return useCallback((options) => {
    if (reducedMotion) {
      const {
        targets,
        duration: _duration,
        delay: _delay,
        easing: _easing,
        complete,
        begin,
        update,
        direction: _direction,
        loop: _loop,
        autoplay: _autoplay,
        round: _round,
        ...properties
      } = options;
      begin?.();
      applyReducedMotionState(targets, properties);
      update?.();
      complete?.();
      return null;
    }
    const animation = anime(options);
    animations.current.push(animation);
    return animation;
  }, [reducedMotion]);
}
