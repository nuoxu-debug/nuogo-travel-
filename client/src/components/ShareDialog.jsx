import { Check, Copy, Link2, X } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function ShareDialog({ tripId, open, onClose }) {
  const { language } = useLanguage();
  const [permission, setPermission] = useState("view");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function createLink() {
    setBusy(true);
    try {
      const body = await apiRequest(`/trips/${tripId}/shares`, {
        method: "POST",
        body: JSON.stringify({ permission })
      });
      setUrl(body.url);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    await navigator.clipboard?.writeText(url);
    setCopied(true);
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/70 p-4" role="dialog" aria-modal="true" aria-label="Share trip">
      <section className="w-full max-w-lg bg-white p-6">
        <div className="flex items-center justify-between">
          <div><p className="text-xs font-bold uppercase text-jade">Nuogo together</p><h2 className="mt-2 font-display text-2xl font-bold">{language === "zh" ? "分享行程" : "Share this trip"}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close share dialog" className="grid h-10 w-10 place-items-center"><X /></button>
        </div>
        <p className="mt-4 text-sm leading-6 text-ink/60">{language === "zh" ? "选择旅伴可拥有的权限，然后生成唯一链接。" : "Choose what travel partners can do, then generate a unique link."}</p>
        <fieldset className="mt-5 grid grid-cols-2 gap-2">
          <legend className="sr-only">Share permission</legend>
          <label className={`cursor-pointer border p-4 ${permission === "view" ? "border-jade bg-emerald-50" : "border-ink/10"}`}>
            <input type="radio" className="mr-2 accent-jade" name="permission" checked={permission === "view"} onChange={() => setPermission("view")} />
            <b>{language === "zh" ? "仅查看" : "View only"}</b>
          </label>
          <label className={`cursor-pointer border p-4 ${permission === "edit" ? "border-vermilion bg-red-50" : "border-ink/10"}`}>
            <input aria-label="Can edit" type="radio" className="mr-2 accent-vermilion" name="permission" checked={permission === "edit"} onChange={() => setPermission("edit")} />
            <b>{language === "zh" ? "可编辑与投票" : "Can edit & vote"}</b>
          </label>
        </fieldset>
        {!url ? (
          <button disabled={busy} type="button" onClick={createLink} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 bg-ink font-bold text-white">
            <Link2 className="h-4 w-4" /> {busy ? "..." : (language === "zh" ? "创建链接" : "Create link")}
          </button>
        ) : (
          <div className="mt-5 flex border border-ink/15">
            <input readOnly value={url} aria-label="Share URL" className="min-w-0 flex-1 bg-mist px-3 text-sm" />
            <button type="button" onClick={copy} aria-label="Copy share link" className="grid h-12 w-12 place-items-center bg-ink text-white">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
