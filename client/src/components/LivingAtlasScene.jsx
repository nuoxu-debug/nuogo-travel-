import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion.js";
import { useVisibility } from "../hooks/useVisibility.js";
import { canUseWebGL } from "../three/capabilities.js";
import JourneyProgressRail from "./JourneyProgressRail.jsx";
import JourneySceneFallback from "./JourneySceneFallback.jsx";

const DEFAULT_STOPS = ["Departure", "Stop 01", "Stop 02", "Stop 03"];
const loadLivingAtlas = () => import("../three/createLivingAtlas.js");

export default function LivingAtlasScene({
  progress = 0,
  points,
  stops = DEFAULT_STOPS,
  loadScene = loadLivingAtlas,
  canRender = canUseWebGL
}) {
  const rootRef = useRef(null);
  const canvasHostRef = useRef(null);
  const controllerRef = useRef(null);
  const loadSceneRef = useRef(loadScene);
  const canRenderRef = useRef(canRender);
  const [sceneState, setSceneState] = useState("fallback");
  const reducedMotion = useReducedMotion();
  const visible = useVisibility(rootRef);
  const effectiveProgress = reducedMotion ? 1 : progress;

  useEffect(() => {
    if (reducedMotion) {
      setSceneState("reduced");
      return undefined;
    }
    if (!visible || !canvasHostRef.current) return undefined;
    if (!canRenderRef.current()) {
      setSceneState("unsupported");
      return undefined;
    }

    let active = true;
    setSceneState("loading");
    loadSceneRef.current()
      .then(({ createLivingAtlas }) => {
        if (!active || !canvasHostRef.current) return;
        const controller = createLivingAtlas(canvasHostRef.current, {
          points,
          textureUrl: "/images/singapore-marina-bay-hero.png",
          onReady: () => active && setSceneState("ready"),
          onFailure: () => active && setSceneState("error")
        });
        controllerRef.current = controller;
        controller.setProgress(effectiveProgress);
      })
      .catch(() => {
        if (active) setSceneState("error");
      });

    return () => {
      active = false;
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, [visible, reducedMotion, points]);

  useEffect(() => {
    controllerRef.current?.setProgress(effectiveProgress);
  }, [effectiveProgress]);

  useEffect(() => {
    if (!controllerRef.current) return;
    if (visible) controllerRef.current.resume();
    else controllerRef.current.pause();
  }, [visible]);

  return (
    <div
      ref={rootRef}
      className={`living-atlas living-atlas-${sceneState}`}
      data-testid="living-atlas"
      data-scene-state={sceneState}
    >
      <JourneySceneFallback stops={stops} complete={reducedMotion} />
      <div ref={canvasHostRef} className="living-atlas-canvas-host" aria-hidden="true" />
      <JourneyProgressRail progress={effectiveProgress} />
    </div>
  );
}
