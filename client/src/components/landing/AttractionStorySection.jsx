import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { publicAssetPath } from "../../assets.js";
import { useGsapContext } from "../../motion/useGsapContext.js";

const places = [
  { key: "marina", image: "/images/landing/attractions/marina-bay.png", en: "Marina Bay Sands", zh: "\u6ee8\u6d77\u6e7e\u91d1\u6c99", tagEn: "Landmark", tagZh: "\u57ce\u5e02\u5730\u6807", bodyEn: "Water, architecture and evening light set Singapore's opening scene.", bodyZh: "\u6c34\u5cb8\u3001\u5efa\u7b51\u4e0e\u591c\u8272\uff0c\u4e3a\u65b0\u52a0\u5761\u65c5\u7a0b\u6253\u5f00\u7b2c\u4e00\u5e55\u3002" },
  { key: "gardens", image: "/images/landing/attractions/gardens-by-the-bay.png", en: "Gardens by the Bay", zh: "\u6ee8\u6d77\u6e7e\u82b1\u56ed", tagEn: "Nature", tagZh: "\u57ce\u5e02\u81ea\u7136", bodyEn: "Supertrees and tropical gardens soften the rhythm of the city.", bodyZh: "\u64ce\u5929\u6811\u4e0e\u70ed\u5e26\u82b1\u56ed\uff0c\u8ba9\u57ce\u5e02\u7684\u8282\u594f\u6162\u4e0b\u6765\u3002" },
  { key: "chinatown", image: "/images/landing/attractions/chinatown.png", en: "Chinatown", zh: "\u725b\u8f66\u6c34", tagEn: "Heritage", tagZh: "\u4f20\u7edf\u8857\u533a", bodyEn: "Lantern-lit lanes, temple courtyards and local food culture.", bodyZh: "\u706f\u7b3c\u8857\u666f\u3001\u5e99\u5b87\u5ead\u9662\u4e0e\u5730\u9053\u7f8e\u98df\u3002" },
  { key: "kampong", image: "/images/landing/attractions/kampong-glam.png", en: "Kampong Glam", zh: "\u7518\u699a\u683c\u5357", tagEn: "Culture", tagZh: "\u591a\u5143\u6587\u5316", bodyEn: "A colourful heritage quarter shaped by craft, textiles and cafes.", bodyZh: "\u7531\u624b\u4f5c\u3001\u7eba\u7ec7\u54c1\u4e0e\u5496\u5561\u9986\u6784\u6210\u7684\u7f24\u7eb7\u8857\u533a\u3002" },
  { key: "india", image: "/images/landing/attractions/little-india.png", en: "Little India", zh: "\u5c0f\u5370\u5ea6", tagEn: "Local life", tagZh: "\u5728\u5730\u751f\u6d3b", bodyEn: "Spice, colour and everyday life in a vivid neighbourhood.", bodyZh: "\u9999\u6599\u3001\u8272\u5f69\u4e0e\u9c9c\u660e\u7684\u65e5\u5e38\u751f\u6d3b\u8282\u594f\u3002" },
  { key: "merlion", image: "/images/landing/attractions/merlion.png", en: "Merlion at Marina Bay", zh: "\u9c7c\u5c3e\u72ee\u4e0e\u6ee8\u6d77\u6e7e", tagEn: "Waterfront", tagZh: "\u6ee8\u6c34\u5730\u6807", bodyEn: "A familiar symbol with the bay and skyline held in one frame.", bodyZh: "\u5c06\u5730\u6807\u3001\u6d77\u6e7e\u4e0e\u5929\u9645\u7ebf\u6536\u8fdb\u540c\u4e00\u89c6\u91ce\u3002" },
];

export default function AttractionStorySection({ copy, zh }) {
  const { scope } = useGsapContext(({ gsap, ScrollTrigger }) => {
    if (!ScrollTrigger) return undefined;
    const cards = scope.current?.querySelectorAll(".attraction-chapter");
    cards?.forEach((card) => {
      const image = card.querySelector("img");
      ScrollTrigger.create({
        trigger: card,
        start: "top 82%",
        once: true,
        onEnter: () => {
          gsap.fromTo(card, { autoAlpha: 0.38, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.75, ease: "power3.out", overwrite: true });
          gsap.fromTo(image, { scale: 1.12 }, { scale: 1, duration: 1.15, ease: "power2.out", overwrite: true });
        },
      });
      gsap.to(image, { yPercent: -7, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: 0.55 } });
    });
  }, []);

  return (
    <section ref={scope} className="attraction-story" id="singapore-stories" data-testid="singapore-attraction-story" aria-labelledby="attraction-story-title">
      <header className="atlas-section-heading attraction-story__heading">
        <p className="atlas-kicker">{copy.eyebrow}</p>
        <h2 id="attraction-story-title">{copy.title}</h2>
        <p>{copy.body}</p>
      </header>
      <div className="attraction-story__chapters">
        {places.map((place, index) => (
          <article className={`attraction-chapter attraction-chapter--${index % 2 ? "reverse" : "forward"}`} key={place.key}>
            <figure className="attraction-chapter__visual">
              <img src={publicAssetPath(place.image)} alt={`${zh ? place.zh : place.en} - Singapore travel chapter`} />
              <figcaption>{String(index + 1).padStart(2, "0")}</figcaption>
            </figure>
            <div className="attraction-chapter__copy">
              <span>{zh ? place.tagZh : place.tagEn}</span>
              <h3>{zh ? place.zh : place.en}</h3>
              <p>{zh ? place.bodyZh : place.bodyEn}</p>
              <i aria-hidden="true" />
            </div>
          </article>
        ))}
      </div>
      <Link className="attraction-story__link" to="/discover/singapore">{copy.action}<ArrowUpRight size={17} /></Link>
    </section>
  );
}
