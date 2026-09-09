import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../src/App.jsx";

function response(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

function profile(overrides = {}) {
  return {
    id: "user-1",
    name: "Chen Yu",
    email: "chen@nuogo.test",
    preferredLanguage: "en",
    accountType: "REGISTERED",
    createdAt: "2026-08-24T00:00:00.000Z",
    ...overrides
  };
}

function mockProfileApi(initialProfile = profile(), failures = {}) {
  let current = initialProfile;
  fetch.mockImplementation(async (url, options = {}) => {
    if (url.endsWith("/auth/me")) return response({ user: current });
    if (url.endsWith("/profile") && !options.method) return response({ profile: current });
    if (url.endsWith("/profile") && options.method === "PATCH") {
      current = { ...current, ...JSON.parse(options.body) };
      return response({ profile: current });
    }
    if (url.endsWith("/profile/password") && options.method === "POST") {
      if (failures.password) return response(failures.password, { ok: false, status: 403 });
      return response(null, { status: 204 });
    }
    if (url.endsWith("/privacy/account") && options.method === "DELETE") {
      if (failures.deletion) return response(failures.deletion, { ok: false, status: 403 });
      return response(null, { status: 204 });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
}

describe("ProfilePage", () => {
  it("loads and updates the supported profile fields", async () => {
    localStorage.setItem("nuogo-token", "profile-token");
    mockProfileApi();

    render(<App initialPath="/profile" />);

    expect(await screen.findByRole("heading", { name: "Profile and privacy" }))
      .toBeInTheDocument();
    expect(screen.getByDisplayValue("chen@nuogo.test")).toHaveAttribute("readonly");
    await userEvent.clear(screen.getByLabelText("Display name"));
    await userEvent.type(screen.getByLabelText("Display name"), "Chen Yuxin");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Profile updated.");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/profile$/),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "Chen Yuxin", preferredLanguage: "en" })
      })
    );
  });

  it("changes a registered password without clearing the active session", async () => {
    localStorage.setItem("nuogo-token", "profile-token");
    mockProfileApi();
    render(<App initialPath="/profile" />);

    await screen.findByRole("heading", { name: "Profile and privacy" });
    await userEvent.type(screen.getByLabelText("Current password"), "Nuogo123!");
    await userEvent.type(screen.getByLabelText("New password"), "NewNuogo456!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewNuogo456!");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Password updated.");
    expect(localStorage.getItem("nuogo-token")).toBe("profile-token");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/profile\/password$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          currentPassword: "Nuogo123!",
          newPassword: "NewNuogo456!"
        })
      })
    );
  });

  it("marks the invalid profile field, describes the error, and focuses it", async () => {
    localStorage.setItem("nuogo-token", "profile-token");
    mockProfileApi();
    render(<App initialPath="/profile" />);

    await screen.findByRole("heading", { name: "Profile and privacy" });
    const name = screen.getByLabelText("Display name");
    await userEvent.clear(name);
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAttribute("aria-describedby", expect.stringMatching(/profile-name-error/));
    expect(document.activeElement).toBe(name);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a name between 2 and 80 characters.");
  });

  it("shows a field-specific wrong-current-password error", async () => {
    localStorage.setItem("nuogo-token", "profile-token");
    mockProfileApi(profile(), {
      password: { error: { code: "CURRENT_PASSWORD_INVALID", message: "The current password is incorrect." } }
    });
    render(<App initialPath="/profile" />);

    await screen.findByRole("heading", { name: "Profile and privacy" });
    const currentPassword = screen.getByLabelText("Current password");
    await userEvent.type(currentPassword, "Incorrect123!");
    await userEvent.type(screen.getByLabelText("New password"), "NewNuogo456!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewNuogo456!");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The current password is incorrect.");
    expect(currentPassword).toHaveAttribute("aria-invalid", "true");
    expect(currentPassword).toHaveAttribute("aria-describedby", expect.stringMatching(/current-password-error/));
    expect(document.activeElement).toBe(currentPassword);
  });

  it("moves keyboard submission focus to each first invalid password and deletion field", async () => {
    localStorage.setItem("nuogo-token", "profile-token");
    mockProfileApi();
    render(<App initialPath="/profile" />);

    await screen.findByRole("heading", { name: "Profile and privacy" });
    const currentPassword = screen.getByLabelText("Current password");
    const newPassword = screen.getByLabelText("New password");
    const confirmPassword = screen.getByLabelText("Confirm new password");
    await userEvent.type(currentPassword, "Nuogo123!");
    await userEvent.type(newPassword, "short");
    screen.getByRole("button", { name: "Change password" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(document.activeElement).toBe(newPassword);

    await userEvent.clear(newPassword);
    await userEvent.type(newPassword, "NewNuogo456!");
    await userEvent.type(confirmPassword, "Different456!");
    screen.getByRole("button", { name: "Change password" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(document.activeElement).toBe(confirmPassword);

    const confirmation = screen.getByLabelText("Type DELETE to confirm");
    screen.getByRole("button", { name: "Delete account" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(document.activeElement).toBe(confirmation);
  });

  it("refocuses the deletion password after an async wrong-password response", async () => {
    localStorage.setItem("nuogo-token", "profile-token");
    mockProfileApi(profile(), {
      deletion: { error: { code: "CURRENT_PASSWORD_INVALID", message: "The current password is incorrect." } }
    });
    render(<App initialPath="/profile" />);

    await screen.findByRole("heading", { name: "Profile and privacy" });
    const deletionPassword = screen.getByLabelText("Password for account deletion");
    await userEvent.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await userEvent.type(deletionPassword, "Incorrect123!");
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The current password is incorrect.");
    expect(document.activeElement).toBe(deletionPassword);
  });

  it("keeps guest accounts out of the persistent profile area", async () => {
    localStorage.setItem("nuogo-language", "zh");
    localStorage.setItem("nuogo-token", "guest-token");
    mockProfileApi(profile({
      name: "Nuogo访客",
      email: "guest+1@nuogo.local",
      preferredLanguage: "zh",
      accountType: "GUEST"
    }));

    render(<App initialPath="/profile" />);

    expect(await screen.findByRole("heading", { name: "一次选择，一份真正好用的新加坡行程。" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "个人资料与隐私" })).not.toBeInTheDocument();
  });

  it("reauthenticates registered deletion and clears private client state", async () => {
    localStorage.setItem("nuogo-token", "profile-token");
    sessionStorage.setItem("nuogo-trip-trip-1", "private trip");
    sessionStorage.setItem("nuogo-reused-preferences", "private preferences");
    mockProfileApi();
    render(<App initialPath="/profile" />);

    await screen.findByRole("heading", { name: "Profile and privacy" });
    await userEvent.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await userEvent.type(screen.getByLabelText("Password for account deletion"), "Nuogo123!");
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(localStorage.getItem("nuogo-token")).toBeNull();
    expect(sessionStorage.getItem("nuogo-trip-trip-1")).toBeNull();
    expect(sessionStorage.getItem("nuogo-reused-preferences")).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/privacy\/account$/),
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({
          confirmation: "DELETE",
          currentPassword: "Nuogo123!"
        })
      })
    );
  });
});

describe("expired session boundary", () => {
  it("redirects the public planner when bootstrap discovers an expired token", async () => {
    localStorage.setItem("nuogo-token", "expired-token");
    localStorage.setItem("nuogo-language", "en");
    sessionStorage.setItem("nuogo-trip-trip-1", "private trip");
    fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: "AUTH_TOKEN_EXPIRED", message: "The session token has expired." } })
    });

    render(<App initialPath="/planner" />);

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Your session has expired. Please sign in again.");
    expect(localStorage.getItem("nuogo-token")).toBeNull();
    expect(sessionStorage.getItem("nuogo-trip-trip-1")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("redirects a protected route when bootstrap discovers an expired token", async () => {
    localStorage.setItem("nuogo-token", "expired-token");
    localStorage.setItem("nuogo-language", "en");
    sessionStorage.setItem("nuogo-trip-trip-1", "private trip");
    fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: "AUTH_TOKEN_EXPIRED", message: "The session token has expired." } })
    });

    render(<App initialPath="/archive" />);

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Your session has expired. Please sign in again.");
    expect(localStorage.getItem("nuogo-token")).toBeNull();
    expect(localStorage.getItem("nuogo-language")).toBe("en");
    expect(sessionStorage.getItem("nuogo-trip-trip-1")).toBeNull();
  });

  it("redirects any protected page after a later expired API response", async () => {
    localStorage.setItem("nuogo-token", "expired-token");
    fetch.mockImplementation(async (url) => {
      if (url.endsWith("/auth/me")) return response({ user: profile() });
      if (url.endsWith("/trips")) return response({
        error: { code: "AUTH_TOKEN_EXPIRED", message: "The session token has expired." }
      }, { ok: false, status: 401 });
      if (url.endsWith("/favorites")) return response({ favorites: [] });
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App initialPath="/archive" />);

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Your session has expired. Please sign in again.");
  });

  it("clears every private auth/trip value and redirects once to login", async () => {
    localStorage.setItem("nuogo-token", "expired-token");
    sessionStorage.setItem("nuogo-trip-trip-1", "private trip");
    sessionStorage.setItem("nuogo-trip-trip-2", "another private trip");
    sessionStorage.setItem("nuogo-reused-preferences", "private preferences");
    sessionStorage.setItem("unrelated-session-value", "keep");
    fetch.mockImplementation(async (url) => {
      if (url.endsWith("/auth/me")) return response({ user: profile() });
      if (url.endsWith("/profile")) {
        return response({
          error: { code: "AUTH_TOKEN_EXPIRED", message: "The session token has expired." }
        }, { ok: false, status: 401 });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App initialPath="/profile" />);

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your session has expired. Please sign in again."
    );
    expect(localStorage.getItem("nuogo-token")).toBeNull();
    expect(sessionStorage.getItem("nuogo-trip-trip-1")).toBeNull();
    expect(sessionStorage.getItem("nuogo-trip-trip-2")).toBeNull();
    expect(sessionStorage.getItem("nuogo-reused-preferences")).toBeNull();
    expect(sessionStorage.getItem("unrelated-session-value")).toBe("keep");
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});
