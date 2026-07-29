import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../src/App.jsx";
import { safeReturnTo } from "../src/context/AuthContext.jsx";
import { demoTrip } from "./fixtures.js";

const invitation = {
  id: "invitation-1",
  tripId: "trip-1",
  status: "pending",
  role: "editor",
  expiresAt: "2026-08-03T10:00:00.000Z",
  trip: {
    id: "trip-1",
    title: { en: "Huangshan Together", zh: "黄山同行" },
    destination: "huangshan",
    startDate: "2026-08-10",
    endDate: "2026-08-13"
  },
  owner: { name: "Chen" }
};

function response(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body
  };
}

function signedInFetch({ accept, decline } = {}) {
  return async (url, options = {}) => {
    if (url.endsWith("/auth/me")) {
      return response({
        user: { id: "user-2", name: "Li", email: "li@example.com" }
      });
    }
    if (url.endsWith("/invitations/invite-token") && !options.method) {
      return response({ invitation });
    }
    if (url.endsWith("/invitations/invite-token/accept")) {
      return accept ?? response({
        membership: { role: "editor" },
        tripId: "trip-1"
      });
    }
    if (url.endsWith("/invitations/invite-token/decline")) {
      return decline ?? response({
        invitation: { ...invitation, status: "declined" }
      });
    }
    if (url.endsWith("/trips/trip-1")) {
      return response({
        trip: demoTrip(),
        access: { role: "editor", canEdit: true, isOwner: false }
      });
    }
    if (url.endsWith("/trips/trip-1/members")) {
      return response({ members: [] });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
}

describe("trip invitation acceptance", () => {
  it("accepts only local authentication return paths", () => {
    expect(safeReturnTo("/invite/invite-token?source=email")).toBe(
      "/invite/invite-token?source=email"
    );
    expect(safeReturnTo("https://evil.example/invite")).toBe("/planner");
    expect(safeReturnTo("//evil.example/invite")).toBe("/planner");
    expect(safeReturnTo("/\\evil.example/invite")).toBe("/planner");
    expect(safeReturnTo("/%5c%5cevil.example/invite")).toBe("/planner");
  });

  it("preserves the invitation route through sign in and registration", async () => {
    fetch.mockResolvedValueOnce(response({ invitation }));

    render(<App initialPath="/invite/invite-token" />);

    expect(await screen.findByRole("link", { name: "Sign in to join" }))
      .toHaveAttribute("href", "/login?returnTo=%2Finvite%2Finvite-token");
    expect(screen.getAllByRole("link", { name: "Create account" }).some((link) =>
      link.getAttribute("href") === "/register?returnTo=%2Finvite%2Finvite-token"
    )).toBe(true);
    expect(screen.getByRole("heading", { name: "Join Huangshan Together" }))
      .toBeInTheDocument();
    const storedValues = Array.from(
      { length: localStorage.length },
      (_, index) => localStorage.getItem(localStorage.key(index))
    );
    expect(storedValues).not.toContain("invite-token");
  });

  it("returns to the invitation after guest sign in", async () => {
    fetch.mockImplementation(async (url, options = {}) => {
      if (url.endsWith("/auth/guest")) {
        return response({
          user: { id: "guest-1", name: "Nuogo Guest", email: "guest@nuogo.local" },
          token: "guest-token"
        });
      }
      if (url.endsWith("/invitations/invite-token") && !options.method) {
        return response({ invitation });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App initialPath="/login?returnTo=%2Finvite%2Finvite-token" />);
    await userEvent.click(screen.getByRole("button", { name: "Continue as guest" }));

    expect(await screen.findByRole("button", { name: "Accept invitation" }))
      .toBeInTheDocument();
    expect(localStorage.getItem("nuogo-token")).toBe("guest-token");
  });

  it("rejects unsafe authentication return paths", async () => {
    fetch.mockResolvedValueOnce(response({
      user: { id: "guest-1", name: "Nuogo Guest", email: "guest@nuogo.local" },
      token: "guest-token"
    }));

    render(<App initialPath="/login?returnTo=%2F%2Fevil.example" />);
    await userEvent.click(screen.getByRole("button", { name: "Continue as guest" }));

    expect(await screen.findByText("Travel brief")).toBeInTheDocument();
  });

  it("accepts an invitation and opens the trip workspace", async () => {
    localStorage.setItem("nuogo-token", "member-token");
    fetch.mockImplementation(signedInFetch());

    render(<App initialPath="/invite/invite-token" />);
    await userEvent.click(await screen.findByRole("button", { name: "Accept invitation" }));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/invitations/invite-token/accept"),
      expect.objectContaining({ method: "POST" })
    );
    expect(await screen.findByText("Trip workspace")).toBeInTheDocument();
  });

  it("declines an invitation without joining the trip", async () => {
    localStorage.setItem("nuogo-token", "member-token");
    fetch.mockImplementation(signedInFetch());

    render(<App initialPath="/invite/invite-token" />);
    await userEvent.click(await screen.findByRole("button", { name: "Decline invitation" }));

    expect(await screen.findByRole("heading", { name: "Invitation declined" }))
      .toHaveFocus();
    expect(screen.queryByRole("button", { name: "Accept invitation" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plan another trip" }))
      .toHaveAttribute("href", "/planner");
  });

  it.each([
    ["INVITATION_EXPIRED", 410, "Invitation expired"],
    ["INVITATION_REVOKED", 410, "Invitation revoked"],
    ["INVITATION_CONSUMED", 409, "Invitation already used"],
    ["NOT_FOUND", 404, "Invitation not found"]
  ])("shows a focused terminal state for %s", async (code, status, heading) => {
    fetch.mockResolvedValueOnce(response({
      error: { code, message: "Invitation is unavailable." }
    }, { ok: false, status }));

    render(<App initialPath="/invite/invite-token" />);

    expect(await screen.findByRole("heading", { name: heading })).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(heading);
    expect(screen.queryByRole("button", { name: "Accept invitation" }))
      .not.toBeInTheDocument();
  });

  it("keeps invitation decisions completely Chinese in Chinese mode", async () => {
    localStorage.removeItem("nuogo-language");
    localStorage.removeItem("nuogo-language-default");
    localStorage.setItem("nuogo-token", "member-token");
    fetch.mockImplementation(signedInFetch());

    render(<App initialPath="/invite/invite-token" />);

    expect(await screen.findByRole("heading", { name: "一起规划黄山同行" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "接受邀请" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "婉拒邀请" })).toBeInTheDocument();
    expect(screen.queryByText("Editor")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开菜单" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nuogo首页" })).toBeInTheDocument();
    expect(screen.getByText("中国")).toBeInTheDocument();
    expect(screen.getByText("旅行工作室")).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.lang).toBe("zh-CN"));
  });
});
