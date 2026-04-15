import { Link } from "react-router-dom";
import { useReadingPlans } from "../hooks/useReadingPlans";
import { PLANS, getPlanById, type ChapterRef } from "../components/plans/plansData";
import PlanCard from "../components/plans/PlanCard";
import { useBooks, localizeBookName } from "../i18n/bookNames";
import { useI18n } from "../i18n/i18nContext";

export default function PlansPage() {
  const { t } = useI18n();
  const books = useBooks("kjv");
  const {
    progress,
    active,
    start,
    pause,
    resume,
    reset,
    markChapter,
    unmarkChapter,
    isCompleted,
    currentDay,
    todayReading,
    scheduleProgress,
  } = useReadingPlans();

  const activeDef = active ? getPlanById(active.plan_id) : undefined;
  const todayDay = activeDef ? todayReading(activeDef, books) : null;

  function handleStart(planId: typeof PLANS[number]["id"]) {
    if (active && active.plan_id !== planId) {
      const other = getPlanById(active.plan_id);
      const title = other ? t(other.titleKey) : active.plan_id;
      if (!confirm(t("plans.confirmPause").replace("{title}", title))) return;
    }
    start(planId);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title text-3xl">{t("plans.pageTitle")}</h1>
        <p className="text-sm opacity-60 mt-1">
          {t("plans.pageSubtitle")}
        </p>
      </div>

      {/* Today's Reading — only when there's an active plan */}
      {active && activeDef && todayDay && (
        <section className="rounded-lg border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5 p-5 mb-8">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] opacity-60 font-display">
                {t("plans.todaysReading")}
              </div>
              <h2 className="font-display font-bold text-xl text-[var(--color-ink)] mt-1 flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--color-gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={activeDef.icon} />
                </svg>
                {t(activeDef.titleKey)}
              </h2>
              <p className="text-sm opacity-70 mt-1">
                {t("plans.dayOf").replace("{day}", String(currentDay(activeDef))).replace("{total}", String(activeDef.total_days))}
                {" · "}
                {todayDay.chapters.length === 1
                  ? t("plans.chapterToRead").replace("{n}", "1")
                  : t("plans.chaptersToRead").replace("{n}", String(todayDay.chapters.length))}
              </p>
            </div>
            <button
              onClick={() => pause(activeDef.id)}
              className="text-xs px-3 py-1.5 rounded border hover:bg-white transition"
            >
              {t("plans.pausePlan")}
            </button>
          </div>

          <ul className="space-y-1.5">
            {todayDay.chapters.map((ch) => (
              <TodayChapterRow
                key={ch.chapter_id}
                ch={ch}
                done={isCompleted(activeDef.id, ch.chapter_id)}
                onToggle={() =>
                  isCompleted(activeDef.id, ch.chapter_id)
                    ? unmarkChapter(activeDef.id, ch.chapter_id)
                    : markChapter(activeDef.id, ch.chapter_id)
                }
              />
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="opacity-60">
              {t("plans.doneToday")
                .replace("{done}", String(todayDay.chapters.filter((c) => isCompleted(activeDef.id, c.chapter_id)).length))
                .replace("{total}", String(todayDay.chapters.length))}
              {todayDay.chapters.length > 0 &&
                todayDay.chapters.every((c) => isCompleted(activeDef.id, c.chapter_id)) &&
                ` — ${t("plans.allDone")}`}
            </span>
            <button
              onClick={() => {
                todayDay.chapters.forEach((c) =>
                  markChapter(activeDef.id, c.chapter_id)
                );
              }}
              className="text-[var(--color-gold-dark)] hover:underline"
            >
              {t("plans.markAllDone")}
            </button>
          </div>
        </section>
      )}

      {/* Plan grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {PLANS.map((plan) => {
          const p = progress[plan.id];
          const { done, total } = scheduleProgress(plan, books);
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              progress={p}
              currentDay={currentDay(plan)}
              done={done}
              total={total}
              onStart={handleStart}
              onPause={pause}
              onResume={resume}
              onReset={reset}
            />
          );
        })}
      </div>
    </div>
  );
}

function TodayChapterRow({
  ch,
  done,
  onToggle,
}: {
  ch: ChapterRef;
  done: boolean;
  onToggle: () => void;
}) {
  const { locale } = useI18n();
  const readerLink = `/reader?book=${ch.book_id}&chapter=${ch.chapter}&translation=kjv`;
  return (
    <li className="flex items-center gap-2">
      <button
        onClick={onToggle}
        aria-label={done ? "Mark as not read" : "Mark as read"}
        aria-pressed={done}
        className={`w-5 h-5 shrink-0 rounded border-2 transition
                   flex items-center justify-center
                   focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/60 ${
                     done
                       ? "bg-[var(--color-gold)] border-[var(--color-gold)]"
                       : "border-[var(--color-gold-dark)]/40 hover:border-[var(--color-gold)]"
                   }`}
      >
        {done && (
          <svg
            className="w-3 h-3 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <Link
        to={readerLink}
        className={`text-sm flex-1 ${
          done
            ? "opacity-50 line-through decoration-[var(--color-gold-dark)]/40"
            : "hover:text-[var(--color-gold-dark)]"
        }`}
      >
        {localizeBookName(ch.book_id, locale, ch.book_name)} {ch.chapter}
      </Link>
    </li>
  );
}
