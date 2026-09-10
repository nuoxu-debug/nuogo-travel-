import { ArrowDown, ArrowRight, MapPinned, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { publicAssetPath } from "../../assets.js";

export default function HeroSection({ copy }) {
  return (
    <section className="atlas-hero" aria-labelledby="landing-title">
      <div className="atlas-hero__texture" aria-hidden="true" />
      <div className="atlas-hero__sun" aria-hidden="true" />
      <div className="atlas-hero__cloud atlas-hero__cloud--one" aria-hidden="true" />
      <div className="atlas-hero__cloud atlas-hero__cloud--two" aria-hidden="true" />
      <div className="atlas-hero__photo" aria-hidden="true"><img src={publicAssetPath("/images/singapore-marina-bay-hero.png")} alt="" /></div>
      <div className="atlas-hero__wash" aria-hidden="true" />
      <div className="atlas-hero__content">
        <p className="atlas-kicker"><MapPinned size={16} /> {copy.eyebrow}</p>
        <h1 id="landing-title">{copy.title}</h1>
        <p className="atlas-hero__body">{copy.body}</p>
        <div className="atlas-actions">
          <Link className="atlas-button atlas-button--solid" to="/discover/singapore">{copy.start}<ArrowRight size={18} /></Link>
          <Link className="atlas-button atlas-button--quiet" to="/login?returnTo=%2Fdiscover%2Fsingapore" aria-label={copy.guestAria}>{copy.guest}</Link>
        </div>
        <a className="atlas-scroll-link" href="#singapore-stories"><ArrowDown size={17} /> {copy.scroll}</a>
      </div>
      <aside className="atlas-hero__manifest" aria-label={copy.manifestLabel}>
        <span><Sparkles size={15} /> {copy.manifestKicker}</span>
        <strong>{copy.manifest}</strong>
        <i aria-hidden="true" />
      </aside>
    </section>
  );
}
