import { describe, expect, it } from "vitest";
import { apiRequest } from "../src/api/client.js";

describe("apiRequest authentication handling", () => {
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
