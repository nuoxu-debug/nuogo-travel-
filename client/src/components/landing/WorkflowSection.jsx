import { CalendarDays, CheckCircle2, HeartHandshake, MapPinned, Sparkles } from "lucide-react";

const steps = [
  { icon: CalendarDays, en: "Enter travel preferences", zh: "填写旅行偏好" },
  { icon: MapPinned, en: "Browse/select attractions", zh: "浏览与选择景点" },
  { icon: Sparkles, en: "Generate itinerary", zh: "生成行程" },
  { icon: CheckCircle2, en: "Validate budget and structure", zh: "验证预算与行程结构" },
  { icon: HeartHandshake, en: "Save and manage itinerary", zh: "保存与管理行程" },
];

export default function WorkflowSection({ copy, zh }) {
  return <section className="landing-workflow" aria-labelledby="workflow-title">
    <header className="atlas-section-heading">
      <p className="atlas-kicker">{copy.eyebrow}</p>
      <h2 id="workflow-title">{copy.title}</h2>
      <p>{copy.body}</p>
    </header>
    <ol className="landing-workflow__steps">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return <li key={step.en}>
          <span className="landing-workflow__number">{String(index + 1).padStart(2, "0")}</span>
          <Icon aria-hidden="true" />
          <h3>{zh ? step.zh : step.en}</h3>
        </li>;
      })}
    </ol>
  </section>;
}
