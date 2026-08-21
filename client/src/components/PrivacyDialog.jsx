import { ShieldCheck, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function PrivacyDialog({ open, onClose }) {
  const { language } = useLanguage();
  const zh = language === "zh";
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center bg-ink/45 p-4" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={zh ? "隐私与 AI 设置" : "Privacy and AI settings"}
        className="w-full max-w-lg rounded-lg bg-paper p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-jade/10 text-jade">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold">{zh ? "隐私与 AI" : "Privacy and AI"}</h2>
              <p className="mt-1 text-sm leading-6 text-ink/60">{zh ? "你的授权决定 Nuogo 如何准备行程。" : "Your consent controls how Nuogo prepares a trip."}</p>
            </div>
          </div>
          <button type="button" aria-label={zh ? "关闭隐私设置" : "Close privacy settings"} onClick={onClose} className="grid h-11 w-11 place-items-center rounded-lg text-ink/55 hover:bg-ink/5 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 border-y border-ink/10 py-5 text-sm leading-6 text-ink/70">
          <p>{zh ? "只有在你请求生成或重新验证行程时，Nuogo 才会把你提交的旅行偏好发送给已配置的 AI 服务商。" : "Nuogo sends the travel preferences you submit to the configured AI provider only when you request generation or revalidation."}</p>
          <p className="mt-3">{zh ? "账户凭据、协作邀请和已保存的费用结算不会包含在行程提示词中。" : "Account credentials, collaboration invitations, and saved expense settlements are excluded from itinerary prompts."}</p>
        </div>
        <button type="button" onClick={onClose} className="mt-5 min-h-11 w-full rounded-lg bg-ink px-4 text-sm font-bold text-white">{zh ? "完成" : "Done"}</button>
      </section>
    </div>
  );
}
