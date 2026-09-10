import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../src/App.jsx";

const response = (body, { ok = true, status = 200 } = {}) => ({ ok, status, json: async () => body });

describe("Nuogo language and authentication UI", () => {
  it("uses the supplied logo and defaults to Chinese Singapore copy", () => {
    localStorage.clear();
    render(<App initialPath="/" />);
    expect(screen.getAllByRole("img", { name: "Nuogo logo" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "\u4e2d\u6587" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId("singapore-attraction-story")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "\u4ee5\u8bbf\u5ba2\u8eab\u4efd\u7ee7\u7eed - \u8fdb\u5165\u8bbf\u5ba2\u6a21\u5f0f" })).toHaveAttribute("href", "/login?returnTo=%2Fdiscover%2Fsingapore");
    screen.getAllByRole("link", { name: "\u767b\u5f55", exact: true }).forEach((link) => expect(link).toHaveAttribute("href", "/login"));
    screen.getAllByRole("link", { name: "\u521b\u5efa\u8d26\u6237", exact: true }).forEach((link) => expect(link).toHaveAttribute("href", "/register"));
    expect(document.documentElement.lang).toBe("zh-CN");
  });

  it("persists English when selected", async () => {
    localStorage.clear();
    render(<App initialPath="/" />);
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(localStorage.getItem("nuogo-language")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("explains Guest Mode and registered itinerary management in human terms", () => {
    localStorage.setItem("nuogo-language", "en");
    render(<App initialPath="/login" />);
    expect(screen.getByText("Plan a Singapore itinerary without creating an account. Your current planning session is available without long-term saved-trip management.")).toBeInTheDocument();
    expect(screen.getByText("Sign in to save and manage your itineraries across sessions.")).toBeInTheDocument();
    expect(screen.queryByText(/JWT|token|GUEST|REGISTERED/)).not.toBeInTheDocument();
  });

  it("validates login before calling the API", async () => {
    render(<App initialPath="/login" />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps guest credentials in session storage only", async () => {
    fetch.mockResolvedValueOnce(response({ user: { id: "guest-1", name: "Nuogo Guest", accountType: "GUEST" }, token: "guest-token" }));
    render(<App initialPath="/login" />);
    await userEvent.click(screen.getByRole("button", { name: "Continue as guest" }));
    expect(await screen.findByText("Travel brief")).toBeInTheDocument();
    expect(sessionStorage.getItem("nuogo-token")).toBe("guest-token");
    expect(localStorage.getItem("nuogo-token")).toBeNull();
    expect(screen.queryByRole("link", { name: "My trips" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
  });

  it("keeps registered credentials in local storage", async () => {
    fetch.mockResolvedValueOnce(response({ user: { id: "user-1", name: "Student", accountType: "REGISTERED" }, token: "registered-token" }));
    render(<App initialPath="/login" />);
    await userEvent.type(screen.getByLabelText("Email address"), "student@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(localStorage.getItem("nuogo-token")).toBe("registered-token");
    expect(sessionStorage.getItem("nuogo-token")).toBeNull();
  });

  it("localizes invalid credentials in Chinese", async () => {
    localStorage.setItem("nuogo-language", "zh");
    fetch.mockResolvedValueOnce(response({ error: { code: "INVALID_CREDENTIALS" } }, { ok: false, status: 401 }));
    render(<App initialPath="/login" />);
    await userEvent.type(screen.getByLabelText("\u7535\u5b50\u90ae\u7bb1"), "li@example.com");
    await userEvent.type(screen.getByLabelText("\u5bc6\u7801"), "incorrect1");
    await userEvent.click(screen.getByRole("button", { name: "\u767b\u5f55" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("\u90ae\u7bb1\u6216\u5bc6\u7801\u4e0d\u6b63\u786e\uff0c\u8bf7\u91cd\u8bd5\u3002");
  });
});
