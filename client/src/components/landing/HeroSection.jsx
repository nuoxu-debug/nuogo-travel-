import { ArrowDown, ArrowRight, MapPinned } from "lucide-react";
import { Link } from "react-router-dom";
import { publicAssetPath } from "../../assets.js";

const heroDestinations = [
  { src: "/images/landing/world/paris-eiffel.jpg", label: "Paris" },
  { src: "/images/landing/world/mount-fuji.jpg", label: "Mount Fuji" },
  { src: "/images/landing/world/new-york-skyline.jpg", label: "New York" },
  { src: "/images/singapore-marina-bay-hero.png", label: "Singapore" },
];

export default function HeroSection({ copy }) {
  return (
    <section className="atlas-hero" aria-labelledby="landing-title">
      <div className="atlas-hero__texture" aria-hidden="true" />
      <div className="atlas-hero__sun" aria-hidden="true" />
      <div className="atlas-hero__cloud atlas-hero__cloud--one" aria-hidden="true" />
      <div className="atlas-hero__cloud atlas-hero__cloud--two" aria-hidden="true" />
      <div className="atlas-hero__global-visual" aria-hidden="true">
        <div className="atlas-hero__destination-collage">
          {heroDestinations.map((destination) => (
            <figure key={destination.label} className="atlas-hero__destination-card">
              <img src={publicAssetPath(destination.src)} alt="" />
              <figcaption>{destination.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
      <p className="atlas-hero__handnote" aria-hidden="true">
        <span>{copy.handnotePrimary}</span>
        <span>{copy.handnoteSecondary}</span>
      </p>
      <div className="atlas-hero__wash" aria-hidden="true" />
      <div className="atlas-hero__content">
        <p className="atlas-kicker"><MapPinned size={16} /> {copy.eyebrow}</p>
        <h1 id="landing-title">
          <span className="atlas-hero__title-main">{copy.titlePrimary ?? copy.title}</span>
          {copy.titleAccent && <span className="atlas-hero__title-accent">{copy.titleAccent}</span>}
        </h1>
        <p className="atlas-hero__body">{copy.body}</p>
        <div className="atlas-actions">
          <Link className="atlas-button atlas-button--solid" to="/discover/singapore">{copy.start}<ArrowRight size={18} /></Link>
        </div>
        <a className="atlas-scroll-link" href="#singapore-stories"><ArrowDown size={17} /> {copy.scroll}</a>
      </div>
    </section>
  );
}
