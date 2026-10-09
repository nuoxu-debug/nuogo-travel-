import { TrainFront } from "lucide-react";
import { publicAssetPath } from "../../assets.js";

const SMRT_NETWORK_MAP_URL = publicAssetPath("/images/reference/singapore-mrt-network-map.png");
const SMRT_NETWORK_MAP_PAGE = "https://journey.smrt.com.sg/journey/mrt_network_map/";

export default function JourneyMapSection({ copy, zh = false }) {
  return (
    <section className="journey-map" data-testid="singapore-journey-map" aria-labelledby="journey-map-title">
      <header className="journey-map__heading">
        <p className="atlas-kicker">{copy.eyebrow}</p>
        <h2 id="journey-map-title">{copy.title}</h2>
        <p>{copy.body}</p>
      </header>
      <div className="journey-map__canvas journey-map__canvas--mrt">
        <div className="journey-map__mrt-caption"><TrainFront size={17} /> {copy.legend}</div>
        <img
          className="journey-map__mrt-image"
          src={SMRT_NETWORK_MAP_URL}
          alt={zh ? "\u65b0\u52a0\u5761 MRT \u5730\u94c1\u8def\u7ebf\u56fe" : "Singapore MRT network map"}
          loading="lazy"
        />
        <div className="journey-map__source">
          <span>{zh ? "\u56fe\u7247\u6765\u6e90\uff1aSMRT Journeys" : "Image source: SMRT Journeys"}</span>
          <a href={SMRT_NETWORK_MAP_PAGE} target="_blank" rel="noreferrer">
            {zh ? "\u6253\u5f00\u5b98\u65b9 MRT \u56fe" : "Open official MRT map"}
          </a>
        </div>
      </div>
    </section>
  );
}
