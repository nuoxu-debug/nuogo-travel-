import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";
import CollaborationDrawer from "../src/components/CollaborationDrawer.jsx";
import { LanguageProvider } from "../src/context/LanguageContext.jsx";
import {
  demoExpenses,
  demoExpenseSummary,
  demoMembers,
  demoTrip
} from "./fixtures.js";

const ownerAccess = { role: "owner", canEdit: true, isOwner: true };

function response(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function invitation({
  id,
  tripId,
  role = "viewer",
  expiresAt = "2099-08-03T10:00:00.000Z"
}) {
  return { id, tripId, role, status: "pending", expiresAt };
}

function renderDrawer(tripId, { onMembersChanged = vi.fn().mockResolvedValue([]) } = {}) {
  const props = {
    tripId,
    open: true,
    onClose: vi.fn(),
    access: ownerAccess,
    members: demoMembers(),
    onMembersChanged,
    membersLoading: false,
    membersError: ""
  };
  const view = render(
    <LanguageProvider>
      <CollaborationDrawer {...props} />
    </LanguageProvider>
  );
  return {
    ...view,
    rerenderTrip(nextTripId) {
      view.rerender(
        <LanguageProvider>
          <CollaborationDrawer {...props} tripId={nextTripId} />
        </LanguageProvider>
      );
    }
  };
}

function mockPrivateWorkspace({ memberFailureAfterFirstRead = false } = {}) {
  const members = demoMembers();
  let memberReads = 0;
  localStorage.setItem("nuogo-token", "owner-token");
  sessionStorage.setItem("nuogo-trip-trip-1", JSON.stringify(demoTrip()));

  fetch.mockImplementation(async (url, options = {}) => {
    if (url.endsWith("/auth/me")) {
      return response({
        user: { id: "user-1", name: "Chen Yu", email: "owner@nuogo.test" }
      });
    }
    if (url.endsWith("/trips/trip-1") && !options.method) {
      return response({ trip: demoTrip(), access: ownerAccess });
    }
    if (url.endsWith("/trips/trip-1/members") && !options.method) {
      memberReads += 1;
      if (memberFailureAfterFirstRead && memberReads > 1) {
        return response({ error: { code: "AUTH_REQUIRED", message: "Sign in again." } }, {
          ok: false,
          status: 401
        });
      }
      return response({ members });
    }
    if (url.endsWith("/trips/trip-1/invitations") && !options.method) {
      return response({ invitations: [] });
    }
    if (url.endsWith("/trips/trip-1/expenses") && !options.method) {
      return response({ expenses: demoExpenses() });
    }
    if (url.endsWith("/trips/trip-1/expense-summary") && !options.method) {
      return response(demoExpenseSummary());
    }
    throw new Error(`Unexpected request: ${url}`);
  });
}

describe("private collaboration state", () => {
  it("removes private trip, member, and expense data immediately on logout", async () => {
    mockPrivateWorkspace();
    render(<App initialPath="/trip/trip-1" />);

    await userEvent.click(await screen.findByRole("button", { name: "Group expenses" }));
    expect(await screen.findByText("Hongcun lunch")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Members" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(sessionStorage.getItem("nuogo-trip-trip-1")).toBeNull();
      expect(screen.queryByText("Hongcun lunch")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Members" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Add activity" })).not.toBeInTheDocument();
    });
  });

  it("does not hydrate an unauthenticated private route from session storage", async () => {
    sessionStorage.setItem("nuogo-trip-trip-1", JSON.stringify(demoTrip()));
    fetch.mockImplementation(async (url) => {
      throw new Error(`Private request should not run without authentication: ${url}`);
    });

    render(<App initialPath="/trip/trip-1" />);

    expect(await screen.findByText("Trip unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Budget-Friendly: 4 day itinerary")).not.toBeInTheDocument();
    expect(sessionStorage.getItem("nuogo-trip-trip-1")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears the visible private workspace after a background 401", async () => {
    mockPrivateWorkspace({ memberFailureAfterFirstRead: true });
    render(<App initialPath="/trip/trip-1" />);

    await userEvent.click(await screen.findByRole("button", { name: "Members" }));
    await userEvent.click(screen.getByRole("button", { name: "Refresh members" }));

    await waitFor(() => {
      expect(localStorage.getItem("nuogo-token")).toBeNull();
      expect(sessionStorage.getItem("nuogo-trip-trip-1")).toBeNull();
      expect(screen.queryByRole("dialog", { name: "Trip members" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Add activity" })).not.toBeInTheDocument();
    });
  });
});

describe("trip-scoped invitation state", () => {
  it("clears the prior trip list and ignores its delayed list response", async () => {
    const oldList = deferred();
    const nextInvitation = invitation({ id: "new-list", tripId: "trip-2", role: "editor" });
    fetch.mockImplementation((url, options = {}) => {
      if (url.endsWith("/trips/trip-1/invitations") && !options.method) return oldList.promise;
      if (url.endsWith("/trips/trip-2/invitations") && !options.method) {
        return Promise.resolve(response({ invitations: [nextInvitation] }));
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const view = renderDrawer("trip-1");
    view.rerenderTrip("trip-2");

    expect(await screen.findByRole("button", { name: "Revoke Editor invitation" }))
      .toBeInTheDocument();
    await act(async () => {
      oldList.resolve(response({
        invitations: [invitation({ id: "old-list", tripId: "trip-1" })]
      }));
      await oldList.promise;
    });

    expect(screen.queryByRole("button", { name: "Revoke Viewer invitation" }))
      .not.toBeInTheDocument();
  });

  it("does not reveal a delayed invitation URL after changing trips", async () => {
    const created = deferred();
    fetch.mockImplementation((url, options = {}) => {
      if (url.endsWith("/trips/trip-1/invitations") && !options.method) {
        return Promise.resolve(response({ invitations: [] }));
      }
      if (url.endsWith("/trips/trip-1/invitations") && options.method === "POST") {
        return created.promise;
      }
      if (url.endsWith("/trips/trip-2/invitations") && !options.method) {
        return Promise.resolve(response({ invitations: [] }));
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const view = renderDrawer("trip-1");
    await userEvent.click(await screen.findByRole("button", { name: "Create invitation" }));
    view.rerenderTrip("trip-2");

    await act(async () => {
      created.resolve(response({
        url: "https://nuogo.test/invite/private-trip-1-token",
        invitation: invitation({ id: "created-old", tripId: "trip-1" })
      }));
      await created.promise;
    });

    expect(screen.queryByDisplayValue("https://nuogo.test/invite/private-trip-1-token"))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke Viewer invitation" }))
      .not.toBeInTheDocument();
  });

  it("does not let a delayed revoke remove the next trip invitation", async () => {
    const revoked = deferred();
    const oldInvitation = invitation({ id: "same-id", tripId: "trip-1" });
    const nextInvitation = invitation({ id: "same-id", tripId: "trip-2", role: "editor" });
    fetch.mockImplementation((url, options = {}) => {
      if (url.endsWith("/trips/trip-1/invitations") && !options.method) {
        return Promise.resolve(response({ invitations: [oldInvitation] }));
      }
      if (url.endsWith("/trips/trip-1/invitations/same-id") && options.method === "DELETE") {
        return revoked.promise;
      }
      if (url.endsWith("/trips/trip-2/invitations") && !options.method) {
        return Promise.resolve(response({ invitations: [nextInvitation] }));
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const view = renderDrawer("trip-1");
    await userEvent.click(await screen.findByRole("button", { name: "Revoke Viewer invitation" }));
    await userEvent.click(screen.getByRole("button", { name: "Revoke invitation" }));
    view.rerenderTrip("trip-2");
    expect(await screen.findByRole("button", { name: "Revoke Editor invitation" }))
      .toBeInTheDocument();

    await act(async () => {
      revoked.resolve(response(null, { status: 204 }));
      await revoked.promise;
    });

    expect(screen.getByRole("button", { name: "Revoke Editor invitation" }))
      .toBeInTheDocument();
  });

  it("shows expired pending invitations without a revoke action", async () => {
    fetch.mockResolvedValue(response({
      invitations: [
        invitation({
          id: "expired",
          tripId: "trip-1",
          expiresAt: "2000-01-01T00:00:00.000Z"
        }),
        invitation({ id: "active", tripId: "trip-1", role: "editor" })
      ]
    }));

    renderDrawer("trip-1");

    expect(await screen.findByText("Expired")).toBeInTheDocument();
    expect(screen.getByText(/Expired Jan 1, 2000/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke Viewer invitation" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke Editor invitation" }))
      .toBeInTheDocument();
  });
});
