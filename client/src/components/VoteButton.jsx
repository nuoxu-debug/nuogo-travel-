import { ThumbsUp } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "../api/client.js";
import { useAnime } from "../hooks/useAnime.js";

export default function VoteButton({ token, activity, onVoted }) {
  const [busy, setBusy] = useState(false);
  const animate = useAnime();

  async function vote(event) {
    setBusy(true);
    try {
      const body = await apiRequest(`/shared/${token}/votes`, {
        method: "POST",
        body: JSON.stringify({ activityId: activity.id })
      });
      onVoted(activity.id, body.votes);
      animate({ targets: event.currentTarget, scale: [0.9, 1.12, 1], duration: 440, easing: "easeOutBack" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      disabled={busy}
      type="button"
      onClick={vote}
      aria-label={activity.votes
        ? `Vote for ${activity.name.en} (${activity.votes} vote${activity.votes === 1 ? "" : "s"})`
        : `Vote for ${activity.name.en}`}
      className="flex min-h-9 items-center gap-2 border border-ink/15 px-3 text-sm font-bold"
    >
      <ThumbsUp className="h-4 w-4 text-jade" /> {activity.votes}
    </button>
  );
}
