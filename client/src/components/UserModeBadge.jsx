const labels = {
  en: {
    guest: "Guest Mode",
    registered: "Registered User",
    administrator: "System Administrator"
  },
  zh: {
    guest: "\u8bbf\u5ba2\u6a21\u5f0f",
    registered: "\u6ce8\u518c\u7528\u6237",
    administrator: "\u7cfb\u7edf\u7ba1\u7406\u5458"
  }
};

export function userModeKey(user) {
  if (user?.role === "admin") return "administrator";
  return user?.accountType === "GUEST" ? "guest" : "registered";
}

export default function UserModeBadge({ user, language, tone = "light" }) {
  const mode = userModeKey(user);
  return (
    <span
      data-testid="user-mode-badge"
      className={`user-mode-badge user-mode-badge--${mode} ${tone === "dark" ? "user-mode-badge--dark" : ""}`}
    >
      {labels[language][mode]}
    </span>
  );
}
