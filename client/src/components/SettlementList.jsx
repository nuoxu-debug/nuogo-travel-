import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";

export function formatFen(amountFen, language) {
  return new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en-CN", {
    style: "currency",
    currency: "CNY"
  }).format(Number(amountFen || 0) / 100).replace("CN¥", "¥");
}

function signedFen(amountFen, language) {
  if (amountFen === 0) return formatFen(0, language);
  return `${amountFen > 0 ? "+" : "-"}${formatFen(Math.abs(amountFen), language)}`;
}

export default function SettlementList({ summary, currentUserId }) {
  const { language, t } = useLanguage();
  const animate = useAnime();
  const rowsRef = useRef(null);

  useEffect(() => {
    const targets = rowsRef.current?.querySelectorAll("[data-balance-row]");
    if (!targets?.length) return;
    animate({
      targets,
      opacity: [0.45, 1],
      translateY: [4, 0],
      delay: (_element, index) => index * 28,
      duration: 220,
      easing: "easeOutExpo"
    });
  }, [animate, summary]);

  return (
    <div
      data-testid="expense-settlement-panel"
      className="expense-settlement-panel border-t border-ink/10"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h3 className="text-sm font-extrabold">{t("expenses.balances")}</h3>
        <span className="text-xs font-semibold text-ink/65">{t("expenses.balanceHint")}</span>
      </div>

      <div className="expense-balance-table">
        <table className="expense-balance-grid w-full table-fixed text-left text-xs">
          <thead className="border-y border-ink/8 bg-ink/[0.025] text-ink/65">
            <tr>
              <th className="w-[34%] px-3 py-2 font-bold">{t("expenses.traveller")}</th>
              <th className="px-2 py-2 text-right font-bold">{t("expenses.paid")}</th>
              <th className="px-2 py-2 text-right font-bold">{t("expenses.share")}</th>
              <th className="px-3 py-2 text-right font-bold">{t("expenses.net")}</th>
            </tr>
          </thead>
          <tbody ref={rowsRef} className="divide-y divide-ink/8">
            {summary.members.map((member) => (
              <tr
                key={member.userId}
                data-balance-row
                className={member.userId === currentUserId ? "bg-lake/[0.045]" : ""}
              >
                <th className="break-words px-3 py-3 text-sm font-bold">
                  {member.name}
                  {member.userId === currentUserId && (
                    <span className="ml-1 text-[11px] font-semibold text-blue-800">
                      {t("expenses.you")}
                    </span>
                  )}
                </th>
                <td
                  data-testid="balance-paid"
                  data-label={t("expenses.paid")}
                  className="px-2 py-3 text-right tabular-nums text-ink/75"
                >
                  {formatFen(member.paidFen, language)}
                </td>
                <td
                  data-testid="balance-share"
                  data-label={t("expenses.share")}
                  className="px-2 py-3 text-right tabular-nums text-ink/75"
                >
                  {formatFen(member.shareFen, language)}
                </td>
                <td
                  data-testid="balance-net"
                  data-label={t("expenses.net")}
                  className={`px-3 py-3 text-right font-extrabold tabular-nums ${
                  member.netFen > 0
                    ? "text-emerald-800"
                    : member.netFen < 0
                      ? "text-red-700"
                      : "text-ink/70"
                }`}
                >
                  {signedFen(member.netFen, language)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-ink/10 px-4 py-4">
        <h3 className="text-sm font-extrabold">{t("expenses.settleUp")}</h3>
        {!summary.settlements.length ? (
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{t("expenses.allSettled")}</span>
          </div>
        ) : (
          <ol className="mt-2 divide-y divide-ink/8">
            {summary.settlements.map((settlement) => {
              const instruction = t("expenses.settlementInstruction")
                .replace("{from}", settlement.fromName)
                .replace("{to}", settlement.toName)
                .replace("{amount}", formatFen(settlement.amountFen, language));
              return (
                <li
                  key={`${settlement.fromUserId}-${settlement.toUserId}-${settlement.amountFen}`}
                  aria-label={instruction}
                  className="flex min-w-0 items-center gap-2 py-2.5 text-sm"
                >
                  <span aria-hidden="true" className="contents">
                    <span className="truncate font-bold">{settlement.fromName}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink/50" />
                    <span className="truncate font-bold">{settlement.toName}</span>
                    <strong className="ml-auto shrink-0 tabular-nums text-red-700">
                      {formatFen(settlement.amountFen, language)}
                    </strong>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
