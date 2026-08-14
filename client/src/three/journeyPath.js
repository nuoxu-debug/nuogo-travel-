import { Vector3 } from "three";

export const DEFAULT_JOURNEY_POINTS = Object.freeze([
  Object.freeze({ x: -4.8, y: -2.4, z: 0.52 }),
  Object.freeze({ x: -1.7, y: -0.8, z: 0.66 }),
  Object.freeze({ x: 1.3, y: 0.7, z: 0.62 }),
  Object.freeze({ x: 4.5, y: 2.2, z: 0.72 })
]);

function asPoint(value) {
  const source = Array.isArray(value)
    ? { x: value[0], y: value[1], z: value[2] }
    : value;
  if (!source || ![source.x, source.y, source.z].every(Number.isFinite)) return null;
  return { x: source.x, y: source.y, z: source.z };
}

export function normalizeJourneyPoints(points) {
  if (!Array.isArray(points) || points.length < 2) return [...DEFAULT_JOURNEY_POINTS];
  const normalized = points.map(asPoint);
  return normalized.every(Boolean) ? normalized : [...DEFAULT_JOURNEY_POINTS];
}

export function toJourneyVectors(points) {
  return normalizeJourneyPoints(points).map(({ x, y, z }) => new Vector3(x, y, z));
}

export function sampleJourneyPath(curve, progress) {
  const normalizedProgress = Math.min(1, Math.max(0, Number(progress) || 0));
  return {
    progress: normalizedProgress,
    point: curve.getPointAt(normalizedProgress),
    tangent: curve.getTangentAt(normalizedProgress).normalize()
  };
}
