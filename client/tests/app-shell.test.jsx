import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../src/App.jsx";

const response = (body) => ({ ok: true, status: 200, json: async () => body });

describe("Nuogo application shell", () => {
  it("shows a friendly guest-mode label without exposing an internal account value", async () => {
    sessionStorage.setItem("nuogo-token", "guest-token");
    fetch.mockResolvedValueOnce(response({
      user: { id: "guest-1", name: "Nuogo Guest", accountType: "GUEST" }
    }));

    render(<App initialPath="/planner" />);

    expect(await screen.findByTestId("user-mode-badge")).toHaveTextContent("Guest Mode");
    expect(screen.queryByText("GUEST", { exact: true })).not.toBeInTheDocument();
  });

  it("uses the System Administrator label for an administrator", async () => {
    localStorage.setItem("nuogo-token", "admin-token");
    fetch.mockResolvedValueOnce(response({
      user: { id: "admin-1", name: "Ada", role: "admin", accountType: "REGISTERED" }
    }));

    render(<App initialPath="/planner" />);

    expect(await screen.findByTestId("user-mode-badge")).toHaveTextContent("System Administrator");
    expect(screen.queryByText("admin", { exact: true })).not.toBeInTheDocument();
  });
});
