import { ArrowRight, CheckCircle2, Clock3, MapPinned } from "lucide-react";
import { Link } from "react-router-dom";
import { publicAssetPath } from "../../assets.js";

export default function PilotDestinationSection({ copy, zh }) {
  return (
    <section className="pilot-destination" aria-labelledby="pilot-destination-title">
      <div className="pilot-destination__copy">
        <p className="atlas-kicker"><MapPinned size={16} /> {copy.eyebrow}</p>
        <h2 id="pilot-destination-title">{copy.title}</h2>
        <p>{copy.body}</p>
      </div>
      <article className="pilot-destination__card">
        <figure>
          <img src={publicAssetPath("/images/landing/attractions/gardens-by-the-bay.png")} alt={zh ? "\u65b0\u52a0\u5761\u6ee8\u6d77\u6e7e\u82b1\u56ed" : "Singapore Gardens by the Bay"} />
        </figure>
        <div className="pilot-destination__details">
          <div className="pilot-destination__badges">
            <span><CheckCircle2 aria-hidden="true" /> {copy.badge}</span>
            <span><Clock3 aria-hidden="true" /> {copy.status}</span>
          </div>
          <h3>Singapore</h3>
          <p>{zh ? "\u5f53\u524d\u53ef\u4ee5\u5b8c\u6210\u53d1\u73b0\u3001\u504f\u597d\u586b\u5199\u3001\u9884\u7b97\u68c0\u67e5\u4e0e\u884c\u7a0b\u751f\u6210\u7684\u76ee\u7684\u5730\u3002" : "The destination currently supported for discovery, preference capture, budget checks and itinerary generation."}</p>
          <div className="pilot-destination__actions">
            <Link to="/discover/singapore">{copy.action}<ArrowRight aria-hidden="true" /></Link>
            <span>{copy.future}</span>
          </div>
        </div>
      </article>
    </section>
  );
}
