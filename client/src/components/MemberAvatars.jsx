import { useLanguage } from "../context/LanguageContext.jsx";

const tones = [
  "bg-jade text-white",
  "bg-lake text-white",
  "bg-amber-100 text-amber-950",
  "bg-rose-100 text-rose-950"
];

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return [...parts[0]].slice(0, 2).join("").toUpperCase();
  return `${[...parts[0]][0]}${[...parts.at(-1)][0]}`.toUpperCase();
}

export default function MemberAvatars({ members, max = 4 }) {
  const { t } = useLanguage();
  const visible = members.slice(0, max);
  const remaining = Math.max(0, members.length - visible.length);

  if (!members.length) return null;

  return (
    <div
      className="flex -space-x-2"
      aria-label={t("collaboration.memberWaypoints")}
    >
      {visible.map((member, index) => (
        <span
          key={member.id ?? member.userId}
          role="img"
          aria-label={`${member.name}, ${t(`collaboration.roles.${member.role}`)}`}
          title={`${member.name} - ${t(`collaboration.roles.${member.role}`)}`}
          className={`grid h-9 w-9 place-items-center rounded-full border-2 border-paper text-[11px] font-extrabold shadow-sm ${tones[index % tones.length]}`}
        >
          {initials(member.name)}
        </span>
      ))}
      {remaining > 0 && (
        <span
          className="grid h-9 w-9 place-items-center rounded-full border-2 border-paper bg-ink text-[11px] font-extrabold text-white"
          aria-label={t("collaboration.moreMembers").replace("{count}", remaining)}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}
