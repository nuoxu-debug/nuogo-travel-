import { Check, Copy, Link2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiRequest } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function ShareDialog({ tripId, open, onClose }) {
  const { language, t } = useLanguage();
  const closeButtonRef = useRef(null);
  const [permission, setPermission] = useState("view");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    closeButtonRef.current?.focus();
    function keydown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [onClose, open]);

  if (!open) return null;

  async function createLink() {
    setBusy(true);
    setError("");
    try {
      const body = await apiRequest(`/trips/${tripId}/shares`, {
        method: "POST",
        body: JSON.stringify({ permission })
      });
      setUrl(body.url);
    } catch {
      setError(t("share.requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    await navigator.clipboard?.writeText(url);
    setCopied(true);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-ink/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="w-full max-w-lg rounded-lg bg-paper p-6 shadow-[0_24px_70px_rgba(29,29,31,.24)]"
        role="dialog"
        aria-modal="true"
        aria-label={t("share.dialogLabel")}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-lake/10 text-lake">
              <Link2 className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-extrabold">{t("share.title")}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t("share.close")}
            className="grid h-11 w-11 place-items-center rounded-lg text-ink/65 hover:bg-ink/5 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-4 max-w-[60ch] text-sm leading-6 text-ink/70">
          {t("share.body")}
        </p>
        <fieldset className="mt-5 grid grid-cols-2 rounded-lg bg-mist p-1">
          <legend className="sr-only">{t("share.permission")}</legend>
          <label className={`cursor-pointer rounded-md px-3 py-3 text-center text-sm font-bold transition-colors ${
            permission === "view" ? "bg-white text-ink shadow-sm" : "text-ink/65"
          }`}>
            <input
              type="radio"
              className="sr-only"
              name="permission"
              checked={permission === "view"}
              onChange={() => setPermission("view")}
            />
            {t("share.view")}
          </label>
          <label className={`cursor-pointer rounded-md px-3 py-3 text-center text-sm font-bold transition-colors ${
            permission === "edit" ? "bg-white text-ink shadow-sm" : "text-ink/65"
          }`}>
            <input
              aria-label={language === "zh" ? "可编辑公开链接" : "Can edit"}
              type="radio"
              className="sr-only"
              name="permission"
              checked={permission === "edit"}
              onChange={() => setPermission("edit")}
            />
            {t("share.edit")}
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </p>
        )}
        {!url ? (
          <button
            disabled={busy}
            type="button"
            onClick={createLink}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-wait disabled:opacity-60"
          >
            <Link2 className="h-4 w-4" />
            {busy ? t("common.loading") : t("share.create")}
          </button>
        ) : (
          <div className="mt-5 flex overflow-hidden rounded-lg border border-ink/15 bg-white">
            <input
              readOnly
              value={url}
              aria-label={t("share.url")}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-ink"
            />
            <button
              type="button"
              onClick={copy}
              aria-label={t("share.copy")}
              className="grid h-12 w-12 shrink-0 place-items-center bg-ink text-white"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        )}
      </section>
    </div>,
    document.body
  );
}
