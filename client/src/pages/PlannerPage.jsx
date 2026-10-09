import {
  Bed,
  CalendarDays,
  Clock3,
  Flower2,
  MapPin,
  Plane,
  ShieldCheck,
  Users,
  WalletCards
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { deriveTripDurationDays } from "@nuogo/shared/schemas";
import { apiRequest } from "../api/client.js";
import PipelineOverlay from "../components/PipelineOverlay.jsx";
import PreferenceForm, { initialPreferenceValues } from "../components/PreferenceForm.jsx";
import { publicAssetPath } from "../assets.js";
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

function generationIssueMessage(code, language, preferences = {}) {
  const dailyTarget = Number(preferences.dailyAttractionTarget);
  const alreadyLightTarget = Number.isFinite(dailyTarget) && dailyTarget <= 2;
  const messages = {
    DAILY_DURATION_EXCEEDED: {
      zh: alreadyLightTarget
        ? "其中一天的景点、用餐与交通总时长超过可用时间。请调整日期、出发/结束地点、交通方式或必去景点后重试。"
        : "其中一天的景点与交通总时长超过可用时间。请减少当天景点，或选择更轻松的行程节奏。",
      en: alreadyLightTarget
        ? "One day exceeds the available time once visits, meals, and travel are included. Adjust the dates, start/end points, transport, or required sights and try again."
        : "One day exceeds the available time once attraction visits and travel are included. Choose fewer places or a slower pace."
    },
    ROUTE_UNAVAILABLE: {
      zh: "系统无法为部分地点建立可用路线。请调整必去景点后重试。",
      en: "A usable route could not be created for part of the itinerary. Adjust the required sights and try again."
    },
    TRAVEL_TIME_CONFLICT: {
      zh: alreadyLightTarget
        ? "景点之间的交通时间与安排冲突。当前每日景点目标已经较少，请调整日期、出发/结束地点、交通方式或必去景点后重试。"
        : "景点之间的交通时间与安排冲突。请减少当天景点后重试。",
      en: alreadyLightTarget
        ? "Travel time conflicts with the planned activity times. The daily attraction target is already low; adjust the dates, start/end points, transport, or required sights and try again."
        : "Travel time conflicts with the planned activity times. Choose fewer places for that day and try again."
    },
    TIME_OVERLAP: {
      zh: "部分活动时间重叠。请调整日期或偏好后重试。",
      en: "Some activity times overlap. Adjust the dates or preferences and try again."
    }
  };
  return messages[code]?.[language] ?? (language === "zh"
    ? "生成的行程未通过系统验证。请调整输入后重试。"
    : "The generated itinerary did not pass a system validation check. Adjust your inputs and try again.");
}

function generationIssueCodes(error) {
  if (error.code !== "GENERATION_CONSTRAINTS_UNSATISFIED" || !Array.isArray(error.details?.issueCodes)) return [];
  return [...new Set(error.details.issueCodes.filter((code) => typeof code === "string" && code))];
}

function tripDuration(values) {
  try {
    return deriveTripDurationDays(values.startDate, values.endDate);
  } catch {
    return 0;
  }
}

export default function PlannerPage() {
  const { language } = useLanguage();
  const { ready: authReady } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const preferenceWorkflowRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [generationState, setGenerationState] = useState("RETRIEVING");
  const [error, setError] = useState("");
  const [issueCodes, setIssueCodes] = useState([]);
  const [preferences, setPreferences] = useState(() => ({
    ...initialPreferenceValues,
    attractionDraft: readAttractionDraft()
  }));

  useLayoutEffect(() => {
    if (location.state?.plannerScrollTarget !== "preferences") return;
    preferenceWorkflowRef.current?.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: "auto"
    });
  }, [location.state]);

  useEffect(() => {
    if (preferences.attractionDraft && preferences.attractionDraft.destination !== preferences.destination) {
      clearAttractionDraft();
      setPreferences((current) => ({ ...current, attractionDraft: null }));
    }
  }, [preferences.attractionDraft, preferences.destination]);

  async function generate(nextPreferences) {
    setError("");
    setIssueCodes([]);
    setGenerating(true);
    setGenerationState("RETRIEVING");
    try {
      const result = await apiRequest("/trips/generate", {
        method: "POST",
        body: JSON.stringify(nextPreferences)
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
      if (result.preview) {
        sessionStorage.setItem(`nuogo-preview-result-${result.trip.id}`, JSON.stringify(result.preview));
      }
      if (result.previewToken) {
        sessionStorage.setItem(`nuogo-preview-token-${result.trip.id}`, result.previewToken);
      }
      navigate(`/trip/${result.trip.id}`);
    } catch (requestError) {
      setError(generationErrorMessage(requestError, language));
      setIssueCodes(generationIssueCodes(requestError));
      setGenerating(false);
    }
  }

  const duration = tripDuration(preferences);
  const zh = language === "zh";
  const summaryRows = [
    [MapPin, zh ? "目的地" : "Destination", zh ? "新加坡" : "Singapore"],
    [Plane, zh ? "出发地" : "Departure", preferences.departurePoint],
    [Bed, zh ? "住宿 / 结束地点" : "Stay / end point", preferences.arrivalPoint],
    [CalendarDays, zh ? "旅行日期" : "Travel dates", `${preferences.startDate} - ${preferences.endDate} (${duration} ${zh ? "天" : duration === 1 ? "day" : "days"})`],
    [Users, zh ? "旅行人数" : "Travellers", `${preferences.travellerCount} ${zh ? "人" : Number(preferences.travellerCount) === 1 ? "person" : "people"}`],
    [WalletCards, zh ? "总预算" : "Budget", `S$ ${Number(preferences.budgetSgd).toLocaleString()}`]
  ];

  return (
    <AppShell>
      <div className="planner-postcard-page">
        <section data-testid="planner-brief-hero" data-layout="travel-brief" className="planner-postcard-hero">
          <div className="planner-hero-copy">
            <p className="planner-kicker">{zh ? "当前试点规划" : "Current pilot planning"}</p>
            <h1>{zh ? "使用新加坡试点创建可验证行程" : "Plan with the current Singapore pilot"}</h1>
            <p>{zh ? "Nuogo 的验证规划流程当前运行在新加坡目的地数据上。分享你的偏好、预算和日期，系统会生成一份受检查的行程。" : "Nuogo's validated planning flow currently runs on Singapore destination data. Share your travel style, budget, dates, and preferred places to generate one checked itinerary."}</p>
            <span className="planner-time-note"><Clock3 />{zh ? "约 2 分钟完成" : "About 2 minutes"}</span>
            <ol className="planner-progress-rail" aria-label={zh ? "规划步骤" : "Planning steps"}>
              {[zh ? "基本信息" : "Basics", zh ? "兴趣偏好" : "Interests", zh ? "出行方式" : "Transport", zh ? "其他需求" : "Needs", zh ? "生成行程" : "Generate"].map((label, index) => (
                <li key={label} className={index === 0 ? "is-active" : ""}><span>{index + 1}</span><strong>{label}</strong></li>
              ))}
            </ol>
          </div>
          <figure className="planner-hero-scene">
            <img
              data-testid="planner-brief-background"
              src={publicAssetPath("/images/singapore-marina-bay-hero.png")}
              alt={zh ? "新加坡滨海湾与花园城市景观" : "Singapore Marina Bay and garden skyline"}
            />
            <figcaption>
              <strong>Singapore</strong>
              <span>{zh ? "一座让人想再来的城市" : "A city built for one more wander"}</span>
            </figcaption>
          </figure>
        </section>

        <section ref={preferenceWorkflowRef} className="planner-postcard-workspace scroll-mt-24">
          <div className="planner-form-card">
            <div className="planner-form-heading">
              <div>
                <p>{zh ? "旅行需求" : "Travel needs"}</p>
                <h2>{zh ? "先确认这次试点行程的基本形状" : "Start with the shape of this pilot trip"}</h2>
              </div>
              <span>{zh ? "约 2 分钟" : "About 2 minutes"}</span>
            </div>
            <PreferenceForm
              onSubmit={generate}
              values={preferences}
              onValuesChange={setPreferences}
              busy={generating || !authReady}
            />
            {error && (
              <div role="alert" className="planner-generation-error">
                <strong>{zh ? "暂时无法生成行程。" : "The itinerary could not be generated."}</strong>
                <p>{error}</p>
                {issueCodes.length > 0 && (
                  <div>
                    <p>{zh ? "实际验证原因" : "Validation reason"}</p>
                    <ul>
                      {issueCodes.map((code) => (
                        <li key={code}>
                          <span>{generationIssueMessage(code, language, preferences)}</span>
                          <code>{code}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="planner-summary-rail" aria-label={zh ? "旅程摘要" : "Trip summary"}>
            <section className="planner-summary-card">
              <div className="planner-summary-title"><MapPin /><div><h2>{zh ? "旅程摘要" : "Trip summary"}</h2><p>{zh ? "你的新加坡之旅" : "Your Singapore trip"}</p></div></div>
              <figure className="planner-polaroid">
                <img src={publicAssetPath("/images/landing/attractions/marina-bay.png")} alt={zh ? "新加坡滨海湾" : "Singapore Marina Bay"} />
                <figcaption>Singapore</figcaption>
              </figure>
              <dl className="planner-summary-list">
                {summaryRows.map(([Icon, label, value]) => <div key={label}><dt><Icon />{label}</dt><dd>{value}</dd></div>)}
              </dl>
            </section>
            <section className="planner-inspiration-card">
              <div className="planner-summary-title"><Flower2 /><div><h2>{zh ? "新加坡灵感速览" : "Singapore inspiration"}</h2><p>{zh ? "花园城市、多元文化与美食的天堂" : "Garden city, food, colour, and waterfront light"}</p></div></div>
              <div className="planner-inspiration-grid">
                {[
                  ["/images/landing/attractions/marina-bay.png", zh ? "滨海湾金沙" : "Marina Bay"],
                  ["/images/landing/attractions/gardens-by-the-bay.png", zh ? "滨海湾花园" : "Gardens"],
                  ["/images/attractions/sentosa.jpg", zh ? "圣淘沙岛" : "Sentosa"],
                  ["/images/landing/attractions/chinatown.png", zh ? "牛车水" : "Chinatown"]
                ].map(([src, label]) => <figure key={label}><img src={publicAssetPath(src)} alt={label} /><figcaption><MapPin />{label}</figcaption></figure>)}
              </div>
              <blockquote>{zh ? "从城市地标到海岛暖风，从多元美食到在地文化，发现属于你的新加坡。" : "From city icons to island air, from local food to heritage streets, shape the Singapore that fits you."}</blockquote>
              <div className="planner-summary-trust"><ShieldCheck />{zh ? "结构化输入，服务端验证预算与约束。" : "Structured inputs, server-validated budget and constraints."}</div>
            </section>
            <section className="planner-route-note-card" aria-label={zh ? "新加坡路线灵感" : "Singapore route note"}>
              <div>
                <p>{zh ? "路线小记" : "Route note"}</p>
                <h2>{zh ? "从滨海湾开始，慢慢走进街区。" : "Begin at the bay, then drift into the neighbourhoods."}</h2>
              </div>
              <img src={publicAssetPath("/images/landing/attractions/merlion.png")} alt={zh ? "鱼尾狮与滨海湾" : "Merlion by Marina Bay"} />
              <span>{zh ? "Nuogo 会把景点、交通和预算放在同一条可验证的旅程里。" : "Nuogo keeps places, transport, and budget inside one checked journey."}</span>
            </section>
            <section className="planner-check-card" aria-label={zh ? "行程检查" : "Itinerary checks"}>
              <div className="planner-summary-title"><ShieldCheck /><div><h2>{zh ? "生成前会检查" : "Checked before generation"}</h2><p>{zh ? "不只是好看的行程" : "More than a pretty route"}</p></div></div>
              <ul>
                <li><WalletCards />{zh ? "预算总额不能超出你填写的 SGD 预算。" : "The final total must stay inside your SGD budget."}</li>
                <li><Clock3 />{zh ? "每天的景点数量会被时间和交通限制检查。" : "Daily attraction count is checked against time and transport limits."}</li>
                <li><MapPin />{zh ? "手动选择的景点会作为高优先级偏好。" : "Manually selected attractions become high-priority preferences."}</li>
              </ul>
            </section>
            <section className="planner-postcard-tip-card" aria-label={zh ? "新加坡小提示" : "Singapore planning tip"}>
              <p>{zh ? "小提示" : "Little tip"}</p>
              <h2>{zh ? "留一点空间给下雨、排队和突然想喝咖啡的时间。" : "Leave room for rain, queues, and the sudden need for kopi."}</h2>
              <div>
                <span>SGD</span>
                <span>MRT</span>
                <span>POI</span>
              </div>
            </section>
          </aside>
        </section>
      </div>
      <PipelineOverlay open={generating} state={generationState} language={language} />
    </AppShell>
  );
}
