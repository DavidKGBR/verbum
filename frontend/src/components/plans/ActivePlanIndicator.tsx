/**
 * ActivePlanIndicator — persistent banner that shows the active reading
 * plan across every reader mode (Single / Parallel / Immersive /
 * Interlinear / Structural). Previously this info lived inline inside
 * BibleReader and only surfaced when the current chapter happened to be
 * in "today's" reading. Users on the Immersive book couldn't tell what
 * was left to read and ended up flying blind.
 *
 * Design decisions:
 *  - Always visible when a plan is active, regardless of current chapter.
 *  - Shows the full list of today's chapters as clickable pills so the
 *    user can jump to any of them.
 *  - Highlights whichever chapter is currently loaded (via URL param).
 *  - Collapsible to a floating pill in the bottom-right corner. State
 *    is persisted in localStorage so the user's preference sticks.
 *  - Rendered once at the ReaderPage level, above every mode, so each
 *    sub-component doesn't have to know about plans.
 */

import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useReadingPlans } from "../../hooks/useReadingPlans";
import { getPlanById } from "./plansData";
import { useBooks, localizeBookName } from "../../i18n/bookNames";
import { useI18n } from "../../i18n/i18nContext";

const STORAGE_KEY = "verbum-plan-banner-minimized";

export default function ActivePlanIndicator() {
  const { t, locale } = useI18n();
  const { active: activePlan, todayReading, isCompleted } = useReadingPlans();
  const books = useBooks("kjv");
  const [searchParams] = useSearchParams();
  const [minimized, setMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!activePlan) return null;
  const planDef = getPlanById(activePlan.plan_id);
  if (!planDef || books.length === 0) return null;
  const today = todayReading(planDef, books);
  if (!today) return null;

  const doneToday = today.chapters.filter((c) =>
    isCompleted(activePlan.plan_id, c.chapter_id)
  ).length;
  const total = today.chapters.length;
  const allDone = doneToday === total && total > 0;

  const currentBook = searchParams.get("book");
  const currentChapter = searchParams.get("chapter");
  const currentChapterId =
    currentBook && currentChapter ? `${currentBook}.${currentChapter}` : null;

  const dayLine = t("plans.dayOf")
    .replace("{day}", String(today.day))
    .replace("{total}", String(planDef.total_days));

  function toggle() {
    const next = !minimized;
    setMinimized(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* localStorage unavailable — state is session-only, no-op */
    }
  }

  // ── Minimized: floating pill bottom-right ──────────────────────────
  if (minimized) {
    return (
      <button
        onClick={toggle}
        aria-label={t("plans.banner.expand")}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2
                   rounded-full px-4 py-2 text-xs font-bold shadow-lg transition
                   bg-[var(--color-gold)] text-white hover:opacity-90
                   focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        <span className="tabular-nums">
          {dayLine} · {doneToday}/{total}
        </span>
      </button>
    );
  }

  // ── Expanded: inline banner above the reader body ──────────────────
  return (
    <div
      className="mb-5 rounded border border-[var(--color-gold)]/30
                 bg-[var(--color-gold)]/5 px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <Link
          to="/plans"
          className="inline-flex items-center gap-1.5 font-display font-bold
                     text-[var(--color-gold-dark)] hover:text-[var(--color-gold)]
                     transition focus:outline-none focus:underline"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={planDef.icon} />
          </svg>
          {t(planDef.titleKey)}
          <span className="opacity-60 ml-2 text-xs font-normal">
            · {dayLine} · {doneToday} / {total} {t("reader.readToday")}
            {allDone ? ` — ${t("plans.allDone")}` : ""}
          </span>
        </Link>
        <button
          onClick={toggle}
          aria-label={t("plans.banner.minimize")}
          title={t("plans.banner.minimize")}
          className="text-lg leading-none px-2 py-0.5 rounded opacity-50
                     hover:opacity-100 hover:bg-[var(--color-gold)]/10 transition
                     focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40"
        >
          −
        </button>
      </div>

      {/* Today's chapter pills — quick jump + visual progress */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <span className="text-[10px] uppercase tracking-wider opacity-50 mr-1">
          {t("plans.banner.todayLabel")}:
        </span>
        {today.chapters.map((c) => {
          const done = isCompleted(activePlan.plan_id, c.chapter_id);
          const isHere = c.chapter_id === currentChapterId;
          const label = `${localizeBookName(c.book_id, locale, c.book_name)} ${c.chapter}`;
          return (
            <Link
              key={c.chapter_id}
              to={`/reader?book=${c.book_id}&chapter=${c.chapter}`}
              className={`text-[11px] px-2.5 py-0.5 rounded-full border transition
                         focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40
                         ${
                           done
                             ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
                             : isHere
                               ? "border-[var(--color-gold-dark)] text-[var(--color-gold-dark)] font-bold bg-[var(--color-gold)]/10"
                               : "border-[var(--color-gold)]/30 text-[var(--color-ink)]/80 hover:border-[var(--color-gold)]/70 bg-white"
                         }`}
              aria-current={isHere ? "page" : undefined}
            >
              {done && <span className="mr-1">✓</span>}
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
