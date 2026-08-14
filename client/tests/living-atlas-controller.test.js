import { describe, expect, it, vi } from "vitest";
import { CatmullRomCurve3, Vector3 } from "three";
import {
  DEFAULT_JOURNEY_POINTS,
  normalizeJourneyPoints,
  sampleJourneyPath
} from "../src/three/journeyPath.js";
import { createLivingAtlas } from "../src/three/createLivingAtlas.js";

function createContainer(width = 900, height = 540) {
  const container = document.createElement("div");
  let dimensions = { width, height };
  Object.defineProperty(container, "clientWidth", { get: () => dimensions.width });
  Object.defineProperty(container, "clientHeight", { get: () => dimensions.height });
  container.setDimensions = (nextWidth, nextHeight) => {
    dimensions = { width: nextWidth, height: nextHeight };
  };
  document.body.append(container);
  return container;
}

function createRenderer() {
  return {
    domElement: document.createElement("canvas"),
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    setAnimationLoop: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn()
  };
}

describe("Living Atlas route math", () => {
  it("normalizes presentation-safe route points", () => {
    expect(normalizeJourneyPoints([[1, 2, 3], { x: 4, y: 5, z: 6 }])).toEqual([
      { x: 1, y: 2, z: 3 },
      { x: 4, y: 5, z: 6 }
    ]);
    expect(normalizeJourneyPoints([{ x: "bad" }])).toEqual(DEFAULT_JOURNEY_POINTS);
  });

  it("clamps progress while sampling a curve", () => {
    const curve = new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(10, 0, 5)
    ]);
    expect(sampleJourneyPath(curve, -1).point.toArray()).toEqual([0, 0, 0]);
    expect(sampleJourneyPath(curve, 2).point.toArray()).toEqual([10, 0, 5]);
  });
});

describe("Living Atlas controller", () => {
  it("updates route and aircraft state deterministically", () => {
    const container = createContainer();
    const renderer = createRenderer();
    const controller = createLivingAtlas(container, {
      rendererFactory: () => renderer,
      requestFrame: vi.fn(() => 1),
      cancelFrame: vi.fn()
    });

    controller.setProgress(0.25);
    const first = controller.getDebugState();
    controller.setProgress(0.75);
    const second = controller.getDebugState();

    expect(first.progress).toBe(0.25);
    expect(second.progress).toBe(0.75);
    expect(second.routeDrawCount).toBeGreaterThan(first.routeDrawCount);
    expect(second.aircraftPosition).not.toEqual(first.aircraftPosition);
    expect(renderer.render).toHaveBeenCalled();
  });

  it("resizes valid containers and ignores zero-sized states", () => {
    const container = createContainer();
    const renderer = createRenderer();
    const controller = createLivingAtlas(container, { rendererFactory: () => renderer });
    renderer.setSize.mockClear();

    container.setDimensions(720, 420);
    controller.resize();
    expect(renderer.setSize).toHaveBeenLastCalledWith(720, 420, false);

    container.setDimensions(0, 0);
    controller.resize();
    expect(renderer.setSize).toHaveBeenCalledOnce();
  });

  it("pauses, resumes, and disposes resources once", () => {
    const container = createContainer();
    const renderer = createRenderer();
    const cancelFrame = vi.fn();
    const controller = createLivingAtlas(container, {
      rendererFactory: () => renderer,
      requestFrame: vi.fn(() => 17),
      cancelFrame
    });

    controller.pause();
    expect(controller.getDebugState().running).toBe(false);
    controller.resume();
    expect(controller.getDebugState().running).toBe(true);

    controller.dispose();
    controller.dispose();
    expect(controller.getDebugState().disposed).toBe(true);
    expect(container.querySelector("canvas")).not.toBeInTheDocument();
    expect(cancelFrame).toHaveBeenCalled();
    expect(renderer.dispose).toHaveBeenCalledOnce();
  });
});
