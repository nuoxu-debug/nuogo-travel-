export function canUseWebGL(canvasFactory) {
  if (!canvasFactory && typeof navigator !== "undefined" && navigator.userAgent?.includes("jsdom")) {
    return false;
  }
  try {
    const canvas = (canvasFactory ?? (() => document.createElement("canvas")))();
    return Boolean(canvas?.getContext?.("webgl2") || canvas?.getContext?.("webgl"));
  } catch {
    return false;
  }
}

export function getRendererPixelRatio(devicePixelRatio = 1, compactViewport = false) {
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
    ? devicePixelRatio
    : 1;
  return Math.min(ratio, compactViewport ? 1 : 1.5);
}
