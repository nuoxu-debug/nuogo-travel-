import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../src/App.jsx";

describe("Nuogo language and authentication UI", () => {
  it("uses the supplied Nuogo logo artwork in the header and landing hero", () => {
    render(<App initialPath="/" />);

    const logos = screen.getAllByRole("img", { name: "Nuogo logo" });
    expect(logos).toHaveLength(3);
    expect(logos.every((logo) => logo.getAttribute("src") === "/nuogo-logo.png")).toBe(true);
    expect(screen.getByTestId("scroll-progress")).toBeInTheDocument();
    expect(screen.getByLabelText("Sample Anhui itinerary route")).toBeInTheDocument();
  });

  it("defaults to Chinese and persists English when selected", async () => {
    localStorage.removeItem("nuogo-language");
    localStorage.removeItem("nuogo-language-default");
    render(<App initialPath="/" />);
    expect(screen.getByRole("button", { name: "中文" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(localStorage.getItem("nuogo-language")).toBe("en");
    expect(screen.getByText("Plan China, your way.")).toBeInTheDocument();
  });

  it("validates login before calling the API", async () => {
    render(<App initialPath="/login" />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("signs in as a guest without entering credentials", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: "guest-1", name: "Nuogo Guest", email: "guest@nuogo.local" },
        token: "guest-token"
      })
    });

    render(<App initialPath="/login" />);
    await userEvent.click(screen.getByRole("button", { name: "Continue as guest" }));

    expect(await screen.findByText("Travel brief")).toBeInTheDocument();
    expect(localStorage.getItem("nuogo-token")).toBe("guest-token");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/guest"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("uses readable language controls on light and dark headers", () => {
    localStorage.setItem("nuogo-language", "en");
    const light = render(<App initialPath="/login" />);
    const lightChinese = screen.getByRole("button", { name: "\u4e2d\u6587" });
    expect(lightChinese).toHaveClass("text-ink");
    expect(lightChinese).not.toHaveClass("text-white");
    light.unmount();

    render(<App initialPath="/" />);
    expect(screen.getByRole("button", { name: "\u4e2d\u6587" }))
      .toHaveClass("text-white");
  });
});
