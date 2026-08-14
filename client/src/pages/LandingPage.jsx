import {
  ArrowDown,
  ArrowRight,
  Check,
  Database,
  MapPinned,
  Route,
  ShieldCheck,
  Sparkles,
  WalletCards
} from "lucide-react";
import { Link } from "react-router-dom";
import RouteConstellation from "../components/RouteConstellation.jsx";
import ScrollJourneyMap from "../components/ScrollJourneyMap.jsx";
import AppShell from "../layout/AppShell.jsx";
import { useGsapContext } from "../motion/useGsapContext.js";

const journeyStops = [
  { label: "Departure", meta: "Your starting point", type: "origin" },
  { label: "Stop 01", meta: "First stay", type: "city" },
  { label: "Stop 02", meta: "Connected route", type: "connection" },
  { label: "Stop 03", meta: "Final stay", type: "city" }
];

const strategies = [
  {
    name: "Budget-Saving",
    code: "BS",
    tone: "jade",
    location: "Lower-cost route",
    position: "18% center",
    promise: "Protect more of your budget without dropping the sights that matter.",
    choices: ["Lower reference tiers", "Public transport first", "Free and high-value POIs"]
  },
  {
    name: "Balanced",
    code: "BA",
    tone: "sky",
    location: "Flexible route",
    position: "54% center",
    promise: "Distribute spending across comfort, food, movement, and attractions.",
    choices: ["Mid-range stays", "Mixed local transport", "Paid and free experiences"]
  },
  {
    name: "Comfort-Focused",
    code: "CF",
    tone: "coral",
    location: "Easier route",
    position: "88% center",
    promise: "Use the same hard budget for easier movement and more comfortable choices.",
    choices: ["Comfort tiers when feasible", "More taxi flexibility", "Budget-safe fallback choices"]
  }
];

const sourceBoundaries = [
  {
    icon: MapPinned,
    label: "Place and route data",
    value: "AMap primary",
    note: "Operational POIs, coordinates, and route information for China."
  },
  {
    icon: Database,
    label: "Tourism context",
    value: "OpenTripMap support",
    note: "Supporting attraction details and source identity where available."
  },
  {
    icon: Sparkles,
    label: "Schedule",
    value: "AI-assisted",
    note: "The model proposes POI order, duration, and personalised reasons."
  },
  {
    icon: WalletCards,
    label: "Trip cost",
    value: "System estimate",
    note: "Nuogo calculates costs from user, provider, and reference values."
  }
];

export default function LandingPage() {
  const { scope } = useGsapContext(({ gsap, ScrollTrigger }) => {
    gsap.fromTo("[data-flight-intro]", {
      y: 32,
      opacity: 0,
      clipPath: "inset(0 0 22% 0)"
    }, {
      y: 0,
      opacity: 1,
      clipPath: "inset(0 0 0% 0)",
      duration: 1,
      stagger: 0.09,
      ease: "expo.out"
    });

    const media = gsap.matchMedia();
    if (ScrollTrigger) {
      media.add("(min-width: 900px)", () => {
        gsap.to(".strategy-track", {
          xPercent: -66.666,
          ease: "none",
          scrollTrigger: {
            trigger: ".strategy-stage",
            start: "top top",
            end: "+=2200",
            pin: true,
            scrub: 0.85,
            anticipatePin: 1
          }
        });
      });
    }

    return () => media.revert();
  }, []);

  return (
    <AppShell dark>
      <div ref={scope} className="flight-atlas">
        <section className="flight-hero">
          <div className="flight-hero-media" aria-hidden="true">
            <img src="/images/china-journey-hero.png" alt="" />
          </div>

          <div className="flight-hero-inner">
            <div className="flight-hero-copy">
              <div data-flight-intro className="flight-edition">
                <span>China journey atlas</span>
                <span>One connected route</span>
              </div>
              <p data-flight-intro className="flight-kicker">AI-assisted. Source-aware. Budget-bound.</p>
              <h1 data-flight-intro>Plan the whole journey,<br /><span>not just the destination.</span></h1>
              <p data-flight-intro className="flight-hero-lede">
                Nuogo turns one travel brief into three grounded ways to move through China, from your origin to your return.
              </p>
              <div data-flight-intro className="flight-actions">
                <Link to="/planner" className="flight-primary-action">
                  Start planning <ArrowRight aria-hidden="true" />
                </Link>
                <a href="#journey-map" className="flight-secondary-action">
                  Follow the route <ArrowDown aria-hidden="true" />
                </a>
              </div>
            </div>

            <div data-flight-intro className="flight-manifest">
              <div className="flight-manifest-head">
                <span>Route preview</span>
                <span className="flight-status"><i /> Planning model</span>
              </div>
              <RouteConstellation stops={journeyStops} />
            </div>
          </div>

          <a href="#journey-map" className="flight-scroll-cue" aria-label="Scroll to journey map">
            <span>Scroll to trace the journey</span>
            <ArrowDown aria-hidden="true" />
          </a>
        </section>

        <ScrollJourneyMap />

        <section id="approaches" className="strategy-stage">
          <div className="strategy-track">
            {strategies.map((strategy, index) => (
              <article
                key={strategy.name}
                className={`strategy-panel strategy-${strategy.tone}`}
                style={{ "--strategy-position": strategy.position }}
              >
                <div className="strategy-panel-inner">
                  <div className="strategy-heading">
                    <span className="strategy-code">{strategy.code}</span>
                    <p>Approach {index + 1} of 3 <em>{strategy.location}</em></p>
                  </div>
                  <h2>{strategy.name}</h2>
                  <p className="strategy-promise">{strategy.promise}</p>
                  <ul>
                    {strategy.choices.map((choice) => (
                      <li key={choice}><Check aria-hidden="true" /> {choice}</li>
                    ))}
                  </ul>
                  <div className="strategy-budget-rule">
                    <ShieldCheck aria-hidden="true" />
                    <span><b>Same total budget</b>Hard constraint for every approach</span>
                  </div>
                </div>
                <div className="strategy-route-mark" aria-hidden="true">
                  <span>{index + 1}</span>
                  <Route />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="source-boundary-section">
          <div className="source-boundary-intro">
            <p className="flight-kicker">Know where every answer comes from</p>
            <h2>Travel information should arrive with a source, not a confident guess.</h2>
            <p>
              Nuogo separates facts, suggestions, and estimates so you can understand what the system knows and what it has calculated.
            </p>
          </div>
          <div className="source-boundary-list">
            {sourceBoundaries.map(({ icon: Icon, label, value, note }) => (
              <article key={label} className="source-boundary-row">
                <Icon aria-hidden="true" />
                <span>{label}</span>
                <strong>{value}</strong>
                <p>{note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="journey-close">
          <div>
            <p>Ready when your constraints are.</p>
            <h2>Choose the dates. Set the budget. See three ways forward.</h2>
          </div>
          <Link to="/planner" className="journey-close-action">
            Build my trip <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
