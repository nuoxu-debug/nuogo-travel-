import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ExpenseWorkspace from "../src/components/ExpenseWorkspace.jsx";
import { AuthProvider } from "../src/context/AuthContext.jsx";
import { LanguageProvider } from "../src/context/LanguageContext.jsx";
import {
  demoExpenses,
  demoExpenseSummary,
  demoMembers
} from "./fixtures.js";

const accessByRole = {
  owner: { role: "owner", canEdit: true, isOwner: true },
  editor: { role: "editor", canEdit: true, isOwner: false },
  viewer: { role: "viewer", canEdit: false, isOwner: false }
};

function response(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

function renderExpenseWorkspace({
  role = "owner",
  language = "en",
  expenses = demoExpenses(),
  summary = demoExpenseSummary(),
  mutation
} = {}) {
  const members = demoMembers();
  const currentMember = members.find((member) => member.role === role);
  localStorage.setItem("nuogo-language", language);
  localStorage.setItem("nuogo-token", `${role}-token`);

  fetch.mockImplementation(async (url, options = {}) => {
    if (url.endsWith("/auth/me")) {
      return response({
        user: {
          id: currentMember.userId,
          name: currentMember.name,
          email: `${currentMember.userId}@nuogo.test`
        }
      });
    }
    if (url.endsWith("/trips/trip-1/expenses") && !options.method) {
      return response({ expenses });
    }
    if (url.endsWith("/trips/trip-1/expense-summary") && !options.method) {
      return response(summary);
    }
    if (mutation) return mutation(url, options);
    throw new Error(`Unexpected request: ${url}`);
  });

  return render(
    <LanguageProvider>
      <AuthProvider>
        <ExpenseWorkspace
          tripId="trip-1"
          access={accessByRole[role]}
          members={members}
          plannedBudget={{
            total: 1200,
            limit: 4800,
            remaining: 3600,
            overBudget: false,
            categories: {
              scenicTickets: 120,
              localFood: 260,
              transportation: 180,
              accommodation: 640
            }
          }}
          onCheaper={vi.fn()}
          cheaperDisabled={false}
        />
      </AuthProvider>
    </LanguageProvider>
  );
}

async function openGroupExpenses(options) {
  renderExpenseWorkspace(options);
  await userEvent.click(screen.getByRole("tab", { name: "Group expenses" }));
  await screen.findByText("Actual spending");
}

describe("group expense workspace", () => {
  it("keeps the planned itinerary budget as the initial tab", () => {
    renderExpenseWorkspace();

    expect(screen.getByRole("tab", { name: "Planned budget" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByText("Current plan cost")).toBeInTheDocument();
    expect(screen.queryByText("Hongcun lunch")).not.toBeInTheDocument();
  });

  it("loads a dense actual-expense ledger and summary without replacing the plan budget", async () => {
    await openGroupExpenses();

    expect(screen.getAllByText("¥390.00")).toHaveLength(2);
    expect(screen.getByText("Hongcun lunch")).toBeInTheDocument();
    expect(screen.getByText("Station transfer")).toBeInTheDocument();
    expect(screen.getByText("Actual spending")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Planned budget" }));
    expect(screen.getByText("Current plan cost")).toBeInTheDocument();
  });

  it("defaults every active member into an equal split and allows payer exclusion", async () => {
    await openGroupExpenses({ expenses: [], summary: { totalSpentFen: 0, members: [], settlements: [] } });
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));

    const dialog = screen.getByRole("dialog", { name: "Add expense" });
    await userEvent.clear(within(dialog).getByLabelText("Amount"));
    await userEvent.type(within(dialog).getByLabelText("Amount"), "300");

    expect(within(dialog).getByText("¥100.00 each")).toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", { name: "Chen Yu" })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Li Wei" })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Wang Min" })).toBeChecked();

    await userEvent.selectOptions(within(dialog).getByLabelText("Paid by"), "user-2");
    await userEvent.click(within(dialog).getByRole("checkbox", { name: "Li Wei" }));

    expect(within(dialog).getByLabelText("Paid by")).toHaveValue("user-2");
    expect(within(dialog).getByRole("checkbox", { name: "Li Wei" })).not.toBeChecked();
    expect(within(dialog).getByText("¥150.00 each")).toBeInTheDocument();
  });

  it("shows deterministic one-fen shares before saving", async () => {
    await openGroupExpenses({ expenses: [], summary: { totalSpentFen: 0, members: [], settlements: [] } });
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    const dialog = screen.getByRole("dialog", { name: "Add expense" });

    await userEvent.clear(within(dialog).getByLabelText("Amount"));
    await userEvent.type(within(dialog).getByLabelText("Amount"), "100");

    expect(within(dialog).getByText("Chen Yu · ¥33.34")).toBeInTheDocument();
    expect(within(dialog).getByText("Li Wei · ¥33.33")).toBeInTheDocument();
    expect(within(dialog).getByText("Wang Min · ¥33.33")).toBeInTheDocument();
  });

  it("validates a positive amount and at least one participant", async () => {
    await openGroupExpenses({ expenses: [], summary: { totalSpentFen: 0, members: [], settlements: [] } });
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    const dialog = screen.getByRole("dialog", { name: "Add expense" });

    await userEvent.type(within(dialog).getByLabelText("Description"), "Dinner");
    await userEvent.clear(within(dialog).getByLabelText("Amount"));
    await userEvent.type(within(dialog).getByLabelText("Amount"), "0");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save expense" }));
    expect(within(dialog).getByText("Enter an amount greater than ¥0.00.")).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText("Amount"), "120");
    for (const member of demoMembers()) {
      await userEvent.click(within(dialog).getByRole("checkbox", { name: member.name }));
    }
    await userEvent.click(within(dialog).getByRole("button", { name: "Save expense" }));
    expect(within(dialog).getByText("Select at least one traveller.")).toBeInTheDocument();
  });

  it("keeps viewers read-only and lets editors change only their own records", async () => {
    await openGroupExpenses({ role: "viewer" });
    expect(screen.queryByRole("button", { name: "Add expense" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Hongcun lunch" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Station transfer" })).not.toBeInTheDocument();

    cleanup();
    await openGroupExpenses({ role: "editor" });
    expect(screen.getByRole("button", { name: "Edit Station transfer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Station transfer" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Hongcun lunch" })).not.toBeInTheDocument();
  });

  it("renders member balances and English settlement instructions", async () => {
    await openGroupExpenses();

    const chenRow = screen.getByRole("row", { name: /Chen Yu/ });
    expect(within(chenRow).getByText("¥300.00")).toBeInTheDocument();
    expect(within(chenRow).getByText("¥130.00")).toBeInTheDocument();
    expect(within(chenRow).getByText("+¥170.00")).toBeInTheDocument();
    expect(screen.getByText("Wang Min pays Chen Yu ¥130.00")).toBeInTheDocument();
    expect(screen.getByText("Li Wei pays Chen Yu ¥40.00")).toBeInTheDocument();
  });

  it("renders complete Chinese expense and settlement copy", async () => {
    renderExpenseWorkspace({ language: "zh" });
    await userEvent.click(screen.getByRole("tab", { name: "多人费用" }));

    expect(await screen.findByText("实际支出")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加费用" })).toBeInTheDocument();
    expect(screen.getByText("Wang Min 向 Chen Yu 支付 ¥130.00")).toBeInTheDocument();
    expect(screen.queryByText("Actual spending")).not.toBeInTheDocument();
  });

  it("submits integer fen and the selected participant IDs", async () => {
    const createdExpense = demoExpenses()[0];
    await openGroupExpenses({
      expenses: [],
      summary: { totalSpentFen: 0, members: [], settlements: [] },
      mutation: async (url, options) => {
        if (url.endsWith("/trips/trip-1/expenses") && options.method === "POST") {
          return response({ expense: createdExpense }, { status: 201 });
        }
        throw new Error(`Unexpected request: ${url}`);
      }
    });
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    const dialog = screen.getByRole("dialog", { name: "Add expense" });
    await userEvent.type(within(dialog).getByLabelText("Description"), "Hongcun lunch");
    await userEvent.clear(within(dialog).getByLabelText("Amount"));
    await userEvent.type(within(dialog).getByLabelText("Amount"), "300.01");
    await userEvent.click(within(dialog).getByRole("checkbox", { name: "Wang Min" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save expense" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/trips/trip-1/expenses"),
      expect.objectContaining({
        method: "POST",
        body: expect.any(String)
      })
    ));
    const call = fetch.mock.calls.find(([, options]) => options?.method === "POST");
    expect(JSON.parse(call[1].body)).toMatchObject({
      description: "Hongcun lunch",
      amountFen: 30001,
      participantUserIds: ["user-1", "user-2"]
    });
  });

  it("contains keyboard focus and returns it to the add button after closing", async () => {
    await openGroupExpenses();
    const addButton = screen.getByRole("button", { name: "Add expense" });
    await userEvent.click(addButton);
    const dialog = screen.getByRole("dialog", { name: "Add expense" });
    const closeButton = within(dialog).getByRole("button", { name: "Close expense dialog" });

    expect(within(dialog).getByLabelText("Description")).toHaveFocus();
    closeButton.focus();
    await userEvent.tab();
    expect(within(dialog).getByLabelText("Description")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Add expense" })).not.toBeInTheDocument();
    expect(addButton).toHaveFocus();
  });
});
