import {
  AlertCircle,
  Check,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Trash2,
  UsersRound,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import BudgetPanel from "./BudgetPanel.jsx";
import ExpenseDialog from "./ExpenseDialog.jsx";
import SettlementList, { formatFen } from "./SettlementList.jsx";

function signedFen(amountFen, language) {
  if (!amountFen) return formatFen(0, language);
  return `${amountFen > 0 ? "+" : "-"}${formatFen(Math.abs(amountFen), language)}`;
}

export default function ExpenseWorkspace({
  tripId,
  access,
  members,
  plannedBudget,
  onCheaper,
  cheaperDisabled
}) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const addButtonRef = useRef(null);
  const [tab, setTab] = useState("planned");
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    totalSpentFen: 0,
    members: [],
    settlements: []
  });
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogExpense, setDialogExpense] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const canCreate = Boolean(
    access?.canEdit && members.some(({ status }) => status === "active")
  );
  const showGroupExpenses = Boolean(access);

  const loadGroupData = useCallback(async () => {
    if (!tripId || !showGroupExpenses) return;
    setLoading(true);
    setError("");
    try {
      const [expenseBody, summaryBody] = await Promise.all([
        apiRequest(`/trips/${tripId}/expenses`),
        apiRequest(`/trips/${tripId}/expense-summary`)
      ]);
      setExpenses(expenseBody.expenses ?? []);
      setSummary({
        totalSpentFen: summaryBody.totalSpentFen ?? 0,
        members: summaryBody.members ?? [],
        settlements: summaryBody.settlements ?? []
      });
      setLoaded(true);
    } catch {
      setError(t("expenses.loadFailed"));
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [showGroupExpenses, t, tripId]);

  useEffect(() => {
    setTab("planned");
    setExpenses([]);
    setSummary({ totalSpentFen: 0, members: [], settlements: [] });
    setLoaded(false);
    setError("");
  }, [tripId]);

  useEffect(() => {
    if (tab === "group" && !loaded && !loading) loadGroupData();
  }, [loadGroupData, loaded, loading, tab]);

  const currentBalance = useMemo(
    () => summary.members.find(({ userId }) => userId === user?.id) ?? {
      paidFen: 0,
      shareFen: 0,
      netFen: 0
    },
    [summary.members, user?.id]
  );

  function canChange(expense) {
    if (!access?.canEdit || !user?.id) return false;
    return access.isOwner || expense.createdByUserId === user.id;
  }

  function openCreate() {
    setDialogExpense(null);
    setDialogOpen(true);
  }

  function openEdit(expense) {
    setDialogExpense(expense);
    setDialogOpen(true);
  }

  async function saveExpense(input) {
    const editing = Boolean(dialogExpense);
    await apiRequest(
      editing
        ? `/trips/${tripId}/expenses/${dialogExpense.id}`
        : `/trips/${tripId}/expenses`,
      {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(input)
      }
    );
    await loadGroupData();
  }

  async function deleteExpense(expense) {
    setDeletingId(expense.id);
    setError("");
    try {
      await apiRequest(`/trips/${tripId}/expenses/${expense.id}`, {
        method: "DELETE"
      });
      setConfirmDeleteId("");
      await loadGroupData();
    } catch {
      setError(t("expenses.deleteFailed"));
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-ink/10 bg-white/82 shadow-panel backdrop-blur-2xl">
      <div
        role="tablist"
        aria-label={t("expenses.workspace")}
        className="grid grid-cols-2 border-b border-ink/10 bg-ink/[0.025] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "planned"}
          onClick={() => setTab("planned")}
          className={`min-h-11 rounded-md px-2 text-sm font-extrabold transition-colors ${
            tab === "planned"
              ? "bg-white text-ink shadow-sm"
              : "text-ink/65 hover:bg-white/55 hover:text-ink"
          }`}
        >
          {t("expenses.plannedBudget")}
        </button>
        {showGroupExpenses && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === "group"}
            onClick={() => setTab("group")}
            className={`min-h-11 rounded-md px-2 text-sm font-extrabold transition-colors ${
              tab === "group"
                ? "bg-white text-ink shadow-sm"
                : "text-ink/65 hover:bg-white/55 hover:text-ink"
            }`}
          >
            {t("expenses.groupExpenses")}
          </button>
        )}
      </div>

      {tab === "planned" ? (
        <div className="[&>section]:rounded-none [&>section]:border-0 [&>section]:bg-transparent [&>section]:shadow-none">
          <BudgetPanel
            budget={plannedBudget}
            onCheaper={onCheaper}
            disabled={cheaperDisabled}
          />
        </div>
      ) : (
        <div className="min-w-0">
          {loading && !loaded ? (
            <div aria-label={t("expenses.loading")} className="space-y-3 p-4">
              <div className="h-20 animate-pulse rounded-lg bg-ink/7" />
              <div className="h-14 animate-pulse rounded-lg bg-ink/7" />
              <div className="h-14 animate-pulse rounded-lg bg-ink/7" />
            </div>
          ) : error && !expenses.length && !summary.members.length ? (
            <div className="px-5 py-8 text-center">
              <AlertCircle className="mx-auto h-6 w-6 text-vermilion" />
              <p role="alert" className="mt-2 text-sm font-semibold text-ink/75">{error}</p>
              <button
                type="button"
                onClick={loadGroupData}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 px-4 text-sm font-bold hover:border-lake hover:text-lake"
              >
                <RefreshCw className="h-4 w-4" />
                {t("common.retry")}
              </button>
            </div>
          ) : (
            <>
              <div className="border-b border-ink/10 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-emerald-800">{t("expenses.actualSpending")}</p>
                    <strong className="mt-0.5 block text-2xl font-extrabold tabular-nums">
                      {formatFen(summary.totalSpentFen, language)}
                    </strong>
                  </div>
                  {canCreate && (
                    <button
                      ref={addButtonRef}
                      type="button"
                      onClick={openCreate}
                      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-ink px-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Plus className="h-4 w-4" />
                      {t("expenses.addExpense")}
                    </button>
                  )}
                </div>

                <dl className="expense-summary-band mt-4 grid grid-cols-2 divide-x divide-y divide-ink/8 border-y border-ink/8 sm:grid-cols-4 sm:divide-y-0">
                  <div className="py-2.5 pr-2 sm:pr-3">
                    <dt className="text-[11px] font-semibold text-ink/65">{t("expenses.totalActual")}</dt>
                    <dd className="mt-1 text-sm font-extrabold tabular-nums">
                      {formatFen(summary.totalSpentFen, language)}
                    </dd>
                  </div>
                  <div className="py-2.5 pl-3 sm:px-3">
                    <dt className="text-[11px] font-semibold text-ink/65">{t("expenses.youPaid")}</dt>
                    <dd className="mt-1 text-sm font-extrabold tabular-nums">
                      {formatFen(currentBalance.paidFen, language)}
                    </dd>
                  </div>
                  <div className="py-2.5 pr-2 sm:px-3">
                    <dt className="text-[11px] font-semibold text-ink/65">{t("expenses.yourShare")}</dt>
                    <dd className="mt-1 text-sm font-extrabold tabular-nums">
                      {formatFen(currentBalance.shareFen, language)}
                    </dd>
                  </div>
                  <div className="py-2.5 pl-3 sm:pl-3">
                    <dt className="text-[11px] font-semibold text-ink/65">{t("expenses.yourBalance")}</dt>
                    <dd className={`mt-1 text-sm font-extrabold tabular-nums ${
                      currentBalance.netFen > 0
                        ? "text-emerald-800"
                        : currentBalance.netFen < 0
                          ? "text-red-700"
                          : "text-ink"
                    }`}>
                      {signedFen(currentBalance.netFen, language)}
                    </dd>
                  </div>
                </dl>
              </div>

              {error && (
                <p role="alert" className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                  {error}
                </p>
              )}

              <div className="border-b border-ink/10">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <h3 className="text-sm font-extrabold">{t("expenses.ledger")}</h3>
                  <span className="text-xs font-semibold text-ink/65">
                    {t("expenses.recordCount").replace("{count}", expenses.length)}
                  </span>
                </div>
                {!expenses.length ? (
                  <div className="px-5 py-8 text-center">
                    <ReceiptText className="mx-auto h-6 w-6 text-ink/45" />
                    <p className="mt-2 text-sm font-bold">{t("expenses.empty")}</p>
                    <p className="mt-1 text-xs leading-5 text-ink/65">{t("expenses.emptyBody")}</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-ink/8">
                    {expenses.map((expense) => {
                      const editable = canChange(expense);
                      const confirming = confirmDeleteId === expense.id;
                      return (
                        <li key={expense.id} className="px-4 py-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/12 text-amber-800">
                              <ReceiptText className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-extrabold">{expense.description}</p>
                                  <p className="mt-0.5 truncate text-xs text-ink/65">
                                    {expense.expenseDate} · {t(`expenses.categories.${expense.category}`)}
                                  </p>
                                </div>
                                <strong className="shrink-0 text-sm tabular-nums">
                                  {formatFen(expense.amountFen, language)}
                                </strong>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/65">
                                <span>{t("expenses.paidByShort").replace("{name}", expense.paidByName)}</span>
                                <span className="inline-flex items-center gap-1">
                                  <UsersRound className="h-3.5 w-3.5" />
                                  {t("expenses.peopleCount").replace("{count}", expense.participants.length)}
                                </span>
                                {expense.note && <span className="truncate">{expense.note}</span>}
                              </div>
                            </div>
                          </div>

                          {editable && (
                            <div className="mt-2 flex justify-end gap-1">
                              {confirming ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId("")}
                                    aria-label={t("expenses.cancelDelete")}
                                    className="grid h-11 w-11 place-items-center rounded-lg text-ink/65 hover:bg-ink/5"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteExpense(expense)}
                                    disabled={deletingId === expense.id}
                                    aria-label={t("expenses.confirmDelete").replace("{description}", expense.description)}
                                    className="grid h-11 w-11 place-items-center rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEdit(expense)}
                                    aria-label={t("expenses.editNamed").replace("{description}", expense.description)}
                                    className="grid h-11 w-11 place-items-center rounded-lg text-ink/65 hover:bg-ink/5 hover:text-lake"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(expense.id)}
                                    aria-label={t("expenses.deleteNamed").replace("{description}", expense.description)}
                                    className="grid h-11 w-11 place-items-center rounded-lg text-ink/65 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <SettlementList summary={summary} currentUserId={user?.id} />
            </>
          )}
        </div>
      )}

      <ExpenseDialog
        expense={dialogExpense}
        members={members}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={saveExpense}
        currentUserId={user?.id}
      />
    </section>
  );
}
