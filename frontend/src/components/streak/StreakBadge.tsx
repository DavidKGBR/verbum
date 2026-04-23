import { useReadingStreak } from "../../hooks/useReadingStreak";
import { useI18n } from "../../i18n/i18nContext";

export default function StreakBadge() {
  const { state, status } = useReadingStreak();
  const { t } = useI18n();

  if (status === "empty") return null;

  const isBroken = status === "broken";
  const isAlive = status === "alive";
  const isAtRisk = status === "at-risk";

  const tooltip =
    status === "alive"
      ? t("streak.alive")
      : status === "at-risk"
        ? t("streak.atRisk")
        : t("streak.broken");

  const containerClass = [
    "mt-3 mx-1 px-3 py-2 rounded border transition",
    isAlive
      ? "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 hover:bg-[var(--color-gold)]/10"
      : "",
    isAtRisk ? "border-[var(--color-gold)]/15 bg-[var(--color-gold)]/3 opacity-80" : "",
    isBroken ? "border-white/10 bg-white/5 opacity-60" : "",
  ].join(" ");

  const daysLabel = (state.current === 1 ? t("streak.days") : t("streak.days_plural"))
    .replace("{n}", String(state.current));
  const headerText = isBroken
    ? `❄️ ${t("streak.brokenHeader")}`
    : `🔥 ${daysLabel}`;

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
        {t("streak.best").replace("{n}", String(state.longest))} ·{" "}
        {t("streak.total").replace("{n}", String(state.total_chapters))}
      </div>
    </div>
  );
}
