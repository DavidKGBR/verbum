import { useReadingStreak } from "../../hooks/useReadingStreak";

/**
 * Small streak indicator for the sidebar. Renders nothing until the user
 * has read at least one chapter. Tone adapts to the streak status:
 *
 *   alive    : 🔥 N days · full gold
 *   at-risk  : 🔥 N days · muted, tooltip reminding to read today
 *   broken   : ❄️ Start again today? · very muted
 */
export default function StreakBadge() {
  const { state, status } = useReadingStreak();

  if (status === "empty") return null;

  const isBroken = status === "broken";
  const isAlive = status === "alive";
  const isAtRisk = status === "at-risk";

  const tooltip =
    status === "alive"
      ? "Your reading streak — keep it going!"
      : status === "at-risk"
        ? "Read any chapter today to keep your streak alive."
        : "Streak broken. Start a new one today.";

  const containerClass = [
    "mt-3 mx-1 px-3 py-2 rounded border transition",
    isAlive
      ? "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 hover:bg-[var(--color-gold)]/10"
      : "",
    isAtRisk ? "border-[var(--color-gold)]/15 bg-[var(--color-gold)]/3 opacity-80" : "",
    isBroken ? "border-white/10 bg-white/5 opacity-60" : "",
  ].join(" ");

  const headerText = isBroken
    ? "❄️ Start again today?"
    : `🔥 ${state.current} ${state.current === 1 ? "day" : "days"}`;

  return (
    <div className={containerClass} title={tooltip}>
      <div
        className={`text-sm font-bold ${
          isBroken ? "text-white/70" : "text-[var(--color-gold)]"
        }`}
      >
        {headerText}
      </div>
      <div className="text-[10px] opacity-60 mt-0.5 tabular-nums">
        Best: {state.longest} · Total: {state.total_chapters} ch
      </div>
    </div>
  );
}
