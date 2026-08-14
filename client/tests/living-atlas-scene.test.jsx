import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LivingAtlasScene from "../src/components/LivingAtlasScene.jsx";

const stops = ["Departure", "Stop 01", "Stop 02", "Stop 03"];

function createSceneModule(dispose = vi.fn()) {
  return {
    createLivingAtlas(container, { onReady }) {
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      canvas.tabIndex = -1;
      container.append(canvas);
      onReady?.();
      return {
        canvas,
        setProgress: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        resize: vi.fn(),
        dispose
      };
    }
  };
}

describe("LivingAtlasScene", () => {
  it("renders semantic generic stops and the static map immediately", () => {
    render(<LivingAtlasScene progress={0.4} stops={stops} canRender={() => false} />);

    stops.forEach((stop) => expect(screen.getByText(stop)).toBeInTheDocument());
    expect(screen.getByTestId("journey-scene-fallback")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Journey progress" })).toHaveAttribute("value", "40");
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("does not initialize WebGL when reduced motion is requested", async () => {
    window.matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));
    const loadScene = vi.fn(async () => createSceneModule());

    render(<LivingAtlasScene progress={0.2} stops={stops} loadScene={loadScene} />);

    await waitFor(() => expect(screen.getByTestId("living-atlas")).toHaveAttribute("data-scene-state", "reduced"));
    expect(loadScene).not.toHaveBeenCalled();
    expect(screen.getByRole("progressbar", { name: "Journey progress" })).toHaveAttribute("value", "100");
  });

  it("keeps the fallback when scene loading fails", async () => {
    const loadScene = vi.fn(async () => { throw new Error("renderer failed"); });
    render(
      <LivingAtlasScene
        progress={0.5}
        stops={stops}
        loadScene={loadScene}
        canRender={() => true}
      />
    );

    await waitFor(() => expect(screen.getByTestId("living-atlas")).toHaveAttribute("data-scene-state", "error"));
    expect(screen.getByTestId("journey-scene-fallback")).toBeVisible();
  });

  it("adds one decorative canvas and disposes it on unmount", async () => {
    const dispose = vi.fn();
    const loadScene = vi.fn(async () => createSceneModule(dispose));
    const { rerender, unmount } = render(
      <LivingAtlasScene
        progress={0.25}
        stops={stops}
        loadScene={loadScene}
        canRender={() => true}
      />
    );

    await waitFor(() => expect(screen.getByTestId("living-atlas")).toHaveAttribute("data-scene-state", "ready"));
    const canvas = screen.getByTestId("living-atlas").querySelector("canvas");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveAttribute("tabindex", "-1");

    await act(async () => rerender(
      <LivingAtlasScene
        progress={0.8}
        stops={stops}
        loadScene={loadScene}
        canRender={() => true}
      />
    ));
    expect(screen.getByRole("progressbar", { name: "Journey progress" })).toHaveAttribute("value", "80");

    unmount();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
