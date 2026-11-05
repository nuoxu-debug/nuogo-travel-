import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthProvider, useAuth } from "../src/context/AuthContext.jsx";
import { TripProvider, useTrip } from "../src/context/TripContext.jsx";

const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const privateTrip = { id: "private-trip", title: "Account A private itinerary", objectiveAligned: true, persistenceScope: "PERSISTENT" };
const denied = () => response({ error: { code: "NOT_FOUND", message: "Trip not found." } }, 404);

function Probe() {
  const { user } = useAuth();
  const { trip, access, error, refreshTrip } = useTrip();
  return <><span data-testid="user">{user?.id}</span><span data-testid="title">{trip?.title}</span><span data-testid="role">{access?.role}</span><p>{error}</p><button onClick={() => refreshTrip({ silent: true }).catch(() => {})}>Refresh</button></>;
}

function renderTrip() {
  return render(<AuthProvider><TripProvider tripId="private-trip"><Probe /></TripProvider></AuthProvider>);
}

function switchAccount() {
  act(() => {
    localStorage.setItem("nuogo-token", "account-b-token");
    window.dispatchEvent(new StorageEvent("storage", { key: "nuogo-token", oldValue: "account-a-token", newValue: "account-b-token", storageArea: localStorage }));
  });
}

describe("saved itinerary authorization", () => {
  it("requires server authorization before displaying another account's cached trip", async () => {
    localStorage.setItem("nuogo-token", "account-b-token");
    sessionStorage.setItem("nuogo-trip-private-trip", JSON.stringify(privateTrip));
    fetch.mockImplementation(async url => String(url).endsWith("/auth/me")
      ? response({ user: { id: "account-b", accountType: "REGISTERED" } }) : denied());

    renderTrip();
    expect(screen.getByTestId("title")).toBeEmptyDOMElement();
    await screen.findByText("Trip not found.");
    expect(screen.getByTestId("title")).toBeEmptyDOMElement();
    expect(sessionStorage.getItem("nuogo-trip-private-trip")).toBeNull();
  });

  it("rechecks authorization and hides private content when another tab switches accounts", async () => {
    localStorage.setItem("nuogo-token", "account-a-token");
    fetch.mockImplementation(async (url, options) => {
      const isA = options.headers.Authorization === "Bearer account-a-token";
      if (String(url).endsWith("/auth/me")) return response({ user: { id: isA ? "account-a" : "account-b", accountType: "REGISTERED" } });
      return isA ? response({ trip: privateTrip, access: { role: "owner", canEdit: true } }) : denied();
    });
    renderTrip();
    await screen.findByText(privateTrip.title);

    switchAccount();
    expect(screen.getByTestId("title")).toBeEmptyDOMElement();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("account-b"));
    await screen.findByText("Trip not found.");
    expect(screen.getByTestId("role")).toBeEmptyDOMElement();
  });

  it("discards an old account response that arrives after an account switch", async () => {
    localStorage.setItem("nuogo-token", "account-a-token");
    let resolveOld;
    const oldRequest = new Promise(resolve => { resolveOld = resolve; });
    fetch.mockImplementation(async (url, options) => {
      const isA = options.headers.Authorization === "Bearer account-a-token";
      if (String(url).endsWith("/auth/me")) return response({ user: { id: isA ? "account-a" : "account-b", accountType: "REGISTERED" } });
      return isA ? oldRequest : denied();
    });
    renderTrip();
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => String(url).endsWith("/trips/private-trip"))).toBe(true));
    switchAccount();
    await screen.findByText("Trip not found.");
    await act(async () => { resolveOld(response({ trip: privateTrip })); });
    expect(screen.getByTestId("title")).toBeEmptyDOMElement();
    expect(sessionStorage.getItem("nuogo-trip-private-trip")).toBeNull();
  });

  it("removes a previously authorized trip when a background refresh denies access", async () => {
    localStorage.setItem("nuogo-token", "account-a-token");
    let allowed = true;
    fetch.mockImplementation(async url => String(url).endsWith("/auth/me")
      ? response({ user: { id: "account-a", accountType: "REGISTERED" } })
      : allowed ? response({ trip: privateTrip }) : denied());
    renderTrip();
    await screen.findByText(privateTrip.title);
    allowed = false;
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText("Trip not found.");
    expect(screen.getByTestId("title")).toBeEmptyDOMElement();
    expect(sessionStorage.getItem("nuogo-trip-private-trip")).toBeNull();
  });
});
