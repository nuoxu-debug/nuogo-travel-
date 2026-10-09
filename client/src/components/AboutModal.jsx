import { CheckCircle2, Compass, Shield, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function AboutModal({ isOpen, onClose }) {
  const { language } = useLanguage();
  const zh = language === "zh";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-ink/10 bg-white p-6 shadow-2xl transition-all sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label={zh ? "关闭" : "Close"}
          className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#d8f7ff] text-[#0284c7]">
            <Compass className="h-5 w-5" />
          </span>
          <div>
            <h2 id="about-modal-title" className="font-display text-xl font-extrabold text-ink sm:text-2xl">
              {zh ? "关于 Nuogo" : "About Nuogo"}
            </h2>
            <p className="text-xs font-bold uppercase tracking-wider text-[#0284c7]">
              {zh ? "AI 辅助行程与预算平台" : "AI-assisted itinerary and budget platform"}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink/75">
          {zh
            ? "Nuogo 是一个可扩展的 AI 辅助行程与预算规划平台。当前已验证的新加坡试点展示了系统如何结合目的地资料、偏好输入、预算检查与确定性约束规划。"
            : "Nuogo is an extensible AI-assisted itinerary and budget planning platform. The current validated Singapore pilot shows how destination data, traveller preferences, budget checks and deterministic constraints work together."}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-ink/8 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#0284c7]">
              <Sparkles className="h-4 w-4" />
              <span>{zh ? "真实景点数据" : "Grounded POIs"}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink/65">
              {zh
                ? "公共发现页面使用经过整理的新加坡地标与真实坐标，帮助用户先了解当前试点目的地。"
                : "Curated real Singapore landmarks and hawker centres with genuine coordinates support public destination discovery."}
            </p>
          </div>

          <div className="rounded-xl border border-ink/8 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#0284c7]">
              <CheckCircle2 className="h-4 w-4" />
              <span>{zh ? "硬预算验证" : "Hard Budget"}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink/65">
              {zh
                ? "注册用户生成行程时，系统会根据 SGD 预算、门票、交通与餐饮参考值检查总成本。"
                : "Registered planning checks tickets, transport and meals against SGD baselines so generated trips stay within budget."}
            </p>
          </div>

          <div className="rounded-xl border border-ink/8 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#0284c7]">
              <Shield className="h-4 w-4" />
              <span>{zh ? "访客与隐私" : "Guest & Privacy"}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink/65">
              {zh
                ? "访客可以浏览网站与公开目的地资料。提交偏好、生成行程和管理行程需要注册或登录。"
                : "Guests can browse public pages and destination information. Preference submission, generation and itinerary management require sign-in."}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-ink/15 px-5 py-2.5 text-xs font-bold text-ink/75 transition-colors hover:bg-ink/5"
          >
            {zh ? "了解了" : "Got it"}
          </button>
          <Link
            to="/planner"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-[#67e8f9] bg-[#d8f7ff] px-6 py-2.5 text-xs font-bold text-[#0891b2] shadow-sm transition-all hover:bg-[#cffafe] hover:shadow-md"
          >
            {zh ? "登录后定制我的行程 ->" : "Sign in to Plan ->"}
          </Link>
        </div>
      </div>
    </div>
  );
}
