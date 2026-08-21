import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  localCalendarDate,
  parseYuanToFen
} from "../src/components/ExpenseDialog.jsx";
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
  members = demoMembers(),
  request: requestOverride
} = {}) {
  const currentMember = members.find((member) => member.role === role);
  localStorage.setItem("nuogo-language", language);
  localStorage.setItem("nuogo-language-default", "zh-v4");
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
    const overridden = requestOverride?.(url, options);
    if (overridden !== undefined) return overridden;
    if (url.endsWith("/trips/trip-1/expenses") && !options.method) {
      return response({ expenses });
    }
    if (url.endsWith("/trips/trip-1/expense-summary") && !options.method) {
      return response(summary);
    }
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
  await userEvent.click(screen.getByRole("button", { name: "Group expenses" }));
  await screen.findByText("Actual spending");
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

describe("group expense workspace", () => {
  it("keeps the planned itinerary budget as the initial tab", () => {
    renderExpenseWorkspace();

    expect(screen.getByRole("button", { name: "Planned budget" })).toHaveAttribute(
      "aria-pressed",
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

    await userEvent.click(screen.getByRole("button", { name: "Planned budget" }));
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
    expect(screen.getByRole("listitem", { name: "Wang Min pays Chen Yu ¥130.00" }))
      .toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Li Wei pays Chen Yu ¥40.00" }))
      .toBeInTheDocument();
  });

  it("renders complete Chinese expense and settlement copy", async () => {
    renderExpenseWorkspace({ language: "zh" });
    await userEvent.click(screen.getByRole("button", { name: "多人费用" }));

    expect(await screen.findByText("实际支出")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加费用" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Wang Min 向 Chen Yu 支付 ¥130.00" }))
      .toBeInTheDocument();
    expect(screen.queryByText("Actual spending")).not.toBeInTheDocument();
  });

  it("submits integer fen and the selected participant IDs", async () => {
    const createdExpense = demoExpenses()[0];
    await openGroupExpenses({
      expenses: [],
      summary: { totalSpentFen: 0, members: [], settlements: [] },
      request: (url, options) => {
        if (url.endsWith("/trips/trip-1/expenses") && options.method === "POST") {
          return response({ expense: createdExpense }, { status: 201 });
        }
        return undefined;
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

  it("preserves existing former members when editing a historical expense", async () => {
    const formerExpense = {
      ...demoExpenses()[0],
      id: "expense-former",
      paidByUserId: "user-former",
      paidByName: "Zhao Qian",
      participants: [
        { userId: "user-1", name: "Chen Yu", shareFen: 15000 },
        { userId: "user-former", name: "Zhao Qian", shareFen: 15000 }
      ]
    };

    await openGroupExpenses({
      expenses: [formerExpense],
      summary: demoExpenseSummary(),
      request: (url, options) => {
        if (url.endsWith("/expenses/expense-former") && options.method === "PATCH") {
          return response({ expense: formerExpense });
        }
        return undefined;
      }
    });
    await userEvent.click(screen.getByRole("button", { name: "Edit Hongcun lunch" }));

    const dialog = screen.getByRole("dialog", { name: "Edit expense" });
    expect(within(dialog).getByRole("option", { name: "Zhao Qian (former member)" }))
      .toBeInTheDocument();
    expect(within(dialog).getByRole("checkbox", {
      name: "Zhao Qian, former member"
    })).toBeChecked();
    expect(within(dialog).getByLabelText("Paid by")).toHaveValue("user-former");

    await userEvent.click(within(dialog).getByRole("button", { name: "Save expense" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Edit expense" }))
      .not.toBeInTheDocument());
    const patch = fetch.mock.calls.find(([, options]) => options?.method === "PATCH");
    expect(JSON.parse(patch[1].body)).toMatchObject({
      paidByUserId: "user-former",
      participantUserIds: ["user-1", "user-former"]
    });
  });

  it.each([
    ["0", null],
    ["0.009", null],
    ["1.005", null],
    ["-1", null],
    ["1e3", null],
    ["NaN", null],
    ["0.01", 1],
    ["1", 100],
    ["1.5", 150],
    ["300.01", 30001]
  ])("parses strict yuan input %s without floating point drift", (input, expected) => {
    expect(parseYuanToFen(input)).toBe(expected);
  });

  it("uses the local calendar date at a timezone boundary", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 7, 10, 0, 30, 0));
      expect(localCalendarDate()).toBe("2026-08-10");
    } finally {
      vi.useRealTimers();
    }
  });

  it("associates every validation error and focuses the first invalid field", async () => {
    await openGroupExpenses({
      expenses: [],
      summary: { totalSpentFen: 0, members: [], settlements: [] }
    });
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    const dialog = screen.getByRole("dialog", { name: "Add expense" });
    const description = within(dialog).getByLabelText("Description");
    const amount = within(dialog).getByLabelText("Amount");
    const date = within(dialog).getByLabelText("Date");
    const payer = within(dialog).getByLabelText("Paid by");

    fireEvent.change(amount, { target: { value: "1.005" } });
    fireEvent.change(date, { target: { value: "" } });
    fireEvent.change(payer, { target: { value: "" } });
    for (const member of demoMembers()) {
      await userEvent.click(within(dialog).getByRole("checkbox", { name: member.name }));
    }
    await userEvent.click(within(dialog).getByRole("button", { name: "Save expense" }));

    expect(description).toHaveFocus();
    for (const control of [description, amount, date, payer]) {
      expect(control).toHaveAttribute("aria-invalid", "true");
      expect(control).toHaveAttribute("aria-describedby");
      expect(document.getElementById(control.getAttribute("aria-describedby")))
        .toBeInTheDocument();
    }
    const participants = within(dialog).getByRole("group", { name: "Split between" });
    expect(participants).toHaveAttribute("aria-invalid", "true");
    expect(participants).toHaveAttribute("aria-describedby");
  });

  it("keeps the latest manual refresh when overlapping responses finish out of order", async () => {
    const staleExpenses = deferred();
    const staleSummary = deferred();
    const signals = [];
    let expenseReads = 0;
    let summaryReads = 0;
    const newestExpense = {
      ...demoExpenses()[0],
      description: "Newest receipt"
    };

    await openGroupExpenses({
      request: (url, options) => {
        if (url.endsWith("/trips/trip-1/expenses") && !options.method) {
          expenseReads += 1;
          if (expenseReads === 2) {
            signals.push(options.signal);
            return staleExpenses.promise;
          }
          if (expenseReads === 3) return response({ expenses: [newestExpense] });
        }
        if (url.endsWith("/trips/trip-1/expense-summary") && !options.method) {
          summaryReads += 1;
          if (summaryReads === 2) return staleSummary.promise;
          if (summaryReads === 3) return response(demoExpenseSummary());
        }
        return undefined;
      }
    });

    const refresh = screen.getByRole("button", { name: "Refresh group expenses" });
    await userEvent.click(refresh);
    await waitFor(() => expect(expenseReads).toBe(2));
    await userEvent.click(refresh);
    expect(await screen.findByText("Newest receipt")).toBeInTheDocument();
    expect(signals[0].aborted).toBe(true);

    staleExpenses.resolve(response({ expenses: demoExpenses() }));
    staleSummary.resolve(response(demoExpenseSummary()));
    await act(async () => {});
    expect(screen.getByText("Newest receipt")).toBeInTheDocument();
    expect(screen.queryByText("Station transfer")).not.toBeInTheDocument();
  });

  it("polls visible group expenses every 20 seconds and stops outside the group mode", async () => {
    const originalVisibility = Object.getOwnPropertyDescriptor(document, "visibilityState");
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let expenseReads = 0;
      const view = renderExpenseWorkspace({
        request: (url, options) => {
          if (url.endsWith("/trips/trip-1/expenses") && !options.method) {
            expenseReads += 1;
          }
          return undefined;
        }
      });
      fireEvent.click(screen.getByRole("button", { name: "Group expenses" }));
      await act(async () => {});
      expect(expenseReads).toBe(1);

      await act(async () => {
        vi.advanceTimersByTime(20_000);
      });
      expect(expenseReads).toBe(2);

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden"
      });
      await act(async () => {
        vi.advanceTimersByTime(20_000);
      });
      expect(expenseReads).toBe(2);

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible"
      });
      fireEvent.click(screen.getByRole("button", { name: "Planned budget" }));
      await act(async () => {
        vi.advanceTimersByTime(40_000);
      });
      expect(expenseReads).toBe(2);

      fireEvent.click(screen.getByRole("button", { name: "Group expenses" }));
      view.unmount();
      await act(async () => {
        vi.advanceTimersByTime(40_000);
      });
      expect(expenseReads).toBe(2);
    } finally {
      vi.useRealTimers();
      if (originalVisibility) {
        Object.defineProperty(document, "visibilityState", originalVisibility);
      }
    }
  });

  it("starts a fresh load after an initial request is aborted by a mode switch", async () => {
    const pendingExpenses = deferred();
    const pendingSummary = deferred();
    const signals = [];
    let expenseReads = 0;
    let summaryReads = 0;
    const freshExpense = {
      ...demoExpenses()[0],
      description: "Fresh group receipt"
    };

    renderExpenseWorkspace({
      request: (url, options) => {
        if (url.endsWith("/trips/trip-1/expenses") && !options.method) {
          expenseReads += 1;
          if (expenseReads === 1) {
            signals.push(options.signal);
            return pendingExpenses.promise;
          }
          return response({ expenses: [freshExpense] });
        }
        if (url.endsWith("/trips/trip-1/expense-summary") && !options.method) {
          summaryReads += 1;
          if (summaryReads === 1) return pendingSummary.promise;
          return response(demoExpenseSummary());
        }
        return undefined;
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Group expenses" }));
    await waitFor(() => expect(expenseReads).toBe(1));
    expect(screen.getByLabelText("Loading group expenses")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh group expenses" }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Planned budget" }));
    fireEvent.click(screen.getByRole("button", { name: "Group expenses" }));

    expect(await screen.findByText("Fresh group receipt")).toBeInTheDocument();
    expect(expenseReads).toBe(2);
    expect(summaryReads).toBe(2);
    expect(signals[0].aborted).toBe(true);
    expect(screen.getByRole("button", { name: "Refresh group expenses" }))
      .toBeInTheDocument();

    pendingExpenses.resolve(response({ expenses: demoExpenses() }));
    pendingSummary.resolve(response(demoExpenseSummary()));
    await act(async () => {});
    expect(screen.getByText("Fresh group receipt")).toBeInTheDocument();
  });

  it("keeps a successful create when its summary refresh fails", async () => {
    const createdExpense = demoExpenses()[0];
    let mutated = false;
    await openGroupExpenses({
      expenses: [],
      summary: { totalSpentFen: 0, members: [], settlements: [] },
      request: (url, options) => {
        if (url.endsWith("/trips/trip-1/expenses") && options.method === "POST") {
          mutated = true;
          return response({ expense: createdExpense }, { status: 201 });
        }
        if (mutated && !options.method && (
          url.endsWith("/trips/trip-1/expenses")
          || url.endsWith("/trips/trip-1/expense-summary")
        )) {
          return Promise.reject(new Error("refresh failed"));
        }
        return undefined;
      }
    });
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    const dialog = screen.getByRole("dialog", { name: "Add expense" });
    await userEvent.type(within(dialog).getByLabelText("Description"), "Hongcun lunch");
    await userEvent.type(within(dialog).getByLabelText("Amount"), "300");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save expense" }));

    expect(await screen.findByText("Hongcun lunch")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Add expense" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Expense saved, but totals may be out of date."
    );
    expect(screen.getByRole("button", { name: "Retry group expense refresh" }))
      .toBeInTheDocument();
  });

  it("applies PATCH locally when the follow-up refresh fails", async () => {
    let mutated = false;
    const updated = { ...demoExpenses()[0], description: "Corrected lunch" };
    await openGroupExpenses({
      request: (url, options) => {
        if (url.endsWith("/expenses/expense-lunch") && options.method === "PATCH") {
          mutated = true;
          return response({ expense: updated });
        }
        if (mutated && !options.method) return Promise.reject(new Error("refresh failed"));
        return undefined;
      }
    });
    await userEvent.click(screen.getByRole("button", { name: "Edit Hongcun lunch" }));
    const dialog = screen.getByRole("dialog", { name: "Edit expense" });
    const description = within(dialog).getByLabelText("Description");
    await userEvent.clear(description);
    await userEvent.type(description, "Corrected lunch");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save expense" }));

    expect(await screen.findByText("Corrected lunch")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Edit expense" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("totals may be out of date");
  });

  it("removes a deleted expense locally when the follow-up refresh fails", async () => {
    let mutated = false;
    await openGroupExpenses({
      request: (url, options) => {
        if (url.endsWith("/expenses/expense-lunch") && options.method === "DELETE") {
          mutated = true;
          return response({ deletedId: "expense-lunch" });
        }
        if (mutated && !options.method) return Promise.reject(new Error("refresh failed"));
        return undefined;
      }
    });
    await userEvent.click(screen.getByRole("button", { name: "Delete Hongcun lunch" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm delete Hongcun lunch" }));

    await waitFor(() => expect(screen.queryByText("Hongcun lunch")).not.toBeInTheDocument());
    expect(screen.getByText("Station transfer")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("totals may be out of date");
  });

  it("keeps complete money values and labelled balance fields on narrow layouts", async () => {
    const largeSummary = {
      totalSpentFen: 1234567890,
      members: [{
        userId: "user-1",
        name: "Chen Yu",
        paidFen: 1234567890,
        shareFen: 100,
        netFen: 1234567790
      }],
      settlements: []
    };
    await openGroupExpenses({ expenses: [], summary: largeSummary });

    const row = screen.getByRole("row", { name: /Chen Yu/ });
    for (const label of ["Paid", "Share", "Net"]) {
      expect(within(row).getByTestId(`balance-${label.toLowerCase()}`))
        .toHaveAttribute("data-label", label);
    }
    expect(within(row).getByText("¥12,345,678.90")).toBeVisible();
    expect(within(row).getByText("(you)")).toHaveClass("text-blue-800");
  });

  it("exposes a component-width responsive balance structure", async () => {
    await openGroupExpenses();

    const panel = screen.getByTestId("expense-settlement-panel");
    expect(panel).toHaveClass("expense-settlement-panel");
    expect(within(panel).getByRole("table")).toHaveClass("expense-balance-grid");
  });
});
