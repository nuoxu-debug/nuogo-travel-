import { Calculator, Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useDialogFocus } from "../hooks/useDialogFocus.js";
import { formatFen } from "./SettlementList.jsx";

const categoryKeys = [
  "accommodation",
  "transportation",
  "food",
  "attractions",
  "entertainment",
  "other"
];

export function localCalendarDate(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseYuanToFen(value) {
  if (typeof value !== "string") return null;
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const fen = (BigInt(match[1]) * 100n)
    + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  if (fen <= 0n || fen > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(fen);
}

function formatFenInput(amountFen) {
  const yuan = Math.floor(amountFen / 100);
  const fen = amountFen % 100;
  return fen ? `${yuan}.${String(fen).padStart(2, "0")}` : String(yuan);
}

function eligibleMembers(expense, members) {
  const activeMembers = members.filter(({ status }) => status === "active");
  if (!expense) return activeMembers;

  const byId = new Map(activeMembers.map((member) => [member.userId, member]));
  const referenced = [
    {
      userId: expense.paidByUserId,
      name: expense.paidByName
    },
    ...expense.participants
  ];
  for (const member of referenced) {
    if (!byId.has(member.userId)) {
      byId.set(member.userId, {
        userId: member.userId,
        name: member.name,
        status: "removed"
      });
    }
  }
  return [...byId.values()];
}

export function splitFenEqually(amountFen, participantUserIds) {
  if (!Number.isInteger(amountFen) || amountFen <= 0 || !participantUserIds.length) {
    return [];
  }
  const sorted = [...new Set(participantUserIds)].sort();
  const base = Math.floor(amountFen / sorted.length);
  const remainder = amountFen % sorted.length;
  return sorted.map((userId, index) => ({
    userId,
    shareFen: base + (index < remainder ? 1 : 0)
  }));
}

function initialValues(expense, members, currentUserId) {
  const activeMembers = members.filter(({ status }) => status === "active");
  return {
    description: expense?.description ?? "",
    category: expense?.category ?? "food",
    amount: expense ? formatFenInput(expense.amountFen) : "",
    expenseDate: expense?.expenseDate ?? localCalendarDate(),
    paidByUserId: expense?.paidByUserId
      ?? activeMembers.find(({ userId }) => userId === currentUserId)?.userId
      ?? activeMembers[0]?.userId
      ?? "",
    participantUserIds: expense
      ? expense.participants.map(({ userId }) => userId)
      : activeMembers.map(({ userId }) => userId),
    note: expense?.note ?? ""
  };
}

export default function ExpenseDialog({
  expense,
  members,
  open,
  onClose,
  onSaved,
  currentUserId
}) {
  const { language, t } = useLanguage();
  const dialogRef = useRef(null);
  const descriptionRef = useRef(null);
  const amountRef = useRef(null);
  const dateRef = useRef(null);
  const payerRef = useRef(null);
  const participantsRef = useRef(null);
  const [values, setValues] = useState(() => initialValues(expense, members, currentUserId));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState("");
  const selectableMembers = useMemo(
    () => eligibleMembers(expense, members),
    [expense, members]
  );
  const parsedAmountFen = parseYuanToFen(values.amount);
  const amountFen = parsedAmountFen ?? 0;
  const shares = useMemo(
    () => splitFenEqually(amountFen, values.participantUserIds),
    [amountFen, values.participantUserIds]
  );
  const shareByUserId = useMemo(
    () => new Map(shares.map((share) => [share.userId, share.shareFen])),
    [shares]
  );
  const equalShare = shares.length && shares.every(({ shareFen }) => shareFen === shares[0].shareFen);

  useDialogFocus({
    open,
    containerRef: dialogRef,
    initialFocusRef: descriptionRef,
    onClose
  });

  useEffect(() => {
    if (!open) return;
    setValues(initialValues(expense, members, currentUserId));
    setErrors({});
    setRequestError("");
    setBusy(false);
  }, [currentUserId, expense, members, open]);

  if (!open) return null;

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function toggleParticipant(userId) {
    setValues((current) => ({
      ...current,
      participantUserIds: current.participantUserIds.includes(userId)
        ? current.participantUserIds.filter((id) => id !== userId)
        : [...current.participantUserIds, userId]
    }));
    setErrors((current) => ({ ...current, participants: "" }));
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!values.description.trim()) nextErrors.description = t("expenses.validation.description");
    if (
      !values.amount
      || /^(?:0|0\.0{1,2})$/.test(values.amount)
    ) {
      nextErrors.amount = t("expenses.validation.amount");
    } else if (parsedAmountFen === null) {
      nextErrors.amount = t("expenses.validation.amountFormat");
    } else if (amountFen > 5_000_000) {
      nextErrors.amount = t("expenses.validation.amountLimit");
    }
    if (!values.participantUserIds.length) {
      nextErrors.participants = t("expenses.validation.participants");
    }
    if (!values.paidByUserId) nextErrors.payer = t("expenses.validation.payer");
    if (!values.expenseDate) nextErrors.date = t("expenses.validation.date");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstInvalid = [
        ["description", descriptionRef],
        ["amount", amountRef],
        ["date", dateRef],
        ["payer", payerRef],
        ["participants", participantsRef]
      ].find(([field]) => nextErrors[field]);
      firstInvalid?.[1].current?.focus();
      return;
    }

    setBusy(true);
    setRequestError("");
    try {
      await onSaved({
        description: values.description.trim(),
        category: values.category,
        amountFen,
        expenseDate: values.expenseDate,
        paidByUserId: values.paidByUserId,
        participantUserIds: values.participantUserIds,
        note: values.note.trim()
      });
      onClose();
    } catch {
      setRequestError(t("expenses.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  const title = expense ? t("expenses.editExpense") : t("expenses.addExpense");

  return createPortal(
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-ink/60 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="expense-dialog max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-lg bg-paper shadow-[0_24px_70px_rgba(29,29,31,.24)]"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-bold text-emerald-800">{t("expenses.equalSplit")}</p>
            <h2 className="truncate text-xl font-extrabold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={t("expenses.closeDialog")}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={submit} noValidate>
          <div className="expense-dialog-grid grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">
              {t("expenses.description")}
              <input
                ref={descriptionRef}
                value={values.description}
                onChange={(event) => setField("description", event.target.value)}
                maxLength={120}
                className="field-control"
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "expense-description-error" : undefined}
              />
              {errors.description && (
                <span id="expense-description-error" className="text-xs font-semibold text-red-700">
                  {errors.description}
                </span>
              )}
            </label>

            <label className="grid gap-1.5 text-sm font-bold">
              {t("expenses.category")}
              <select
                value={values.category}
                onChange={(event) => setField("category", event.target.value)}
                className="field-control"
              >
                {categoryKeys.map((category) => (
                  <option key={category} value={category}>
                    {t(`expenses.categories.${category}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-bold">
              {t("expenses.amount")}
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-bold text-ink/65">
                  ¥
                </span>
                <input
                  aria-label={t("expenses.amount")}
                  ref={amountRef}
                  type="text"
                  inputMode="decimal"
                  value={values.amount}
                  onChange={(event) => setField("amount", event.target.value)}
                  className="field-control pl-8 tabular-nums"
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby={errors.amount ? "expense-amount-error" : undefined}
                />
              </div>
              {errors.amount && (
                <span id="expense-amount-error" className="text-xs font-semibold text-red-700">
                  {errors.amount}
                </span>
              )}
            </label>

            <label className="grid gap-1.5 text-sm font-bold">
              {t("expenses.date")}
              <input
                ref={dateRef}
                type="date"
                value={values.expenseDate}
                onChange={(event) => setField("expenseDate", event.target.value)}
                className="field-control"
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "expense-date-error" : undefined}
              />
              {errors.date && (
                <span id="expense-date-error" className="text-xs font-semibold text-red-700">
                  {errors.date}
                </span>
              )}
            </label>

            <label className="grid gap-1.5 text-sm font-bold">
              {t("expenses.paidBy")}
              <select
                ref={payerRef}
                value={values.paidByUserId}
                onChange={(event) => setField("paidByUserId", event.target.value)}
                className="field-control"
                aria-invalid={Boolean(errors.payer)}
                aria-describedby={errors.payer ? "expense-payer-error" : undefined}
              >
                <option value="">{t("expenses.selectPayer")}</option>
                {selectableMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                    {member.status === "removed"
                      ? ` (${t("expenses.formerMember")})`
                      : ""}
                  </option>
                ))}
              </select>
              {errors.payer && (
                <span id="expense-payer-error" className="text-xs font-semibold text-red-700">
                  {errors.payer}
                </span>
              )}
            </label>

            <fieldset
              ref={participantsRef}
              tabIndex={-1}
              aria-invalid={Boolean(errors.participants)}
              aria-describedby={errors.participants ? "expense-participants-error" : undefined}
              className="sm:col-span-2"
            >
              <legend className="text-sm font-bold">{t("expenses.splitBetween")}</legend>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="mt-0.5 text-xs text-ink/65">{t("expenses.exclusionHint")}</p>
                </div>
                {shares.length > 0 && equalShare && (
                  <strong className="text-sm tabular-nums text-emerald-800">
                    {t("expenses.each").replace(
                      "{amount}",
                      formatFen(shares[0].shareFen, language)
                    )}
                  </strong>
                )}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {selectableMembers.map((member) => {
                  const checked = values.participantUserIds.includes(member.userId);
                  const formerLabel = member.status === "removed"
                    ? t("expenses.formerMember")
                    : "";
                  return (
                    <label
                      key={member.userId}
                      className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                        checked
                          ? "border-jade/35 bg-jade/[0.07] text-ink"
                          : "border-ink/12 bg-white text-ink/70"
                      }`}
                    >
                      <input
                        aria-label={formerLabel
                          ? `${member.name}, ${formerLabel}`
                          : member.name}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleParticipant(member.userId)}
                        className="h-4 w-4 accent-jade"
                      />
                      <span className="min-w-0">
                        <span className="block truncate">{member.name}</span>
                        {formerLabel && (
                          <span className="block text-[11px] font-semibold text-amber-800">
                            {formerLabel}
                          </span>
                        )}
                        {checked && shares.length > 0 && !equalShare && (
                          <span className="block text-[11px] font-semibold text-emerald-800">
                            {member.name} · {formatFen(shareByUserId.get(member.userId), language)}
                          </span>
                        )}
                      </span>
                      {checked && <Check className="ml-auto h-4 w-4 shrink-0 text-jade" />}
                    </label>
                  );
                })}
              </div>
              {errors.participants && (
                <p
                  id="expense-participants-error"
                  className="mt-2 text-xs font-semibold text-red-700"
                >
                  {errors.participants}
                </p>
              )}
            </fieldset>

            <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">
              {t("expenses.note")}
              <textarea
                value={values.note}
                onChange={(event) => setField("note", event.target.value)}
                maxLength={500}
                rows={2}
                className="min-h-20 rounded-lg border border-ink/15 bg-white px-3 py-2.5 font-normal outline-none transition-colors focus:border-lake"
              />
            </label>

            {shares.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-lake/[0.06] px-3 py-2.5 text-xs leading-5 text-ink/75 sm:col-span-2">
                <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-lake" />
                <span>{t("expenses.previewHint")}</span>
              </div>
            )}

            {requestError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800 sm:col-span-2">
                {requestError}
              </p>
            )}
          </div>

          <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur-xl sm:px-5">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="min-h-11 rounded-lg px-4 text-sm font-bold text-ink/70 hover:bg-ink/5 disabled:opacity-40"
            >
              {t("expenses.cancel")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-lg bg-ink px-5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-wait disabled:opacity-50"
            >
              {busy ? t("expenses.saving") : t("expenses.save")}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body
  );
}
