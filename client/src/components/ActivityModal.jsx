import { ExternalLink, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";
import AttractionImage from "./AttractionImage.jsx";

export default function ActivityModal({ activity, open, onClose, onSave }) {
  const { language } = useLanguage();
  const animate = useAnime();
  const panel = useRef(null);
  const [values, setValues] = useState(activity);

  useEffect(() => setValues(activity), [activity]);
  useEffect(() => {
    if (open) {
      animate({
        targets: panel.current,
        translateY: [24, 0],
        opacity: [0, 1],
        duration: 420,
        easing: "easeOutExpo"
      });
    }
  }, [animate, open]);

  if (!open || !values) return null;
  const isNew = !values.id;

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/70 p-4" role="dialog" aria-modal="true" aria-label={isNew ? "Add activity" : "Edit activity"}>
      <form
        ref={panel}
        onSubmit={(event) => { event.preventDefault(); onSave({ ...values, estimatedCost: Number(values.estimatedCost) }); }}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto bg-white p-5 shadow-panel sm:p-7"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-jade">Nuogo timeline</p>
            <h2 className="mt-2 font-display text-2xl font-bold">{isNew ? (language === "zh" ? "添加行程点" : "Add activity") : (language === "zh" ? "编辑行程点" : "Edit activity")}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close activity editor" className="grid h-10 w-10 place-items-center"><X /></button>
        </div>
        {values.imageUrl && (
          <div className="mt-5">
            <AttractionImage activity={values} eager className="aspect-[16/7] w-full" />
            {values.imageAttribution && (
              <p className="mt-2 text-xs text-ink/45">{values.imageAttribution}</p>
            )}
          </div>
        )}
        <div className="mt-6 grid gap-4">
          <label>
            <span className="text-sm font-bold">{language === "zh" ? "活动名称" : "Activity name"}</span>
            <input value={values.name[language]} onChange={(event) => update("name", { ...values.name, [language]: event.target.value })} className="mt-2 min-h-11 w-full border border-ink/15 px-3" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-sm font-bold">{language === "zh" ? "开始时间" : "Start time"}</span>
              <input type="time" value={values.startTime} onChange={(event) => update("startTime", event.target.value)} className="mt-2 min-h-11 w-full border border-ink/15 px-3" />
            </label>
            <label>
              <span className="text-sm font-bold">{language === "zh" ? "结束时间" : "End time"}</span>
              <input type="time" value={values.endTime} onChange={(event) => update("endTime", event.target.value)} className="mt-2 min-h-11 w-full border border-ink/15 px-3" />
            </label>
          </div>
          <label>
            <span className="text-sm font-bold">{language === "zh" ? "预计花费" : "Estimated cost"}</span>
            <input aria-label="Estimated cost" type="number" min="0" value={values.estimatedCost} onChange={(event) => update("estimatedCost", event.target.value)} className="mt-2 min-h-11 w-full border border-ink/15 px-3" />
          </label>
          <label>
            <span className="text-sm font-bold">{language === "zh" ? "活动说明" : "Description"}</span>
            <textarea value={values.description[language]} onChange={(event) => update("description", { ...values.description, [language]: event.target.value })} rows="3" className="mt-2 w-full border border-ink/15 p-3" />
          </label>
          {values.sourceUrl && values.sourceProvider && (
            <div className="border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-bold uppercase text-ink/45">
                {language === "zh" ? "景点资料来源" : "Attraction source"}
              </p>
              {values.locationIsEstimated && (
                <p className="mt-1 text-xs font-semibold text-amber-800">
                  {language === "zh" ? "位置为路线预估" : "Estimated location"}
                </p>
              )}
              <a
                href={values.sourceUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`View ${values.sourceProvider} source`}
                className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-jade underline"
              >
                {values.sourceProvider}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
        <button type="submit" className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 bg-ink px-4 font-bold text-white">
          <Save className="h-4 w-4" /> {language === "zh" ? "保存活动" : "Save activity"}
        </button>
      </form>
    </div>
  );
}
