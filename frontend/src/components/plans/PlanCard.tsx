import { useI18n } from "../../i18n/i18nContext";
import type { PlanDefinition, PlanId } from "./plansData";
import type { PlanProgress } from "../../hooks/useReadingPlans";

interface Props {
  plan: PlanDefinition;
  progress?: PlanProgress;
  currentDay: number;
  done: number;
  total: number;
  onStart: (id: PlanId) => void;
  onPause: (id: PlanId) => void;
  onResume: (id: PlanId) => void;
  onReset: (id: PlanId) => void;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="relative h-1.5 rounded-full bg-[var(--color-gold-dark)]/10 overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-gold)] transition-all"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
    </div>
  );
}

export default function PlanCard({
  plan,
  progress,
  currentDay,
  done,
  total,
  onStart,
  onPause,
  onResume,
  onReset,
}: Props) {
  const { t } = useI18n();
  const hasProgress = !!progress;
  const isPaused = hasProgress && progress!.paused === true;
  const isActive = hasProgress && !isPaused;

  const pct = plan.total_days > 0
    ? Math.round(((currentDay || 0) / plan.total_days) * 100)
    : 0;

  return (
    <div
      className={`rounded-lg border p-4 transition
                  ${isActive
                    ? "border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5"
                    : "border-[var(--color-gold-dark)]/20 bg-white hover:border-[var(--color-gold-dark)]/40"}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <svg className="w-6 h-6 shrink-0 text-[var(--color-gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={plan.icon} />
        </svg>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-[var(--color-ink)] truncate">
            {t(plan.titleKey)}
          </h3>
          <p className="text-xs opacity-60">{t(plan.subtitleKey)}</p>
        </div>
        {isActive && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-gold)] text-white shrink-0">
            {t("plans.active")}
          </span>
        )}
        {isPaused && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-gold-dark)]/20 text-[var(--color-gold-dark)] shrink-0">
            {t("plans.paused")}
          </span>
        )}
      </div>

      <p className="text-sm opacity-80 mb-3 leading-relaxed">{t(plan.descriptionKey)}</p>

      {hasProgress && (
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-1.5 text-xs">
            <span className="opacity-70">
              {t("plans.dayOf").replace("{day}", String(currentDay)).replace("{total}", String(plan.total_days))}
            </span>
            <span className="opacity-50 tabular-nums">
              {done} / {total} {t("plans.chAbbr")} · {pct}%
            </span>
          </div>
          <ProgressBar value={currentDay} max={plan.total_days} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!hasProgress && (
          <button
            onClick={() => onStart(plan.id)}
            className="text-sm px-3 py-1.5 rounded bg-[var(--color-gold)] text-white
                       hover:opacity-90 transition focus:outline-none
                       focus:ring-2 focus:ring-[var(--color-gold)]/60"
          >
            {t("plans.startPlan")}
          </button>
        )}
        {isActive && (
          <>
            <button
              onClick={() => onPause(plan.id)}
              className="text-xs px-3 py-1.5 rounded border hover:bg-gray-50 transition"
            >
              {t("plans.pause")}
            </button>
            <button
              onClick={() => {
                if (confirm(t("plans.confirmReset"))) {
                  onReset(plan.id);
                }
              }}
              className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 transition"
            >
              {t("plans.reset")}
            </button>
          </>
        )}
        {isPaused && (
          <>
            <button
              onClick={() => onResume(plan.id)}
              className="text-sm px-3 py-1.5 rounded bg-[var(--color-gold)] text-white
                         hover:opacity-90 transition"
            >
              {t("plans.resume")}
            </button>
            <button
              onClick={() => {
                if (confirm(t("plans.confirmReset"))) {
                  onReset(plan.id);
                }
              }}
              className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 transition"
            >
              {t("plans.reset")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
