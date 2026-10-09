import { CloudRain, HelpCircle, Lightbulb, Train, Wallet, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function HelpModal({ isOpen, onClose }) {
  const { language } = useLanguage();
  const zh = language === "zh";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-ink/10 bg-white p-6 shadow-2xl transition-all sm:p-8">
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
            <HelpCircle className="h-5 w-5" />
          </span>
          <div>
            <h2 id="help-modal-title" className="font-display text-xl font-extrabold text-ink sm:text-2xl">
              {zh ? "新加坡旅行帮助与指南" : "Singapore Travel Guide & Help"}
            </h2>
            <p className="text-xs font-bold uppercase tracking-wider text-[#0284c7]">
              {zh ? "出行小贴士与规划解答" : "Tips and FAQs for your trip"}
            </p>
          </div>
        </div>

        <div className="mt-6 divide-y divide-ink/10">
          <div className="pb-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Lightbulb className="h-4 w-4 text-[#0284c7]" />
              {zh ? "如何生成第一份行程？" : "How to generate an itinerary?"}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-ink/70">
              {zh
                ? "请先注册或登录，然后进入“定制行程”页面，填写出发地、住宿区域、游玩日期、新币预算和旅行风格。系统会生成一份经过验证的试点行程。"
                : "Create an account or sign in first, then go to Plan a trip. Enter your departure point, stay area, dates, SGD budget and travel style to generate one validated pilot itinerary."}
            </p>
          </div>

          <div className="py-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Train className="h-4 w-4 text-[#0284c7]" />
              {zh ? "新加坡交通建议（MRT 地铁）" : "Singapore Public Transit (MRT)"}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-ink/70">
              {zh
                ? "新加坡地铁网络覆盖广，滨海湾、牛车水、乌节路、小印度和植物园等主要区域均可通过公共交通到达。"
                : "Singapore MRT connects nearly all key attractions, including Marina Bay, Chinatown, Orchard, Little India and the Botanic Gardens."}
            </p>
          </div>

          <div className="py-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Wallet className="h-4 w-4 text-[#0284c7]" />
              {zh ? "预算计算与新币（SGD）基准" : "Budget Baselines in SGD"}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-ink/70">
              {zh
                ? "Nuogo 以新币（SGD）作为当前试点预算单位。费用是规划估算，不是实时预订报价。"
                : "Nuogo uses SGD for the current pilot budget. Costs are planning estimates, not real-time booking quotations."}
            </p>
          </div>

          <div className="py-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <CloudRain className="h-4 w-4 text-[#0284c7]" />
              {zh ? "热带阵雨与雨天备选机制" : "Tropical Weather & Rainy Day Backups"}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-ink/70">
              {zh
                ? "雨天备选不会使用实时天气，也不会自动替换主行程。它会为合适的户外活动提供一个独立的室内或较不受天气影响的备选。"
                : "Rainy-day backup does not use live weather and does not automatically replace the main route. It adds an independent indoor or less weather-sensitive alternative where suitable."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#67e8f9] bg-[#d8f7ff] px-6 py-2.5 text-xs font-bold text-[#0891b2] transition-colors hover:bg-[#cffafe]"
          >
            {zh ? "知道了" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
