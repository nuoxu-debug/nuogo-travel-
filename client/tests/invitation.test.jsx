import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import App from "../src/App.jsx";
import { AuthProvider, safeReturnTo } from "../src/context/AuthContext.jsx";
import { LanguageProvider } from "../src/context/LanguageContext.jsx";
import InvitationPage from "../src/pages/InvitationPage.jsx";
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

function deferred() {
  let resolve;
  const promise = new Promise((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function InvitationNavigationHarness() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/invite/token-b")}>
        Switch invitation
      </button>
      <Routes>
        <Route path="/invite/:token" element={<InvitationPage />} />
      </Routes>
    </>
  );
}

function renderInvitationNavigation() {
  return render(
    <LanguageProvider>
      <AuthProvider>
        <MemoryRouter
          initialEntries={["/invite/token-a"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <InvitationNavigationHarness />
        </MemoryRouter>
      </AuthProvider>
    </LanguageProvider>
  );
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

    const continuation = "?returnTo=%2Finvite%2Finvite-token";
    expect(await screen.findByRole("link", { name: "Sign in to join" }))
      .toHaveAttribute("href", `/login${continuation}`);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    for (const link of screen.getAllByRole("link", { name: "Sign in" })) {
      expect(link).toHaveAttribute("href", `/login${continuation}`);
    }
    for (const link of screen.getAllByRole("link", { name: "Create account" })) {
      expect(link).toHaveAttribute("href", `/register${continuation}`);
    }
    expect(screen.getByRole("heading", { name: "Join Huangshan Together" }))
      .toBeInTheDocument();
    const storedValues = Array.from(
      { length: localStorage.length },
      (_, index) => localStorage.getItem(localStorage.key(index))
    );
    expect(storedValues).not.toContain("invite-token");
  });

  it("preserves invitation continuation across every login and registration auth link", async () => {
    const continuation = "?returnTo=%2Finvite%2Finvite-token";
    const login = render(<App initialPath={`/login${continuation}`} />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

    for (const link of screen.getAllByRole("link", { name: "Sign in" })) {
      expect(link).toHaveAttribute("href", `/login${continuation}`);
    }
    for (const link of screen.getAllByRole("link", { name: "Create account" })) {
      expect(link).toHaveAttribute("href", `/register${continuation}`);
    }
    login.unmount();

    render(<App initialPath={`/register${continuation}`} />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

    for (const link of screen.getAllByRole("link", { name: "Sign in" })) {
      expect(link).toHaveAttribute("href", `/login${continuation}`);
    }
    for (const link of screen.getAllByRole("link", { name: "Create account" })) {
      expect(link).toHaveAttribute("href", `/register${continuation}`);
    }
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

  it("removes token A data and actions while token B is loading", async () => {
    localStorage.setItem("nuogo-token", "member-token");
    const tokenB = deferred();
    fetch.mockImplementation(async (url) => {
      if (url.endsWith("/auth/me")) {
        return response({
          user: { id: "user-2", name: "Li", email: "li@example.com" }
        });
      }
      if (url.endsWith("/invitations/token-a")) {
        return response({
          invitation: {
            ...invitation,
            trip: {
              ...invitation.trip,
              title: { en: "Token A trip", zh: "行程A" }
            }
          }
        });
      }
      if (url.endsWith("/invitations/token-b")) return tokenB.promise;
      throw new Error(`Unexpected request: ${url}`);
    });

    renderInvitationNavigation();
    expect(await screen.findByRole("heading", { name: "Join Token A trip" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept invitation" }))
      .toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Switch invitation" }));

    expect(screen.getByRole("heading", { name: "Opening your invitation" }))
      .toBeInTheDocument();
    expect(screen.queryByText("Token A trip")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept invitation" }))
      .not.toBeInTheDocument();

    tokenB.resolve(response({
      invitation: {
        ...invitation,
        id: "invitation-2",
        tripId: "trip-2",
        trip: {
          ...invitation.trip,
          id: "trip-2",
          title: { en: "Token B trip", zh: "行程B" }
        }
      }
    }));
    expect(await screen.findByRole("heading", { name: "Join Token B trip" }))
      .toBeInTheDocument();
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

  it.each([
    ["INVITATION_EXPIRED", 410, "Invitation expired"],
    ["INVITATION_REVOKED", 410, "Invitation revoked"],
    ["INVITATION_CONSUMED", 409, "Invitation already used"],
    ["NOT_FOUND", 404, "Invitation not found"]
  ])("maps decision-time %s into a terminal state", async (code, status, heading) => {
    localStorage.setItem("nuogo-token", "member-token");
    fetch.mockImplementation(signedInFetch({
      accept: response({
        error: { code, message: "Invitation is unavailable." }
      }, { ok: false, status })
    }));

    render(<App initialPath="/invite/invite-token" />);
    await userEvent.click(await screen.findByRole("button", { name: "Accept invitation" }));

    expect(await screen.findByRole("heading", { name: heading })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Accept invitation" }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Decline invitation" }))
      .not.toBeInTheDocument();
  });

  it("returns a decision-time 401 to signed-out invitation actions", async () => {
    localStorage.setItem("nuogo-token", "member-token");
    fetch.mockImplementation(signedInFetch({
      accept: response({
        error: { code: "UNAUTHORIZED", message: "The session token is invalid or expired." }
      }, { ok: false, status: 401 })
    }));

    render(<App initialPath="/invite/invite-token" />);
    await userEvent.click(await screen.findByRole("button", { name: "Accept invitation" }));

    expect(
      await screen.findByText(
        "Your session ended while responding. Sign in again to continue with this invitation.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in to join" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept invitation" }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Decline invitation" }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
    expect(localStorage.getItem("nuogo-token")).toBeNull();
  });

  it("lets the original member continue through a consumed invitation", async () => {
    localStorage.setItem("nuogo-token", "member-token");
    fetch.mockImplementation(async (url, options = {}) => {
      if (url.endsWith("/auth/me")) {
        return response({
          user: { id: "user-2", name: "Li", email: "li@example.com" }
        });
      }
      if (url.endsWith("/invitations/invite-token") && !options.method) {
        return response({
          error: { code: "INVITATION_CONSUMED", message: "Invitation was consumed." }
        }, { ok: false, status: 409 });
      }
      if (url.endsWith("/invitations/invite-token/accept")) {
        return response({ membership: { role: "editor" }, tripId: "trip-1" });
      }
      if (url.endsWith("/trips/trip-1")) {
        return response({
          trip: demoTrip(),
          access: { role: "editor", canEdit: true, isOwner: false }
        });
      }
      if (url.endsWith("/trips/trip-1/members")) return response({ members: [] });
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App initialPath="/invite/invite-token" />);
    await userEvent.click(await screen.findByRole("button", { name: "Check membership" }));

    expect(await screen.findByText("Trip workspace")).toBeInTheDocument();
  });

  it("keeps another user on the consumed state after checking membership", async () => {
    localStorage.setItem("nuogo-token", "member-token");
    fetch.mockImplementation(async (url, options = {}) => {
      if (url.endsWith("/auth/me")) {
        return response({
          user: { id: "user-3", name: "Wang", email: "wang@example.com" }
        });
      }
      if (url.endsWith("/invitations/invite-token") && !options.method) {
        return response({
          error: { code: "INVITATION_CONSUMED", message: "Invitation was consumed." }
        }, { ok: false, status: 409 });
      }
      if (url.endsWith("/invitations/invite-token/accept")) {
        return response({
          error: { code: "INVITATION_CONSUMED", message: "Invitation was consumed." }
        }, { ok: false, status: 409 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App initialPath="/invite/invite-token" />);
    await userEvent.click(await screen.findByRole("button", { name: "Check membership" }));

    expect(screen.getByRole("heading", { name: "Invitation already used" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check membership" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Accept invitation" }))
      .not.toBeInTheDocument();
  });

  it("uses the shared destination labels without raw identifiers in Chinese", async () => {
    localStorage.setItem("nuogo-language", "zh");
    localStorage.setItem("nuogo-language-default", "zh-v4");
    fetch.mockResolvedValueOnce(response({
      invitation: {
        ...invitation,
        trip: {
          ...invitation.trip,
          destination: "zhangjiajie",
          title: { en: "Zhangjiajie Together", zh: "张家界同行" }
        }
      }
    }));

    render(<App initialPath="/invite/invite-token" />);

    expect(await screen.findByText("张家界")).toBeInTheDocument();
    expect(screen.queryByText("zhangjiajie")).not.toBeInTheDocument();
  });

  it("keeps invitation decisions completely Chinese in Chinese mode", async () => {
    localStorage.setItem("nuogo-language", "zh");
    localStorage.setItem("nuogo-language-default", "zh-v4");
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
