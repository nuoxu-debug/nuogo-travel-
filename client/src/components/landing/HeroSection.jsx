import { ArrowDown, ArrowRight, MapPinned } from "lucide-react";
import { Link } from "react-router-dom";
import { publicAssetPath } from "../../assets.js";

const heroDestinations = [
  { src: "/images/landing/world/paris-eiffel.jpg", en: "Paris, France", zh: "\u5df4\u9ece\uff0c\u6cd5\u56fd" },
  { src: "/images/landing/world/mount-fuji.jpg", en: "Mount Fuji, Japan", zh: "\u5bcc\u58eb\u5c71\uff0c\u65e5\u672c" },
  { src: "/images/landing/world/great-wall.jpg", en: "Great Wall, China", zh: "\u957f\u57ce\uff0c\u4e2d\u56fd" },
  { src: "/images/landing/world/new-york-skyline.jpg", en: "New York, USA", zh: "\u7ebd\u7ea6\uff0c\u7f8e\u56fd" },
];

export default function HeroSection({ copy, zh }) {
  const planningHref = "/discover/singapore";

  return (
    <section className="atlas-hero" aria-labelledby="landing-title">
      <div className="atlas-hero__texture" aria-hidden="true" />
      <div className="atlas-hero__sun" aria-hidden="true" />
      <div className="atlas-hero__cloud atlas-hero__cloud--one" aria-hidden="true" />
      <div className="atlas-hero__cloud atlas-hero__cloud--two" aria-hidden="true" />
      <div className="atlas-hero__global-visual" aria-hidden="true">
        <div className="atlas-hero__destination-collage">
          {heroDestinations.map((destination) => (
            <figure key={destination.src} className="atlas-hero__destination-card">
              <img src={publicAssetPath(destination.src)} alt="" />
              <figcaption>{zh ? destination.zh : destination.en}</figcaption>
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
          <Link className="atlas-button atlas-button--solid" to={planningHref}>{copy.start}<ArrowRight size={18} /></Link>
          <Link className="atlas-button atlas-button--outline" to="/discover/singapore">{zh ? "以访客身份继续" : "Continue as guest"}</Link>
        </div>
        <a className="atlas-scroll-link" href="#singapore-stories"><ArrowDown size={17} /> {copy.scroll}</a>
      </div>
    </section>
  );
}
