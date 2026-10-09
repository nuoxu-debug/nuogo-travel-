import { CalendarDays, CheckCircle2, HeartHandshake, MapPinned, Sparkles } from "lucide-react";

const steps = [
  { icon: CalendarDays, en: "Enter travel preferences", zh: "填写旅行偏好" },
  { icon: MapPinned, en: "Browse/select attractions", zh: "浏览与选择景点" },
  { icon: Sparkles, en: "Generate itinerary", zh: "生成行程" },
  { icon: CheckCircle2, en: "Validate budget and structure", zh: "验证预算与行程结构" },
  { icon: HeartHandshake, en: "Save and manage itinerary", zh: "保存与管理行程" }
];

export default function WorkflowSection({ copy, zh }) {
  return <section className="landing-workflow" aria-labelledby="workflow-title">
    <div className="landing-workflow__inner">
      <div className="landing-workflow__poster">
        <img
          className="workflow-collage__image"
          src="/images/landing/how-nuogo-works-collage.png"
          alt={zh ? "闺蜜、家庭与情侣使用 Nuogo 规划旅行的插画拼贴" : "Illustrated collage of friends, family and couple trips planned with Nuogo"}
        />
        <header className="landing-workflow__heading">
          <p className="atlas-kicker">{copy.eyebrow}</p>
          <h2 id="workflow-title">{copy.title}</h2>
          <p>{copy.body}</p>
        </header>
      </div>

      <div className="landing-workflow__guide" aria-label={zh ? "Nuogo 五步流程" : "Nuogo five-step workflow"}>
        <p className="workflow-handnote">{zh ? "去看更大的世界" : "See a wider world"}</p>
        <ol className="landing-workflow__steps">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return <li key={step.en}>
              <span className="landing-workflow__number">{String(index + 1).padStart(2, "0")}</span>
              <span className="landing-workflow__icon"><Icon aria-hidden="true" /></span>
              <h3>{zh ? step.zh : step.en}</h3>
            </li>;
          })}
        </ol>
      </div>
    </div>
  </section>;
}
