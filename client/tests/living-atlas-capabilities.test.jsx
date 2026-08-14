import { act, render, renderHook, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { canUseWebGL, getRendererPixelRatio } from "../src/three/capabilities.js";
import { useReducedMotion } from "../src/hooks/useReducedMotion.js";
import { useVisibility } from "../src/hooks/useVisibility.js";

function createMediaQuery(initialMatches = false) {
  const listeners = new Set();
  return {
    matches: initialMatches,
    addEventListener: vi.fn((_event, listener) => listeners.add(listener)),
    removeEventListener: vi.fn((_event, listener) => listeners.delete(listener)),
    setMatches(matches) {
      this.matches = matches;
      listeners.forEach((listener) => listener({ matches }));
    }
  };
}

function VisibilityProbe() {
  const targetRef = useRef(null);
  const visible = useVisibility(targetRef);
  return <div ref={targetRef} data-testid="visibility-probe" data-visible={visible} />;
}

describe("Living Atlas capability boundaries", () => {
  it("reports WebGL support without leaking context errors", () => {
    expect(canUseWebGL(() => ({ getContext: () => ({}) }))).toBe(true);
    expect(canUseWebGL(() => ({ getContext: () => null }))).toBe(false);
    expect(canUseWebGL(() => { throw new Error("context denied"); })).toBe(false);
  });

  it("does not probe the default canvas context under jsdom", () => {
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
    expect(canUseWebGL()).toBe(false);
    expect(contextSpy).not.toHaveBeenCalled();
  });

  it("caps pixel density for desktop and compact viewports", () => {
    expect(getRendererPixelRatio(3, false)).toBe(1.5);
    expect(getRendererPixelRatio(2, true)).toBe(1);
    expect(getRendererPixelRatio(0, false)).toBe(1);
  });

  it("reacts to reduced-motion changes and removes its listener", () => {
    const mediaQuery = createMediaQuery(false);
    window.matchMedia = vi.fn(() => mediaQuery);

    const { result, unmount } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => mediaQuery.setMatches(true));
    expect(result.current).toBe(true);

    unmount();
    expect(mediaQuery.removeEventListener).toHaveBeenCalledOnce();
  });

  it("tracks intersection state and disconnects the observer", () => {
    let observerCallback;
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal("IntersectionObserver", vi.fn((callback) => {
      observerCallback = callback;
      return { observe, disconnect };
    }));

    const { unmount } = render(<VisibilityProbe />);
    expect(observe).toHaveBeenCalledWith(screen.getByTestId("visibility-probe"));
    expect(screen.getByTestId("visibility-probe")).toHaveAttribute("data-visible", "false");

    act(() => observerCallback([{ isIntersecting: true }]));
    expect(screen.getByTestId("visibility-probe")).toHaveAttribute("data-visible", "true");

    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
