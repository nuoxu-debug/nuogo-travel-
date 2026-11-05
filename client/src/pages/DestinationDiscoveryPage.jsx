import { ArrowRight, Compass, Lightbulb, Map, RefreshCw, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import AttractionCard, { categoryLabel } from "../components/AttractionCard.jsx";
import AttractionDiscoveryMap from "../components/AttractionDiscoveryMap.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { getStaticSingaporeDiscovery } from "../data/staticSingaporeDiscovery.js";
import AppShell from "../layout/AppShell.jsx";
import { writeAttractionDraft } from "../planning/attractionDraft.js";

const cityNames = { singapore: { zh: "\u65b0\u52a0\u5761", en: "Singapore" } };

function discoveryCopy(language) {
  const zh = language === "zh";
  return {
    zh,
    eyebrow: zh ? "\u65b0\u52a0\u5761\u666f\u70b9\u76ee\u5f55" : "Singapore catalogue",
    title: zh ? "\u53d1\u73b0\u65b0\u52a0\u5761\u666f\u70b9" : "Discover Singapore Attractions",
    body: zh ? "\u6d4f\u89c8 Nuogo \u5f53\u524d\u652f\u6301\u7684\u65b0\u52a0\u5761\u666f\u70b9\u5019\u9009\u6c60\u3002\u8fd9\u4e9b\u8d44\u6599\u7528\u4e8e\u666f\u70b9\u9009\u62e9\u3001\u9884\u7b97\u68c0\u67e5\u4e0e\u884c\u7a0b\u751f\u6210\u3002" : "Browse Nuogo's supported Singapore attraction candidate pool. These records support attraction selection, budget checks and itinerary generation.",
    definitionTitle: zh ? "\u5f53\u524d\u5b9e\u73b0\u8303\u56f4" : "Current implementation scope",
    definition: zh ? "\u5f53\u524d FYP1 \u8bd5\u70b9\u805a\u7126\u65b0\u52a0\u5761\uff0c\u5e76\u4f9d\u8d56\u53ef\u7528 POI\u3001\u9884\u7b97\u53c2\u8003\u4e0e\u884c\u7a0b\u9a8c\u8bc1\u89c4\u5219\u3002" : "The current FYP1 pilot focuses on Singapore and depends on usable POIs, budget references and itinerary validation rules.",
    pilotLabel: zh ? "FYP \u8bd5\u70b9\u76ee\u7684\u5730" : "FYP Pilot Destination",
    pilotStatus: zh ? "\u8bd5\u70b9\u53ef\u7528" : "Pilot available",
    pilotBody: zh ? "\u65b0\u52a0\u5761\u662f Nuogo \u5f53\u524d FYP \u8bd5\u70b9\u8bc4\u4f30\u76ee\u7684\u5730\uff0c\u652f\u6301\u666f\u70b9\u53d1\u73b0\u3001\u504f\u597d\u9009\u62e9\u4e0e\u884c\u7a0b\u751f\u6210\u3002" : "Singapore is Nuogo's current FYP evaluation pilot, supporting attraction discovery, preference capture and itinerary generation.",
    futureNote: zh ? "\u5176\u4ed6\u76ee\u7684\u5730\u5c5e\u4e8e\u672a\u6765\u6269\u5c55\uff0c\u4e0d\u5c5e\u4e8e\u5f53\u524d\u63d0\u4ea4\u7684 MVP \u8303\u56f4\u3002" : "Other destinations are future extensions, not part of the current submitted MVP scope.",
    modeTitle: zh ? "\u4f60\u5e0c\u671b\u5982\u4f55\u9009\u62e9\u666f\u70b9\uff1f" : "How would you like to choose attractions?",
    manual: zh ? "\u81ea\u5df1\u9009\u62e9\u666f\u70b9" : "Choose Attractions Myself",
    manualBody: zh ? "\u9009\u62e9\u5e0c\u671b Nuogo \u4f18\u5148\u8003\u8651\u7684\u65b0\u52a0\u5761\u666f\u70b9\u3002" : "Select preferred Singapore attractions for Nuogo to prioritise.",
    auto: zh ? "\u8ba9 Nuogo \u5efa\u8bae" : "Let Nuogo Suggest",
    autoBody: zh ? "\u8ba9 Nuogo \u6839\u636e\u7a0d\u540e\u586b\u5199\u7684\u504f\u597d\u9009\u62e9\u5408\u9002\u7684\u53d7\u652f\u6301\u666f\u70b9\u3002" : "Let Nuogo choose suitable supported attractions based on your later preferences.",
    autoNote: zh ? "\u8bf7\u7ee7\u7eed\u586b\u5199\u504f\u597d\uff0cNuogo \u5c06\u4f7f\u7528\u53d7\u652f\u6301\u7684\u65b0\u52a0\u5761\u666f\u70b9\u3002" : "Nuogo will use supported Singapore attractions after you enter your preferences.",
    selected: (count) => zh ? `\u5df2\u9009\u666f\u70b9\uff1a${count}` : `Selected Attractions: ${count}`,
    filters: zh ? "\u666f\u70b9\u5206\u7c7b" : "Attraction categories",
    map: zh ? "\u5730\u56fe" : "Map",
    loading: zh ? "\u6b63\u5728\u52a0\u8f7d\u65b0\u52a0\u5761\u666f\u70b9..." : "Loading Singapore attractions...",
    empty: zh ? "\u6ca1\u6709\u627e\u5230\u5339\u914d\u7684\u666f\u70b9\u3002" : "No matching attractions found.",
    failure: zh ? "\u6682\u65f6\u65e0\u6cd5\u52a0\u8f7d\u666f\u70b9\u4fe1\u606f\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002" : "We couldn't load attraction information right now. Please try again.",
    retry: zh ? "\u91cd\u8bd5" : "Try again",
    preferenceNote: zh ? "\u6240\u9009\u666f\u70b9\u5c06\u4f5c\u4e3a\u9ad8\u4f18\u5148\u7ea7\u504f\u597d\uff0c\u4ecd\u9700\u901a\u8fc7\u9884\u7b97\u4e0e\u884c\u7a0b\u53ef\u884c\u6027\u68c0\u67e5\u3002" : "Selected attractions are high-priority preferences and still pass budget and itinerary feasibility checks.",
    continue: zh ? "\u7ee7\u7eed\u586b\u5199\u504f\u597d" : "Continue to Preferences",
    poiTitle: zh ? "\u65b0\u52a0\u5761\u666f\u70b9" : "Singapore POIs",
    poiBody: zh ? "\u63a2\u7d22\u65b0\u52a0\u5761\u7684\u7cbe\u9009\u666f\u70b9\uff0c\u518d\u67e5\u770b\u8be6\u60c5\u6216\u4fdd\u5b58\u5230\u89c4\u5212\u504f\u597d\u3002" : "Explore curated Singapore places, then inspect details or save them for planning.",
  };
}

export default function DestinationDiscoveryPage() {
  const { destination } = useParams();
  const { language } = useLanguage();
  const t = discoveryCopy(language);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [mode, setMode] = useState("AUTO");
  const [selected, setSelected] = useState(new Set());
  const [focusedXid, setFocusedXid] = useState(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await apiRequest(`/meta/destinations/${destination}/attractions`);
      setResult(data);
      setFocusedXid(data.attractions.find((item) => item.coordinates?.coordinateSystem === "WGS84")?.xid ?? null);
    } catch {
      const fallback = getStaticSingaporeDiscovery(destination);
      if (fallback) {
        setResult(fallback);
        setFocusedXid(fallback.attractions.find((item) => item.coordinates?.coordinateSystem === "WGS84")?.xid ?? null);
        return;
      }
      setError(true);
    }
  }, [destination]);

  useEffect(() => {
    if (cityNames[destination]) load();
    else setError(true);
  }, [destination, load]);

  const attractions = useMemo(() => (result?.attractions ?? []).filter((item) => item.coordinates?.coordinateSystem === "WGS84"), [result]);
  const categories = useMemo(() => ["ALL", ...new Set(attractions.map(({ category }) => category))], [attractions]);
  const visible = filter === "ALL" ? attractions : attractions.filter(({ category }) => category === filter);

  useEffect(() => {
    if (!result) return;
    writeAttractionDraft({
      destination,
      mode,
      selectedAttractions: mode === "MANUAL"
        ? attractions.filter(({ xid }) => selected.has(xid)).map((item) => ({ xid: item.xid, displayName: item.name?.[language] || item.displayName?.[language] || item.name?.en }))
        : [],
    });
  }, [attractions, destination, language, mode, result, selected]);

  function chooseMode(nextMode) {
    setMode(nextMode);
    if (nextMode === "AUTO") setSelected(new Set());
  }

  function toggle(attraction) {
    if (mode !== "MANUAL") return;
    setSelected((current) => {
      const next = new Set(current);
      next.has(attraction.xid) ? next.delete(attraction.xid) : next.add(attraction.xid);
      return next;
    });
    setFocusedXid(attraction.xid);
  }

  function focusAttraction(xid) {
    setFocusedXid(xid);
    const focusCard = () => document.querySelector(`[data-attraction-xid="${xid}"]`)?.focus({ preventScroll: true });
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(focusCard);
    else focusCard();
  }

  return <AppShell><div className="discovery-page">
    <section className="discovery-hero" aria-labelledby="discovery-title">
      <div className="discovery-hero-copy">
        <p><Compass aria-hidden="true" /> {t.eyebrow}</p>
        <h1 id="discovery-title">{t.title}</h1>
        <span>{t.body}</span>
      </div>
      <aside className="discovery-definition">
        <strong>{t.definitionTitle}</strong>
        {t.definition}
      </aside>
    </section>
    <section className="destination-availability" aria-labelledby="destination-availability-title">
      <article className="destination-availability__card">
        <div>
          <span>{t.pilotLabel}</span>
          <h2 id="destination-availability-title">Singapore</h2>
          <p>{t.pilotBody}</p>
        </div>
        <strong>{t.pilotStatus}</strong>
      </article>
      <p className="destination-availability__future">{t.futureNote}</p>
    </section>
    <section className="discovery-workspace">
      {error && <div role="alert" className="discovery-state"><strong>{t.failure}</strong><button type="button" onClick={load}><RefreshCw aria-hidden="true" /> {t.retry}</button></div>}
      {!error && !result && <div className="discovery-state" aria-live="polite">{t.loading}</div>}
      {result && attractions.length === 0 && <div className="discovery-state">{t.empty}</div>}
      {result && attractions.length > 0 && <>
        <fieldset className="discovery-mode"><legend className="sr-only">{t.modeTitle}</legend><div className="discovery-mode-options" role="radiogroup" aria-label={t.modeTitle}>
          <label className="discovery-mode-option discovery-mode-option--manual"><input type="radio" name="attraction-mode" value="MANUAL" checked={mode === "MANUAL"} onChange={() => chooseMode("MANUAL")} /><span className="discovery-mode-icon"><Map aria-hidden="true" /></span><strong>{t.manual}</strong><span>{t.manualBody}</span></label>
          <label className="discovery-mode-option discovery-mode-option--auto"><input type="radio" name="attraction-mode" value="AUTO" checked={mode === "AUTO"} onChange={() => chooseMode("AUTO")} /><span className="discovery-mode-icon"><Wand2 aria-hidden="true" /></span><strong>{t.auto}</strong><span>{t.autoBody}</span></label>
        </div></fieldset>
        {mode === "AUTO" && <p className="discovery-auto-note"><Lightbulb aria-hidden="true" />{t.autoNote}</p>}
        <div className="discovery-layout">
          <div className="discovery-list-panel">
            <div className="discovery-section-heading">
              <span aria-hidden="true">◆</span>
              <div>
                <h2>{t.poiTitle}</h2>
                <p>{t.poiBody}</p>
              </div>
            </div>
            <div className="discovery-toolbar"><div role="group" aria-label={t.filters}>{categories.map((category) => <button type="button" key={category} aria-pressed={filter === category} onClick={() => setFilter(category)}>{categoryLabel(category, language)}</button>)}</div><strong aria-live="polite">{t.selected(selected.size)}</strong></div>
            <div className="discovery-list" aria-label={t.zh ? "\u65b0\u52a0\u5761\u666f\u70b9\u5217\u8868" : "Singapore attractions"}>{visible.map((attraction) => <AttractionCard key={attraction.xid} attraction={attraction} language={language} selected={selected.has(attraction.xid)} selectionEnabled={mode === "MANUAL"} onToggle={() => toggle(attraction)} onFocus={() => focusAttraction(attraction.xid)} />)}</div>
          </div>
          <div className="discovery-map-column"><AttractionDiscoveryMap attractions={attractions} selectedXids={selected} focusedXid={focusedXid} onFocus={focusAttraction} language={language} label={t.map} /></div>
        </div>
        <div className="discovery-footer"><span>{t.preferenceNote}</span><Link to="/planner" state={{ plannerScrollTarget: "preferences" }}>{t.continue}<ArrowRight aria-hidden="true" /></Link></div>
      </>}
    </section>
  </div></AppShell>;
}
