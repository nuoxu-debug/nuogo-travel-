import { describe, expect, it } from "vitest";
import { apiRequest } from "../src/api/client.js";

describe("apiRequest authentication handling", () => {
  it.each(["/auth/login", "/auth/register"])("preserves an existing session and unsaved preview when %s rejects credentials", async (path) => {
    localStorage.setItem("nuogo-token", "current-session");
    sessionStorage.setItem("nuogo-trip-preview", JSON.stringify({ id: "preview", persistenceScope: "PREVIEW" }));
    sessionStorage.setItem("nuogo-preview-result-preview", "preview-result");
    sessionStorage.setItem("nuogo-preview-token-preview", "preview-signature");
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials." } })
    });

    await expect(apiRequest(path, { method: "POST", body: "{}" })).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(localStorage.getItem("nuogo-token")).toBe("current-session");
    expect(sessionStorage.getItem("nuogo-trip-preview")).toContain("PREVIEW");
    expect(sessionStorage.getItem("nuogo-preview-result-preview")).toBe("preview-result");
    expect(sessionStorage.getItem("nuogo-preview-token-preview")).toBe("preview-signature");
  });

  it("sends the stored bearer token", async () => {
    localStorage.setItem("nuogo-token", "stored-token");
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true })
    });

    await apiRequest("/trips");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/trips"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer stored-token"
        })
      })
    );
  });

  it("does not clear a newer account session when an older request returns 401", async () => {
    localStorage.setItem("nuogo-token", "old-session");
    let finish;
    fetch.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const pending = apiRequest("/trips");
    localStorage.setItem("nuogo-token", "new-session");
    finish({ ok: false, status: 401, json: async () => ({ error: { code: "AUTH_TOKEN_EXPIRED" } }) });
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem("nuogo-token")).toBe("new-session");
  });

  it("clears every Nuogo private cache while preserving locale when a token expires", async () => {
    localStorage.setItem("nuogo-token", "expired-token");
    localStorage.setItem("nuogo-language", "zh");
    localStorage.setItem("nuogo-language-default", "zh-v4");
    localStorage.setItem("nuogo-account-summary", "private account");
    sessionStorage.setItem("nuogo-trip-trip-1", "private trip");
    sessionStorage.setItem("nuogo-reused-preferences", "private preferences");
    sessionStorage.setItem("nuogo-account-summary", "private account");
    sessionStorage.setItem("unrelated-session-value", "keep");
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: "AUTH_TOKEN_EXPIRED", message: "Expired token." }
      })
    });

    await expect(apiRequest("/trips")).rejects.toMatchObject({
      code: "AUTH_TOKEN_EXPIRED",
      status: 401
    });
    expect(localStorage.getItem("nuogo-token")).toBeNull();
    expect(localStorage.getItem("nuogo-account-summary")).toBeNull();
    expect(localStorage.getItem("nuogo-language")).toBe("zh");
    expect(localStorage.getItem("nuogo-language-default")).toBe("zh-v4");
    expect(sessionStorage.getItem("nuogo-trip-trip-1")).toBeNull();
    expect(sessionStorage.getItem("nuogo-reused-preferences")).toBeNull();
    expect(sessionStorage.getItem("nuogo-account-summary")).toBeNull();
    expect(sessionStorage.getItem("unrelated-session-value")).toBe("keep");
  });

  it("keeps a valid stored credential when the API reports a safe server failure", async () => {
    localStorage.setItem("nuogo-token", "valid-token");
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } })
    });

    await expect(apiRequest("/profile")).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500
    });
    expect(localStorage.getItem("nuogo-token")).toBe("valid-token");
  });
});
