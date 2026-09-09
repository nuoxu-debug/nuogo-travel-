import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function FinalCTASection({ copy }) {
  return <section className="landing-final-cta" aria-labelledby="final-cta-title">
    <div className="landing-final-cta__sun" aria-hidden="true" />
    <div className="landing-final-cta__cloud" aria-hidden="true" />
    <p className="atlas-kicker"><Sparkles size={16} /> {copy.eyebrow}</p>
    <h2 id="final-cta-title">{copy.title}</h2>
    <p>{copy.body}</p>
    <Link className="atlas-button atlas-button--solid" to="/discover/singapore">{copy.action}<ArrowRight size={18} /></Link>
  </section>;
}
