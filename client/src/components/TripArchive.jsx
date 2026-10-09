import { ArrowRight, CalendarDays, Copy, MoreVertical, Star, Users, View } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { resolveTripTitle } from "../i18n/display.js";

const tripImages = [
  "/images/landing/attractions/gardens-by-the-bay.png",
  "/images/landing/attractions/chinatown.png",
  "/images/attractions/sentosa.jpg",
  "/images/landing/attractions/kampong-glam.png"
];

function statusText(trip, language) {
  if (trip.objectiveAligned) return language === "zh" ? "已验证" : "Validated";
  if (trip.status === "draft") return language === "zh" ? "草稿" : "Draft";
  if (trip.status === "completed") return language === "zh" ? "已完成" : "Completed";
  return language === "zh" ? "即将出发" : "Upcoming";
}

export default function TripArchive({ trips, onDuplicate, onReuse, onOpen }) {
  const { language } = useLanguage();
  if (!trips.length) {
    return <div className="archive-empty">{language === "zh" ? "暂无已保存行程" : "No trips here yet"}</div>;
  }
  return (
    <div className="trip-archive-grid">
      {trips.map((trip, index) => {
        const title = resolveTripTitle(trip.title, language, trip.destination);
        return <article key={trip.id} className="trip-archive-card">
          <img src={tripImages[index % tripImages.length]} alt="" aria-hidden="true" />
          <div className="trip-archive-card__content">
            <button type="button" className="trip-archive-card__menu" aria-label={language === "zh" ? "行程选项" : "Trip options"}><MoreVertical aria-hidden="true" /></button>
            <h2>{title}</h2>
            <p><CalendarDays aria-hidden="true" /> {trip.startDate} - {trip.endDate}</p>
            <p><Users aria-hidden="true" /> {trip.travellerCount ?? trip.preferences?.travellerCount ?? 2} {language === "zh" ? "人" : "travellers"}</p>
            <div className="trip-archive-card__footer">
              <span className={`trip-status trip-status--${trip.objectiveAligned ? "validated" : trip.status}`}>{statusText(trip, language)}</span>
              {trip.objectiveAligned && <span className="trip-archive-card__open" aria-hidden="true"><ArrowRight aria-hidden="true" /></span>}
            </div>
          </div>
          <div className="trip-archive-card__actions">
            {trip.objectiveAligned && <button type="button" aria-label={language === "zh" ? "打开行程" : "Open itinerary"} onClick={() => onOpen(trip)}><View aria-hidden="true" /> {language === "zh" ? "打开行程" : "Open itinerary"}</button>}
            <button type="button" aria-label={language === "zh" ? "复用偏好" : "Reuse preferences"} onClick={() => onReuse(trip)}><Star aria-hidden="true" /> {language === "zh" ? "复用偏好" : "Reuse preferences"}</button>
            <button type="button" aria-label={language === "zh" ? "复制行程" : "Duplicate"} onClick={() => onDuplicate(trip)}><Copy aria-hidden="true" /> {language === "zh" ? "复制行程" : "Duplicate"}</button>
          </div>
        </article>;
      })}
    </div>
  );
}
