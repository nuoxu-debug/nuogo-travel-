import { CheckCircle2, ChevronRight, Database, Flag, Leaf, LoaderCircle, MapPin, Plane, Route, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { createPortal } from "react-dom";

const states = {
  RETRIEVING: {
    Icon: Database,
    label: "Retrieving source-labelled places",
    detail: "Nuogo is retrieving source-labelled places and matching them to your travel brief."
  },
  PLANNING: {
    Icon: Sparkles,
    label: "Drafting your selected travel style",
    detail: "Nuogo is asking the AI planner to use only allowed source-matched POI IDs."
  },
  VALIDATING: {
    Icon: ShieldCheck,
    label: "Validating route, time, and budget",
    detail: "Nuogo is recalculating travel legs, schedule feasibility, and budget totals."
  },
  REPAIRING: {
    Icon: Wrench,
    label: "Repairing a constrained draft",
    detail: "Nuogo is repairing validation issues before accepting the itinerary."
  },
  FAILED: {
    Icon: Route,
    label: "No safe itinerary was produced",
    detail: "Nuogo did not mark an invalid itinerary as ready."
  },
  FINAL_VALIDATED: {
    Icon: CheckCircle2,
    label: "Itinerary validated",
    detail: "The accepted itinerary stays inside your hard budget."
  }
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483000,
  display: "grid",
  placeItems: "center",
  padding: "2rem 1.25rem",
  backgroundColor: "rgba(7, 19, 15, 0.72)",
  color: "#10241d",
  overflow: "auto"
};

const panelStyle = {
  width: "min(100%, 56rem)",
  border: "1px solid rgba(255, 255, 255, 0.72)",
  borderRadius: "1.15rem",
  backgroundImage: [
    "linear-gradient(115deg, rgba(255, 250, 234, 0.94), rgba(255, 250, 234, 0.8) 47%, rgba(238, 250, 237, 0.78))",
    "url('/images/singapore-marina-bay-hero.png')"
  ].join(", "),
  backgroundPosition: "center",
  backgroundSize: "cover",
  boxShadow: "0 36px 110px rgba(0, 0, 0, 0.52)",
  textAlign: "center",
  overflow: "hidden",
  position: "relative"
};

const scenicBackdropStyle = {
  position: "absolute",
  inset: 0,
  backgroundImage: "url('/images/singapore-marina-bay-hero.png')",
  backgroundPosition: "center",
  backgroundSize: "cover",
  filter: "blur(14px) saturate(1.06)",
  transform: "scale(1.08)",
  opacity: 0.45
};

const stepOrder = ["RETRIEVING", "PLANNING", "VALIDATING", "REPAIRING"];

function activeStepIndex(state) {
  const index = stepOrder.indexOf(state);
  if (state === "FINAL_VALIDATED") return stepOrder.length;
  return index < 0 ? 0 : index;
}

export default function PipelineOverlay({ open, state = "RETRIEVING", language = "en" }) {
  if (!open) return null;
  const current = states[state] ?? states.RETRIEVING;
  const Icon = current.Icon;
  const zh = language === "zh";
  const title = zh ? "Generating your Singapore itinerary" : "Creating your Singapore itinerary";
  const notice = zh
    ? "Please keep this page open. The itinerary workspace will open automatically when generation finishes."
    : "Do not close this page. Your itinerary workspace will open automatically when generation finishes.";
  const steps = ["Read source-backed places", "Draft the itinerary", "Validate route, time, and budget", "Repair the draft if needed"];
  const currentStep = activeStepIndex(state);

  const overlay = (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={zh ? "Generating itinerary" : "Generating itinerary"}>
      <div data-testid="pipeline-scenic-backdrop" aria-hidden="true" style={scenicBackdropStyle} />
      <div role="status" aria-live="polite" aria-label={zh ? "Generating itinerary" : "Generating itinerary"} style={panelStyle} data-testid="pipeline-travel-card">
        <div className="relative px-5 py-8 sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,rgba(29,167,122,.18),transparent_13rem),radial-gradient(circle_at_86%_58%,rgba(255,107,74,.13),transparent_12rem)]" />
          <div className="pointer-events-none absolute left-0 top-0 h-36 w-44 bg-[radial-gradient(ellipse_at_top_left,rgba(29,86,55,.22),transparent_65%)]" />
          <div className="pointer-events-none absolute right-0 top-0 h-44 w-52 bg-[radial-gradient(ellipse_at_top_right,rgba(65,109,67,.18),transparent_67%)]" />

          <div className="relative mx-auto grid h-[4.8rem] w-[4.8rem] place-items-center rounded-full bg-jade/10 text-jade shadow-[0_18px_40px_rgba(16,36,29,.12)]">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#07352c] text-white shadow-[0_14px_28px_rgba(7,53,44,.22)]">
              <Icon className="h-7 w-7" />
            </div>
            <MapPin className="absolute -right-1 bottom-2 h-7 w-7 rounded-full bg-coral p-1.5 text-white shadow-[0_10px_22px_rgba(255,107,74,.28)]" />
          </div>

          <p className="relative mt-6 text-[11px] font-black uppercase tracking-[.28em] text-jade/80">Nuogo validation pipeline</p>
          <h2 className="relative mx-auto mt-3 max-w-3xl font-display text-[clamp(2.4rem,6.5vw,4.25rem)] font-black leading-[.92] text-[#081b15]">
            {title}
          </h2>
          <span className="relative mx-auto mt-5 block h-1 w-11 rounded-full bg-coral" aria-hidden="true" />
          <p className="relative mx-auto mt-5 max-w-xl text-xl font-black leading-7 text-[#0b2a22]">{current.label}</p>
          <p className="relative mx-auto mt-2 max-w-xl text-base font-semibold leading-7 text-[#355349]">{current.detail}</p>

          <ol className="relative mx-auto mt-7 grid max-w-2xl gap-3 text-left text-sm font-black text-[#10241d] sm:grid-cols-2">
            {steps.map((step, index) => {
              const active = index === Math.min(currentStep, steps.length - 1);
              const done = index < currentStep || state === "FINAL_VALIDATED";
              return (
                <li key={step} className={`flex min-h-[4.35rem] items-center gap-4 rounded-lg border px-4 shadow-[0_14px_28px_rgba(16,36,29,.08)] ${active ? "border-jade/55 bg-white/72" : "border-white/65 bg-white/62"}`}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black ${done || active ? "bg-jade text-white" : "bg-[#e7ddca] text-[#10241d]"}`}>{index + 1}</span>
                  <span className="min-w-0 flex-1 leading-5">{step}</span>
                  <ChevronRight className={`h-4 w-4 ${active ? "text-jade" : "text-ink/45"}`} aria-hidden="true" />
                </li>
              );
            })}
          </ol>

          <div className="relative mx-auto mt-5 flex max-w-2xl items-center justify-center gap-4 rounded-lg border border-white/65 bg-white/56 px-5 py-4 text-base font-bold leading-6 text-[#10241d] shadow-[0_14px_28px_rgba(16,36,29,.08)]">
            <Leaf className="hidden h-10 w-10 shrink-0 rounded-full bg-jade/10 p-2 text-jade sm:block" aria-hidden="true" />
            <p>{notice}</p>
          </div>

          <div data-testid="pipeline-journey-progress" className="relative mx-auto mt-7 grid max-w-xl grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-3 text-xs font-bold text-[#21483f]">
            <span className="grid gap-1 justify-items-center">
              <CheckCircle2 className="h-6 w-6 text-jade" />
              <span>Retrieving places</span>
            </span>
            <span className="h-px bg-jade" />
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-jade shadow-[0_0_0_6px_rgba(29,167,122,.12)]">
              {state === "FINAL_VALIDATED" ? <CheckCircle2 className="h-5 w-5" /> : <Plane className="h-5 w-5" />}
            </span>
            <span className="h-px border-t border-dashed border-[#8aa095]" />
            <span className="grid gap-1 justify-items-center text-ink/50">
              <Flag className="h-5 w-5" />
              <span className="hidden sm:inline">Workspace opens</span>
            </span>
          </div>

          <LoaderCircle className="absolute bottom-6 left-1/2 h-5 w-5 -translate-x-1/2 animate-spin text-lake motion-reduce:animate-none sm:hidden" aria-hidden="true" />
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
