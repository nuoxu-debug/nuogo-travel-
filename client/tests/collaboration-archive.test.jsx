import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.jsx";
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
  expiresAt: "2026-08-03T10:00:00.000Z"
};

function response(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

function renderCollaborativeWorkspace({
  role = "owner",
  members = demoMembers(),
  invitations = [pendingInvitation],
  language = "en",
  mutation,
  readTrip
} = {}) {
  localStorage.setItem("nuogo-token", `${role}-token`);
  localStorage.setItem("nuogo-language", language);
  const trip = demoTrip();

  fetch.mockImplementation(async (url, options = {}) => {
    if (url.endsWith("/auth/me")) {
      const member = members.find(({ role: memberRole }) => memberRole === role) ?? members[0];
      return response({
        user: { id: member.userId, name: member.name, email: member.email }
      });
    }
    if (url.endsWith("/trips/trip-1") && !options.method) {
      return response(readTrip?.() ?? { trip, access: accessByRole[role] });
    }
    if (url.endsWith("/trips/trip-1/members") && !options.method) {
      return response({ members });
    }
    if (url.endsWith("/trips/trip-1/invitations") && !options.method) {
      return response({ invitations });
    }
    if (mutation) return mutation(url, options, trip);
    throw new Error(`Unexpected request: ${url}`);
  });

  return render(<App initialPath="/trip/trip-1" />);
}

describe("map, collaboration, and archive", () => {
  beforeEach(() => {
    sessionStorage.setItem("nuogo-trip-trip-1", JSON.stringify(demoTrip()));
  });

  it("selects the matching timeline activity from a map marker", async () => {
    render(<App initialPath="/trip/trip-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Map marker: People's Park" }));
    expect(screen.getByTestId("activity-people-park-budget")).toHaveAttribute("data-selected", "true");
  });

  it("creates an editable share link", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "sharetoken",
        permission: "edit",
        url: "http://localhost:5173/shared/sharetoken"
      })
    });
    render(<App initialPath="/trip/trip-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Public share" }));
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
      mutation: async (url, options) => {
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

  it("classifies saved trips in the archive", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ trips: [demoTrip()] })
    });
    render(<App initialPath="/archive" />);
    expect(await screen.findByText("Chengdu food and culture")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Drafts" })).toHaveAttribute("aria-selected", "true");
  });

  it("lets members vote inside an editable shared trip", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trip: demoTrip(), permission: "edit", token: "sharetoken" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activityId: "jinli-budget", votes: 1 })
      });
    render(<App initialPath="/shared/sharetoken" />);
    await userEvent.click(await screen.findByRole("button", { name: "Vote for Jinli Ancient Street" }));
    expect(await screen.findByRole("button", { name: "Vote for Jinli Ancient Street (1 vote)" })).toBeInTheDocument();
  });
});
