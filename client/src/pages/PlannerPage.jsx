import { Bot, Database, Route, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import PipelineOverlay, { pipelineDuration } from "../components/PipelineOverlay.jsx";
import PreferenceForm from "../components/PreferenceForm.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import AppShell from "../layout/AppShell.jsx";

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function PlannerPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function generate(preferences) {
    setError("");
    setGenerating(true);
    try {
      const [result] = await Promise.all([
        apiRequest("/trips/generate", {
          method: "POST",
          body: JSON.stringify(preferences)
        }),
        wait(pipelineDuration * 7)
      ]);
      sessionStorage.setItem(`nuogo-trip-${result.trip.id}`, JSON.stringify({
        ...result.trip,
        variants: result.variants
      }));
      navigate(`/compare/${result.trip.id}`);
    } catch (requestError) {
      setError(requestError.message);
      setGenerating(false);
    }
  }

  return (
    <AppShell>
      <section className="relative overflow-hidden bg-paper px-5 py-14 text-ink sm:px-8 sm:py-20">
        <div className="absolute right-0 top-0 hidden h-full w-[42%] border-l border-ink/10 bg-lake/5 lg:block" />
        <div className="relative mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase text-lake">Route brief · step 01</p>
            <h1 className="mt-4 max-w-4xl font-display text-4xl font-extrabold leading-tight sm:text-6xl">
              {language === "zh" ? "清晰的偏好，换来真正好用的行程。" : "Clear preferences. Plans you can actually use."}
            </h1>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-ink/10 bg-white/72 shadow-panel backdrop-blur-2xl">
            {[
              [Database, "01", language === "zh" ? "本地资料" : "Local catalogue"],
              [Bot, "02", language === "zh" ? "三套方案" : "Three options"],
              [Route, "03", language === "zh" ? "路线优化" : "Route shaping"]
            ].map(([Icon, step, label]) => (
              <div key={step} className="border-r border-ink/10 p-4 last:border-r-0">
                <Icon className="h-5 w-5 text-lake" />
                <span className="mt-5 block text-[10px] font-bold text-ink/35">{step}</span>
                <strong className="mt-1 block text-xs">{label}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-[1440px] gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-lg border border-ink/10 bg-white/78 p-5 shadow-panel backdrop-blur-2xl sm:p-8 lg:p-10">
            <div className="mb-9 flex flex-col justify-between gap-4 border-b border-ink/10 pb-7 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-extrabold uppercase text-vermilion">{language === "zh" ? "旅行需求" : "Travel brief"}</p>
                <h2 className="mt-2 font-display text-3xl font-extrabold">{language === "zh" ? "告诉 Nuogo 你的出发方式" : "Tell Nuogo how you want to travel"}</h2>
              </div>
              <span className="text-xs font-bold text-ink/40">{language === "zh" ? "约 2 分钟" : "About 2 minutes"}</span>
            </div>
            <PreferenceForm onSubmit={generate} busy={generating} />
            {error && (
              <div role="alert" className="mt-5 border-l-4 border-vermilion bg-red-50 p-4 text-sm text-red-800">
                <strong>{language === "zh" ? "暂时无法生成行程。" : "The plans could not be generated."}</strong>
                <p className="mt-1">{error}</p>
              </div>
            )}
          </div>

          <aside className="relative h-[640px] overflow-hidden rounded-lg bg-ink text-white shadow-panel xl:sticky xl:top-24">
            <img
              className="absolute inset-0 h-full w-full object-cover opacity-68"
              src="https://images.unsplash.com/photo-1545893835-abaa50cbe628?auto=format&fit=crop&w=1000&q=84"
              alt="Chengdu teahouse atmosphere"
            />
            <div className="absolute inset-0 bg-ink/35" />
            <div className="absolute left-5 top-5 rounded-lg border border-white/25 bg-ink/70 px-3 py-2 text-xs font-bold backdrop-blur-lg">
              CN · LOCAL DATA
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-ink/90 p-7">
              <ShieldCheck className="h-7 w-7 text-lake" />
              <h2 className="mt-4 font-display text-2xl font-bold">
                {language === "zh" ? "结构化输入，由服务端验证" : "Structured here. Verified on the server."}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/65">
                {language === "zh"
                  ? "目的地、兴趣与住宿使用固定分类，系统提示词不会暴露在前端。"
                  : "Destinations, interests, and stays use fixed categories. System prompts never reach the frontend."}
              </p>
              <div className="mt-6 grid grid-cols-2 border-t border-white/15 pt-5 text-xs">
                <span><b className="block text-lg text-white">3</b><i className="not-italic text-white/45">parallel routes</i></span>
                <span><b className="block text-lg text-white">6</b><i className="not-italic text-white/45">budget groups</i></span>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <PipelineOverlay open={generating} />
    </AppShell>
  );
}
