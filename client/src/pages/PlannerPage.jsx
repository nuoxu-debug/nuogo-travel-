import { Bot, Database, MapPin, Route, ShieldCheck, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import PipelineOverlay from "../components/PipelineOverlay.jsx";
import PlannerJourneyHorizon from "../components/PlannerJourneyHorizon.jsx";
import PreferenceForm, { initialPreferenceValues } from "../components/PreferenceForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import AppShell from "../layout/AppShell.jsx";
import { clearAttractionDraft, readAttractionDraft } from "../planning/attractionDraft.js";

function generationErrorMessage(error, language) {
  if (error.code === "GENERATION_CONSTRAINTS_UNSATISFIED") {
    return language === "zh"
      ? "无法在当前预算和旅行要求内生成有效行程。请调整预算、日期、必去景点或偏好后重试。"
      : "Nuogo could not create a valid itinerary within the current budget and travel requirements. Adjust the budget, dates, required sights, or preferences and try again.";
  }
  return error.message;
}

export default function PlannerPage() {
  const { language } = useLanguage();
  const { loginAsGuest, ready: authReady, user } = useAuth();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [generationState, setGenerationState] = useState("RETRIEVING");
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState(() => ({
    ...initialPreferenceValues,
    attractionDraft: readAttractionDraft()
  }));

  useEffect(() => {
    if (preferences.attractionDraft && preferences.attractionDraft.destination !== preferences.destination) {
      clearAttractionDraft();
      setPreferences((current) => ({ ...current, attractionDraft: null }));
    }
  }, [preferences.attractionDraft, preferences.destination]);

  async function generate(preferences) {
    setError("");
    setGenerating(true);
    setGenerationState("RETRIEVING");
    try {
      if (!user) await loginAsGuest();
      const result = await apiRequest("/trips/generate", {
        method: "POST",
        body: JSON.stringify(preferences)
      });
      setGenerationState(result.state);
      const trip = {
        ...result.trip,
        itineraryRun: result.itineraryRun,
        validation: result.validation,
        generationState: result.state,
        runId: result.id,
        objectiveAligned: true,
        revision: result.trip.revision ?? 0
      };
      sessionStorage.setItem(`nuogo-trip-${result.trip.id}`, JSON.stringify(trip));
      if (result.guestClaimToken) {
        sessionStorage.setItem(`nuogo-guest-claim-${result.trip.id}`, result.guestClaimToken);
      }
      navigate(`/trip/${result.trip.id}`);
    } catch (requestError) {
      setError(generationErrorMessage(requestError, language));
      setGenerating(false);
    }
  }

  return (
    <AppShell>
      <section data-testid="planner-brief-hero" data-layout="travel-brief" className="relative overflow-hidden bg-paper px-5 py-12 text-ink sm:px-8 sm:py-16">
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-ink/10" />
        <div aria-hidden="true" className="absolute right-[6%] top-0 hidden h-full w-[31%] border-x border-ink/8 lg:block" />
        <div className="relative mx-auto grid max-w-[1440px] gap-9 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-xs font-extrabold text-lake"><span className="h-2 w-2 rounded-full bg-vermilion" />{language === "zh" ? "新加坡行程 · 第 01 步" : "Singapore brief · step 01"}</p>
            <h1 className="mt-5 max-w-[15ch] font-display text-4xl font-extrabold leading-[.98] sm:text-6xl lg:text-[4.75rem]">
              {language === "zh" ? "一次选择，一份真正好用的新加坡行程。" : "One choice. One Singapore itinerary you can actually use."}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink/60">{language === "zh" ? "从景点、日期与预算开始，Nuogo 会围绕你的旅行方式生成并验证一份新加坡行程。" : "Start with places, dates, and budget. Nuogo generates and validates one Singapore itinerary around your travel style."}</p>
            <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-ink/65"><span className="rounded-full border border-ink/12 bg-white px-3 py-2">{language === "zh" ? "仅限新加坡" : "Singapore only"}</span><span className="rounded-full border border-ink/12 bg-white px-3 py-2">{language === "zh" ? "SGD 硬预算" : "SGD hard budget"}</span><span className="rounded-full border border-ink/12 bg-white px-3 py-2">{language === "zh" ? "一份行程" : "One itinerary"}</span></div>
          </div>
          <aside className="relative overflow-hidden rounded-lg border border-ink/10 bg-ink p-5 text-white shadow-panel sm:p-7">
            <div aria-hidden="true" className="absolute inset-y-0 right-0 w-[38%] border-l border-white/10 bg-white/[.035]" />
            <div className="relative flex items-center justify-between border-b border-white/14 pb-4"><div><p className="text-[10px] font-extrabold text-[#e7baa1]">{language === "zh" ? "新加坡 / 行程简报" : "SINGAPORE / TRIP BRIEF"}</p><strong className="mt-1 block font-display text-xl">{language === "zh" ? "出发前的规划信号" : "Planning signals before you go"}</strong></div><MapPin className="h-7 w-7 text-[#9be0c7]" /></div>
            <ol className="relative mt-5 grid gap-4">
              {[
                [Database, "01", language === "zh" ? "景点资料" : "Grounded POIs", language === "zh" ? "从新加坡景点发现开始" : "Begin with Singapore discovery"],
                [Bot, "02", language === "zh" ? "旅行风格" : "Travel style", language === "zh" ? "选择一份适合你的节奏" : "Choose one pace that fits you"],
                [WalletCards, "03", language === "zh" ? "硬预算验证" : "Hard budget", language === "zh" ? "行程总额保持在预算内" : "Keep the total within your budget"],
                [Route, "04", language === "zh" ? "路线连续性" : "Route continuity", language === "zh" ? "让每日安排更连贯" : "Keep each day connected" ]
              ].map(([Icon, step, label, detail]) => <li key={step} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3"><span className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/5 text-[#9be0c7]"><Icon className="h-4 w-4" /></span><div><span className="text-[10px] font-extrabold text-white/35">{step}</span><strong className="ml-2 text-sm">{label}</strong><small className="mt-1 block text-xs text-white/58">{detail}</small></div></li>)}
            </ol>
          </aside>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-[1440px] gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-lg border border-ink/10 bg-white/78 p-5 shadow-panel backdrop-blur-2xl sm:p-8 lg:p-10">
            <div className="mb-9 flex flex-col justify-between gap-4 border-b border-ink/10 pb-7 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-extrabold uppercase text-vermilion">{language === "zh" ? "旅行需求" : "Travel brief"}</p>
                <h2 className="mt-2 font-display text-3xl font-extrabold">{language === "zh" ? "告诉 Nuogo 你想怎样探索新加坡" : "Tell Nuogo how you want to explore Singapore"}</h2>
              </div>
              <span className="text-xs font-bold text-ink/40">{language === "zh" ? "约 2 分钟" : "About 2 minutes"}</span>
            </div>
            <PlannerJourneyHorizon values={preferences} />
            <PreferenceForm
              onSubmit={generate}
              values={preferences}
              onValuesChange={setPreferences}
              busy={generating || !authReady}
            />
            {error && (
              <div role="alert" className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <strong>{language === "zh" ? "暂时无法生成行程。" : "The itinerary could not be generated."}</strong>
                <p className="mt-1">{error}</p>
              </div>
            )}
          </div>

          <aside className="relative h-[640px] overflow-hidden rounded-lg bg-ink text-white shadow-panel xl:sticky xl:top-24">
            <img
              className="absolute inset-0 h-full w-full object-cover opacity-68"
              src="https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1000&q=84"
              alt={language === "zh" ? "新加坡滨海湾城市景观" : "Singapore Marina Bay skyline"}
            />
            <div className="absolute inset-0 bg-ink/35" />
            <div className="absolute left-5 top-5 rounded-lg border border-white/25 bg-ink/70 px-3 py-2 text-xs font-bold backdrop-blur-lg">
              {language === "zh" ? "新加坡 · 规划资料" : "SG · PLANNING DATA"}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-ink/90 p-7">
              <ShieldCheck className="h-7 w-7 text-lake" />
              <h2 className="mt-4 font-display text-2xl font-bold">
                {language === "zh" ? "结构化输入，由服务端校验约束" : "Structured here. Constraint-checked on the server."}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/65">
                {language === "zh"
                  ? "景点、兴趣与预算使用结构化资料，系统提示词不会暴露在前端。"
                  : "Attractions, interests, and budgets use structured data. System prompts never reach the frontend."}
              </p>
              <div className="mt-6 grid grid-cols-2 border-t border-white/15 pt-5 text-xs">
                <span><b className="block text-lg text-white">1</b><i className="not-italic text-white/45">{language === "zh" ? "份已验证行程" : "validated itinerary"}</i></span>
                <span><b className="block text-lg text-white">6</b><i className="not-italic text-white/45">{language === "zh" ? "类费用" : "cost categories"}</i></span>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <PipelineOverlay open={generating} state={generationState} language={language} />
    </AppShell>
  );
}
