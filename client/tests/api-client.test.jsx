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

  it("clears stored authentication when the API returns 401", async () => {
    localStorage.setItem("nuogo-token", "expired-token");
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: "UNAUTHORIZED", message: "Invalid token." } })
    });

    await expect(apiRequest("/trips")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401
    });
    expect(localStorage.getItem("nuogo-token")).toBeNull();
  });
});
