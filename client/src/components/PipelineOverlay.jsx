import { CheckCircle2, Database, LoaderCircle, Route, ShieldCheck, Sparkles, Wrench } from "lucide-react";

const states = {
  RETRIEVING: { Icon: Database, label: "Retrieving verified travel data", detail: "Building a destination candidate pool from configured providers." },
  PLANNING: { Icon: Sparkles, label: "Drafting three travel profiles", detail: "The AI may select only verified candidate IDs." },
  VALIDATING: { Icon: ShieldCheck, label: "Validating routes, time, and budget", detail: "Server rules recalculate every derived value." },
  REPAIRING: { Icon: Wrench, label: "Repairing a constrained draft", detail: "A bounded repair pass is resolving validation codes." },
  FAILED: { Icon: Route, label: "No safe itinerary was produced", detail: "Nothing invalid has been marked ready." },
  FINAL_VALIDATED: { Icon: CheckCircle2, label: "Three plans validated", detail: "Every accepted profile stays inside the same hard budget." }
};

export default function PipelineOverlay({ open, state = "RETRIEVING" }) {
  if (!open) return null;
  const current = states[state] ?? states.RETRIEVING;
  const Icon = current.Icon;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/96 px-5 text-white" role="dialog" aria-modal="true" aria-label="Generating itinerary">
    <div className="w-full max-w-2xl text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-lg border border-white/15 bg-white/8 text-gold"><Icon className="h-8 w-8" /></div>
      <p className="mt-7 text-xs font-bold uppercase text-white/45">Nuogo validation pipeline</p>
      <h2 aria-live="polite" className="mt-3 font-display text-3xl font-bold sm:text-5xl">{current.label}</h2>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-white/58">{current.detail}</p>
      <div className="mx-auto mt-9 flex max-w-md items-center gap-3 text-lake"><span className="h-2 w-2 rounded-full bg-current" /><span className="h-px flex-1 bg-white/15" /><LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" /><span className="h-px flex-1 bg-white/15" /><span className="h-2 w-2 rounded-full bg-current" /></div>
    </div>
  </div>;
}
