import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";
import { AuthProvider } from "../src/context/AuthContext.jsx";
import { TripProvider, useTrip } from "../src/context/TripContext.jsx";
import { demoMembers, demoTrip } from "./fixtures.js";

const accessByRole = {
  owner: { role: "owner", canEdit: true, isOwner: true },
  editor: { role: "editor", canEdit: true, isOwner: false },
  viewer: { role: "viewer", canEdit: false, isOwner: false }
};

const pendingInvitation = {
  id: "invitation-1",
  tripId: "trip-1",
  role: "viewer",
  status: "pending",
  expiresAt: "2099-08-03T10:00:00.000Z"
};

function response(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderCollaborativeWorkspace({
  role = "owner",
  members = demoMembers(),
  invitations = [pendingInvitation],
  language = "en",
  mutation,
  readTrip,
  readMembers
} = {}) {
  localStorage.setItem("nuogo-token", `${role}-token`);
  localStorage.setItem("nuogo-language", language);
  localStorage.setItem("nuogo-language-default", "en-v3");
  const trip = demoTrip();

  fetch.mockImplementation(async (url, options = {}) => {
    if (url.endsWith("/auth/me")) {
      const member = members.find(({ role: memberRole }) => memberRole === role) ?? members[0];
      return response({
        user: {
          id: member.userId,
          name: member.name,
          email: `${member.userId}@nuogo.test`
        }
      });
    }
    if (url.endsWith("/trips/trip-1") && !options.method) {
      return response(readTrip?.() ?? { trip, access: accessByRole[role] });
    }
    if (url.endsWith("/trips/trip-1/members") && !options.method) {
      return readMembers?.() ?? response({ members });
    }
    if (url.endsWith("/trips/trip-1/invitations") && !options.method) {
      return response({ invitations });
    }
    if (mutation) return mutation(url, options, trip);
    throw new Error(`Unexpected request: ${url}`);
  });

  return render(<App initialPath="/trip/trip-1" />);
}

function TripStateProbe() {
  const { trip, access, members, loading } = useTrip();
  return (
    <output data-testid="trip-state">
      {loading
        ? "loading"
        : `${trip?.id ?? "none"}:${trip?.revision ?? "none"}:${access?.role ?? "none"}:${members.length}`}
    </output>
  );
}

describe("map, collaboration, and archive", () => {
  beforeEach(() => {
    sessionStorage.setItem("nuogo-trip-trip-1", JSON.stringify(demoTrip()));
  });

  it("selects the matching timeline activity from a map marker", async () => {
    renderCollaborativeWorkspace();
    await userEvent.click(await screen.findByRole("button", { name: "Map marker: People's Park" }));
    expect(screen.getByTestId("activity-people-park-budget")).toHaveAttribute("data-selected", "true");
  });

  it("creates an editable share link", async () => {
    renderCollaborativeWorkspace({
      mutation: async (url, options) => {
        if (url.endsWith("/trips/trip-1/shares") && options.method === "POST") {
          return response({
            token: "sharetoken",
            permission: "edit",
            url: "http://localhost:5173/shared/sharetoken"
          });
        }
        throw new Error(`Unexpected request: ${url}`);
      }
    });
    await userEvent.click(await screen.findByRole("button", { name: "Public share" }));
    await userEvent.click(screen.getByLabelText("Can edit"));
    await userEvent.click(screen.getByRole("button", { name: "Create public link" }));
    expect(await screen.findByDisplayValue("http://localhost:5173/shared/sharetoken")).toBeInTheDocument();
  });

  it("gives owners member waypoints and complete invitation controls", async () => {
    sessionStorage.clear();
    renderCollaborativeWorkspace();

    expect(await screen.findByRole("button", { name: "Invite" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Members" })).toBeInTheDocument();
    expect(screen.getByLabelText("Chen Yu, Owner")).toBeInTheDocument();
    expect(screen.getByLabelText("Li Wei, Editor")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Members" }));

    expect(screen.getByRole("dialog", { name: "Trip members" })).toBeInTheDocument();
    expect(screen.getByLabelText("Role for Li Wei")).toHaveValue("editor");
    expect(screen.getByRole("button", { name: "Remove Li Wei" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke Viewer invitation" })).toBeInTheDocument();
  });

  it("lets editors shape the itinerary and inspect members without owner controls", async () => {
    sessionStorage.clear();
    renderCollaborativeWorkspace({ role: "editor" });

    expect(await screen.findByRole("button", { name: "Edit Jinli Ancient Street" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invite" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Members" }));
    expect(screen.getByRole("dialog", { name: "Trip members" })).toBeInTheDocument();
    expect(screen.getByText("Li Wei")).toBeInTheDocument();
    expect(screen.queryByLabelText("Role for Li Wei")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Li Wei" })).not.toBeInTheDocument();
  });

  it("keeps viewers read-only while preserving the member list", async () => {
    sessionStorage.clear();
    renderCollaborativeWorkspace({ role: "viewer" });

    expect(await screen.findByRole("button", { name: "Members" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Jinli Ancient Street" }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add activity" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Members" }));
    expect(screen.getByText("Wang Min")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invite someone" })).not.toBeInTheDocument();
  });

  it("creates a copyable invitation URL without replacing public sharing", async () => {
    sessionStorage.clear();
    renderCollaborativeWorkspace({
      mutation: async (url, options) => {
        if (url.endsWith("/trips/trip-1/invitations") && options.method === "POST") {
          return response({
            token: "invite-token",
            url: "http://localhost:5173/invite/invite-token",
            invitation: { ...pendingInvitation, id: "invitation-2" }
          }, { status: 201 });
        }
        throw new Error(`Unexpected request: ${url}`);
      }
    });

    await userEvent.click(await screen.findByRole("button", { name: "Invite" }));
    await userEvent.click(screen.getByRole("button", { name: "Create invitation" }));

    expect(await screen.findByDisplayValue("http://localhost:5173/invite/invite-token"))
      .toHaveAttribute("aria-label", "Invitation URL");
    expect(screen.getByRole("button", { name: "Copy invitation link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Public share" })).toBeInTheDocument();
  });

  it("closes the collaboration sheet with Escape and returns focus", async () => {
    sessionStorage.clear();
    renderCollaborativeWorkspace();

    const trigger = await screen.findByRole("button", { name: "Members" });
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Trip members" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Trip members" })).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it("keeps collaboration controls fully Chinese in Chinese mode", async () => {
    sessionStorage.clear();
    renderCollaborativeWorkspace({ language: "zh" });

    expect(await screen.findByRole("button", { name: "邀请同伴" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "成员" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "公开分享" })).toBeInTheDocument();
    expect(screen.queryByText("Invite")).not.toBeInTheDocument();
    expect(screen.queryByText("Members")).not.toBeInTheDocument();
    expect(screen.queryByText("Public share")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "成员" }));
    expect(screen.getByRole("dialog", { name: "行程成员" })).toBeInTheDocument();
    expect(screen.getByLabelText("Li Wei 的权限")).toHaveValue("editor");
    expect(screen.getAllByRole("option", { name: "可编辑" })).toHaveLength(2);
    expect(screen.getAllByRole("option", { name: "仅查看" })).toHaveLength(2);
    expect(screen.queryByText("Editor")).not.toBeInTheDocument();
    expect(screen.queryByText("Viewer")).not.toBeInTheDocument();
  });

  it("refreshes the latest trip after a revision conflict", async () => {
    sessionStorage.clear();
    const latest = { ...demoTrip(), revision: 2 };
    let tripReads = 0;
    renderCollaborativeWorkspace({
      readTrip: () => {
        tripReads += 1;
        return {
          trip: tripReads > 1 ? latest : demoTrip(),
          access: accessByRole.owner
        };
      },
      mutation: async (url, _options) => {
        if (url.endsWith("/activities/jinli-budget/cheaper-alternative")) {
          return response({
            error: {
              code: "TRIP_VERSION_CONFLICT",
              message: "The trip changed."
            }
          }, { ok: false, status: 409 });
        }
        throw new Error(`Unexpected request: ${url}`);
      }
    });

    await userEvent.click(await screen.findByRole("button", {
      name: "Find a cheaper alternative"
    }));

    expect(await screen.findByText("This trip changed. The latest version is now loaded."))
      .toHaveTextContent("This trip changed. The latest version is now loaded.");
    expect(JSON.parse(sessionStorage.getItem("nuogo-trip-trip-1")).revision).toBe(2);
  });

  it("polls visible authenticated trips every 20 seconds", async () => {
    sessionStorage.clear();
    const intervalSpy = vi.spyOn(window, "setInterval");
    renderCollaborativeWorkspace();
    await screen.findByRole("button", { name: "Members" });
    const poll = intervalSpy.mock.calls.find(([, delay]) => delay === 20_000)?.[0];
    expect(poll).toEqual(expect.any(Function));
    const readsBefore = fetch.mock.calls
      .filter(([url, options = {}]) => url.endsWith("/trips/trip-1") && !options.method)
      .length;

    await act(async () => {
      await poll();
    });

    const readsAfter = fetch.mock.calls
      .filter(([url, options = {}]) => url.endsWith("/trips/trip-1") && !options.method)
      .length;
    expect(readsAfter).toBe(readsBefore + 1);
  });

  it("resets route state and ignores stale responses when tripId changes", async () => {
    localStorage.setItem("nuogo-token", "owner-token");
    const firstRequest = deferred();
    const secondTrip = { ...demoTrip(), id: "trip-2", revision: 1 };
    sessionStorage.setItem(
      "nuogo-trip-trip-1",
      JSON.stringify({ ...demoTrip(), revision: 4 })
    );

    fetch.mockImplementation((url) => {
      if (url.endsWith("/auth/me")) {
        return Promise.resolve(response({
          user: { id: "user-1", name: "Chen Yu", email: "owner@nuogo.test" }
        }));
      }
      if (url.endsWith("/trips/trip-1")) return firstRequest.promise;
      if (url.endsWith("/trips/trip-2")) {
        return Promise.resolve(response({
          trip: secondTrip,
          access: accessByRole.viewer
        }));
      }
      if (url.endsWith("/trips/trip-2/members")) {
        return Promise.resolve(response({ members: [] }));
      }
      if (url.endsWith("/trips/trip-1/members")) {
        return Promise.resolve(response({ members: demoMembers() }));
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const { rerender } = render(
      <AuthProvider>
        <TripProvider tripId="trip-1"><TripStateProbe /></TripProvider>
      </AuthProvider>
    );
    rerender(
      <AuthProvider>
        <TripProvider tripId="trip-2"><TripStateProbe /></TripProvider>
      </AuthProvider>
    );

    expect(screen.getByTestId("trip-state")).toHaveTextContent("loading");
    expect(await screen.findByText("trip-2:1:viewer:0")).toBeInTheDocument();

    await act(async () => {
      firstRequest.resolve(response({
        trip: { ...demoTrip(), revision: 5 },
        access: accessByRole.owner
      }));
      await firstRequest.promise;
    });

    expect(screen.getByTestId("trip-state")).toHaveTextContent("trip-2:1:viewer:0");
  });

  it("does not let a delayed mutation overwrite a newer polled trip", async () => {
    sessionStorage.clear();
    const intervalSpy = vi.spyOn(window, "setInterval");
    const mutationRequest = deferred();
    const latest = structuredClone(demoTrip());
    latest.revision = 2;
    latest.variants[0].days[0].activities[0].name.en = "Latest polled stop";
    let tripReads = 0;

    renderCollaborativeWorkspace({
      readTrip: () => {
        tripReads += 1;
        return {
          trip: tripReads > 1 ? latest : demoTrip(),
          access: accessByRole.owner
        };
      },
      mutation: (url) => {
        if (url.endsWith("/activities/jinli-budget/cheaper-alternative")) {
          return mutationRequest.promise;
        }
        throw new Error(`Unexpected request: ${url}`);
      }
    });

    await userEvent.click(await screen.findByRole("button", {
      name: "Find a cheaper alternative"
    }));
    const poll = intervalSpy.mock.calls.find(([, delay]) => delay === 20_000)?.[0];
    await act(async () => {
      await poll();
    });
    expect((await screen.findAllByText("Latest polled stop")).length).toBeGreaterThan(0);

    const staleActivity = {
      ...demoTrip().variants[0].days[0].activities[0],
      name: { en: "Stale mutation stop", zh: "Stale mutation stop" }
    };
    await act(async () => {
      mutationRequest.resolve(response({
        activity: staleActivity,
        budget: null,
        revision: 1
      }));
      await mutationRequest.promise;
    });

    expect(screen.getAllByText("Latest polled stop").length).toBeGreaterThan(0);
    expect(screen.queryByText("Stale mutation stop")).not.toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem("nuogo-trip-trip-1")).revision).toBe(2);
  });

  it("contains collaboration focus through a polling rerender", async () => {
    sessionStorage.clear();
    const intervalSpy = vi.spyOn(window, "setInterval");
    let reads = 0;
    renderCollaborativeWorkspace({
      readTrip: () => {
        reads += 1;
        return {
          trip: { ...demoTrip(), revision: reads > 1 ? 1 : 0 },
          access: accessByRole.owner
        };
      }
    });

    const trigger = await screen.findByRole("button", { name: "Members" });
    await userEvent.click(trigger);
    const close = screen.getByRole("button", { name: "Close trip members" });
    expect(close).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Revoke Viewer invitation" })).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();

    const role = screen.getByLabelText("Role for Li Wei");
    role.focus();
    const poll = intervalSpy.mock.calls.find(([, delay]) => delay === 20_000)?.[0];
    await act(async () => {
      await poll();
    });
    expect(role).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("contains public share focus and returns it to the public share trigger", async () => {
    sessionStorage.clear();
    renderCollaborativeWorkspace();

    const trigger = await screen.findByRole("button", { name: "Public share" });
    await userEvent.click(trigger);
    const close = screen.getByRole("button", { name: "Close public sharing" });
    expect(close).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Create public link" })).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Public trip sharing" }))
        .not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it("shows member loading and recovers from a failed member refresh", async () => {
    sessionStorage.clear();
    const pendingMembers = deferred();
    let memberReads = 0;
    renderCollaborativeWorkspace({
      readMembers: () => {
        memberReads += 1;
        if (memberReads === 1) return pendingMembers.promise;
        return response({ members: demoMembers() });
      }
    });

    await userEvent.click(await screen.findByRole("button", { name: "Members" }));
    expect(screen.getByText("Loading trip members")).toBeInTheDocument();

    await act(async () => {
      pendingMembers.resolve(response({
        error: { code: "REQUEST_FAILED", message: "Members unavailable" }
      }, { ok: false, status: 503 }));
      await pendingMembers.promise;
    });

    expect(await screen.findByText("Trip members could not be loaded.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try loading members again" }));
    expect(await screen.findByText("Chen Yu")).toBeInTheDocument();
  });

  it("sends owner role changes, member removals, and invitation revocations", async () => {
    sessionStorage.clear();
    renderCollaborativeWorkspace({
      mutation: async (url, options) => {
        if (url.endsWith("/members/member-editor") && options.method === "PATCH") {
          return response({ member: { ...demoMembers()[1], role: "viewer" } });
        }
        if (url.endsWith("/members/member-viewer") && options.method === "DELETE") {
          return response(null, { status: 204 });
        }
        if (url.endsWith("/invitations/invitation-1") && options.method === "DELETE") {
          return response(null, { status: 204 });
        }
        throw new Error(`Unexpected request: ${url}`);
      }
    });

    await userEvent.click(await screen.findByRole("button", { name: "Members" }));
    await userEvent.selectOptions(screen.getByLabelText("Role for Li Wei"), "viewer");
    await userEvent.click(screen.getByRole("button", { name: "Remove Wang Min" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove member" }));
    await userEvent.click(screen.getByRole("button", { name: "Revoke Viewer invitation" }));
    await userEvent.click(screen.getByRole("button", { name: "Revoke invitation" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/members/member-editor"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ role: "viewer" })
        })
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/members/member-viewer"),
        expect.objectContaining({ method: "DELETE" })
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/invitations/invitation-1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("clears the trip polling interval on unmount", async () => {
    sessionStorage.clear();
    const intervalId = 731;
    vi.spyOn(window, "setInterval").mockReturnValue(intervalId);
    const clearSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderCollaborativeWorkspace();

    await screen.findByRole("button", { name: "Members" });
    unmount();

    expect(clearSpy).toHaveBeenCalledWith(intervalId);
  });

  it("classifies saved trips in the archive", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ trips: [demoTrip()] })
    });
    render(<App initialPath="/archive" />);
    expect(await screen.findByText("Chengdu food and culture")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Drafts" })).toHaveAttribute("aria-selected", "true");
  });

  it("distinguishes archive loading from an empty library", () => {
    const pending = deferred();
    fetch.mockReturnValue(pending.promise);

    render(<App initialPath="/archive" />);

    expect(screen.getByRole("status", { name: "Loading saved trips" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading favorite places" })).toBeInTheDocument();
    expect(screen.queryByText("No trips here yet")).not.toBeInTheDocument();
  });

  it("shows actionable archive errors instead of silent empty states", async () => {
    fetch.mockResolvedValue(response({
      error: { code: "REQUEST_FAILED", message: "Unavailable" }
    }, { ok: false, status: 503 }));

    render(<App initialPath="/archive" />);

    expect(await screen.findByRole("alert", { name: "Saved trips could not be loaded." }))
      .toBeInTheDocument();
    expect(screen.getByRole("alert", { name: "Favorite places could not be loaded." }))
      .toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(2);
  });

  it("keeps vote-enabled public shares itinerary read-only", async () => {
    fetch.mockImplementation(async (url, options = {}) => {
      if (url.endsWith("/shared/sharetoken") && !options.method) {
        return response({ trip: demoTrip(), permission: "edit", token: "sharetoken" });
      }
      if (url.endsWith("/shared/sharetoken/votes") && options.method === "POST") {
        return response({ activityId: "jinli-budget", votes: 1 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App initialPath="/shared/sharetoken" />);
    const vote = await screen.findByRole("button", { name: "Vote for Jinli Ancient Street" });
    expect(screen.queryByRole("button", { name: "Edit Jinli Ancient Street" }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Regenerate Jinli Ancient Street" }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Jinli Ancient Street" }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add activity" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Find a cheaper alternative" })).toBeDisabled();

    await userEvent.click(vote);
    expect(await screen.findByRole("button", {
      name: "Vote for Jinli Ancient Street (1 vote)"
    })).toBeInTheDocument();
    expect(fetch.mock.calls.every(([url]) => url.includes("/shared/sharetoken"))).toBe(true);
  });
});
