import { ImageOff, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function AttractionImage({
  activity,
  className = "aspect-[4/3] w-full",
  eager = false
}) {
  const { language } = useLanguage();
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [activity?.imageUrl]);

  if (!activity?.imageUrl || failed) {
    return (
      <div
        className={`grid place-items-center bg-[#dfe8df] text-ink/55 ${className}`}
        data-testid={`image-fallback-${activity?.id ?? "unknown"}`}
      >
        <div className="text-center">
          {failed ? (
            <ImageOff className="mx-auto h-5 w-5" aria-hidden="true" />
          ) : (
            <MapPin className="mx-auto h-5 w-5" aria-hidden="true" />
          )}
          <span className="mt-2 block text-[10px] font-bold uppercase">
            {language === "zh" ? "\u6682\u65e0\u56fe\u7247" : "Image unavailable"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-[#dfe8df] ${className}`}>
      <img
        src={activity.imageUrl}
        alt={activity.name[language]}
        loading={eager ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
