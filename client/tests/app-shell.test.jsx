import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../src/App.jsx";

const response = (body) => ({ ok: true, status: 200, json: async () => body });

describe("Nuogo application shell", () => {
  it("shows a friendly guest-mode label without exposing an internal account value", async () => {
    sessionStorage.setItem("nuogo-token", "guest-token");
    fetch.mockResolvedValueOnce(response({
      user: { id: "guest-1", name: "Nuogo Guest", accountType: "GUEST" }
    }));

    render(<App initialPath="/" />);

    expect(await screen.findByTestId("user-mode-badge")).toHaveTextContent("Guest Mode");
    expect(screen.queryByText("GUEST", { exact: true })).not.toBeInTheDocument();
  });

  it("sends Guest Mode users to sign in when they choose Plan a trip", async () => {
    sessionStorage.setItem("nuogo-token", "guest-token");
    fetch.mockResolvedValueOnce(response({
      user: { id: "guest-1", name: "Nuogo Guest", accountType: "GUEST" }
    }));

    render(<App initialPath="/" />);

    expect(await screen.findByTestId("user-mode-badge")).toHaveTextContent("Guest Mode");
    fireEvent.click(screen.getAllByRole("link", { name: /Plan a trip/i })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Please sign in or create an account to plan your trip.");
    expect(fetch.mock.calls.find(([url]) => String(url).endsWith("/auth/guest"))).toBeUndefined();
  });

  it("uses the System Administrator label for an administrator", async () => {
    localStorage.setItem("nuogo-token", "admin-token");
    fetch.mockResolvedValueOnce(response({
      user: { id: "admin-1", name: "Ada", role: "admin", accountType: "REGISTERED" }
    }));

    render(<App initialPath="/planner" />);

    expect(await screen.findByTestId("user-mode-badge")).toHaveTextContent("System Administrator");
    expect(screen.getByRole("link", { name: "Admin Dashboard" })).toBeInTheDocument();
    expect(screen.queryByText("admin", { exact: true })).not.toBeInTheDocument();
  });

  it("keeps Admin Dashboard navigation hidden from registered travellers", async () => {
    localStorage.setItem("nuogo-token", "traveller-token");
    fetch.mockResolvedValueOnce(response({
      user: { id: "user-1", name: "Tara", role: "user", accountType: "REGISTERED" }
    }));

    render(<App initialPath="/planner" />);

    expect(await screen.findByTestId("user-mode-badge")).toHaveTextContent("Registered Traveller");
    expect(screen.queryByRole("link", { name: "Admin Dashboard" })).not.toBeInTheDocument();
  });

  it("renders pill navigation links and triggers About and Help modals", async () => {
    sessionStorage.clear();
    localStorage.clear();
    render(<App initialPath="/" />);

    const homeLink = screen.getAllByRole("link", { name: /首页|Home/i })[0];
    const discoverLink = screen.getAllByRole("link", { name: /景点探索|Discover/i })[0];
    const planLink = screen.getAllByRole("link", { name: /定制行程|Plan a trip/i })[0];
    const aboutBtn = screen.getAllByRole("button", { name: /关于|About/i })[0];
    const helpBtn = screen.getAllByRole("button", { name: /帮助|Help/i })[0];

    expect(homeLink).toBeInTheDocument();
    expect(discoverLink).toBeInTheDocument();
    expect(planLink).toBeInTheDocument();
    expect(aboutBtn).toBeInTheDocument();
    expect(helpBtn).toBeInTheDocument();

    fireEvent.click(aboutBtn);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/关于 Nuogo|About Nuogo/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /了解了|Got it/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
