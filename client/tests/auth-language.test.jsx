import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../src/App.jsx";
import { AuthProvider, useAuth } from "../src/context/AuthContext.jsx";

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

function AuthRaceProbe() {
  const { login, user } = useAuth();
  return (
    <>
      <button type="button" onClick={() => login("new@example.com", "password123")}>
        Force newer login
      </button>
      <output aria-label="Current user">{user?.name ?? "Signed out"}</output>
    </>
  );
}

describe("Nuogo language and authentication UI", () => {
  it("uses the supplied Nuogo logo artwork without repeating it in the hero", () => {
    render(<App initialPath="/" />);

    const logos = screen.getAllByRole("img", { name: "Nuogo logo" });
    expect(logos).toHaveLength(2);
    expect(logos.every((logo) => logo.getAttribute("src") === "/nuogo-logo.png")).toBe(true);
    expect(screen.getByTestId("scroll-progress")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Animated journey across China" })).toBeInTheDocument();
  });

  it("defaults to English and persists Chinese when selected", async () => {
    localStorage.removeItem("nuogo-language");
    localStorage.removeItem("nuogo-language-default");
    render(<App initialPath="/" />);
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "中文" }));
    expect(localStorage.getItem("nuogo-language")).toBe("zh");
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

  it("does not let a stale bootstrap response overwrite a newer login", async () => {
    localStorage.setItem("nuogo-token", "old-token");
    const bootstrap = deferred();
    fetch.mockImplementation(async (url) => {
      if (url.endsWith("/auth/me")) return bootstrap.promise;
      if (url.endsWith("/auth/login")) {
        return response({
          user: { id: "new-user", name: "New User", email: "new@example.com" },
          token: "new-token"
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(
      <AuthProvider>
        <AuthRaceProbe />
      </AuthProvider>
    );
    await userEvent.click(screen.getByRole("button", { name: "Force newer login" }));
    expect(await screen.findByRole("status", { name: "Current user" }))
      .toHaveTextContent("New User");
    expect(localStorage.getItem("nuogo-token")).toBe("new-token");

    await act(async () => {
      bootstrap.resolve(response({
        user: { id: "old-user", name: "Old User", email: "old@example.com" }
      }));
      await bootstrap.promise;
    });
    expect(screen.getByRole("status", { name: "Current user" }))
      .toHaveTextContent("New User");
    expect(localStorage.getItem("nuogo-token")).toBe("new-token");
  });

  it("disables login submissions while an existing session is being verified", async () => {
    localStorage.setItem("nuogo-token", "existing-token");
    const bootstrap = deferred();
    fetch.mockReturnValue(bootstrap.promise);

    render(<App initialPath="/login" />);

    expect(screen.getByRole("button", { name: "Continue as guest" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();

    bootstrap.resolve(response({
      user: { id: "user-1", name: "Existing User", email: "existing@example.com" }
    }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continue as guest" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    });
  });

  it("shows a localized Chinese invalid-credentials error", async () => {
    localStorage.setItem("nuogo-language", "zh");
    localStorage.setItem("nuogo-language-default", "en-v3");
    fetch.mockResolvedValueOnce(response({
      error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." }
    }, { ok: false, status: 401 }));

    render(<App initialPath="/login" />);
    await userEvent.type(screen.getByLabelText("电子邮箱"), "li@example.com");
    await userEvent.type(screen.getByLabelText("密码"), "incorrect1");
    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("邮箱或密码不正确，请重试。");
    expect(screen.queryByText("Email or password is incorrect.")).not.toBeInTheDocument();
  });

  it("shows a localized Chinese existing-account error", async () => {
    localStorage.setItem("nuogo-language", "zh");
    localStorage.setItem("nuogo-language-default", "en-v3");
    fetch.mockResolvedValueOnce(response({
      error: { code: "EMAIL_EXISTS", message: "An account already exists for this email." }
    }, { ok: false, status: 409 }));

    render(<App initialPath="/register" />);
    await userEvent.type(screen.getByLabelText("姓名"), "李明");
    await userEvent.type(screen.getByLabelText("电子邮箱"), "li@example.com");
    await userEvent.type(screen.getByLabelText("密码"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "创建账户" }));

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("该邮箱已注册，请直接登录或使用其他邮箱。");
    expect(screen.queryByText("An account already exists for this email."))
      .not.toBeInTheDocument();
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
