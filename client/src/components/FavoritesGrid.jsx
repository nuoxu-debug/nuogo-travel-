import { Heart, MapPin } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function FavoritesGrid({ favorites }) {
  const { language } = useLanguage();
  if (!favorites.length) return <p className="text-sm text-ink/45">{language === "zh" ? "收藏喜欢的地点后，它们会出现在这里。" : "Favorite a place and it will appear here for future trips."}</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {favorites.map((favorite) => (
        <article key={favorite.id} draggable className="interactive-lift border border-ink/10 bg-paper p-4">
          <div className="flex items-center justify-between"><MapPin className="h-4 w-4 text-jade" /><Heart className="h-4 w-4 fill-vermilion text-vermilion" /></div>
          <h3 className="mt-4 font-display text-lg font-bold">{favorite.activity.name[language]}</h3>
          <p className="mt-2 text-xs text-ink/45">{favorite.activity.address[language]}</p>
        </article>
      ))}
    </div>
  );
}
