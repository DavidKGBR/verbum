import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchDevotionalPlans,
  fetchDevotionalPlan,
  fetchDevotionalDay,
  type DevotionalPlan,
  type DevotionalPlanFull,
  type DevotionalDayReading,
  type OriginalTerm,
} from "../services/api";
import { useI18n, defaultTranslationFor } from "../i18n/i18nContext";
import { localizeBookName } from "../i18n/bookNames";

// Format a passage string "GEN.1.1-GEN.1.5" as "Gênesis 1:1-5" localized.
function formatPassage(passage: string, locale: string): { label: string; bookId: string; chapter: number; verse: number } | null {
  const parts = passage.split("-");
  if (parts.length !== 2) return null;
  const start = parts[0].split(".");
  const end = parts[1].split(".");
  if (start.length !== 3 || end.length !== 3) return null;
  const bookId = start[0];
  const chStart = Number(start[1]);
  const vsStart = Number(start[2]);
  const chEnd = Number(end[1]);
  const vsEnd = Number(end[2]);
  const bookName = localizeBookName(bookId, locale, bookId);
  let range: string;
  if (chStart === chEnd) {
    range = vsStart === vsEnd ? `${chStart}:${vsStart}` : `${chStart}:${vsStart}-${vsEnd}`;
  } else {
    range = `${chStart}:${vsStart}-${chEnd}:${vsEnd}`;
  }
  return { label: `${bookName} ${range}`, bookId, chapter: chStart, verse: vsStart };
}

function OriginalTermCard({ term }: { term: OriginalTerm }) {
  const { t } = useI18n();
  const isHebrew = term.language === "hebrew";
  return (
    <div className="mx-5 mt-4 rounded-lg border border-[var(--color-gold)]/25 bg-gradient-to-br from-amber-50/60 to-white overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Language badge */}
        <span className="shrink-0 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold-dark)]">
          {isHebrew ? t("specialPassage.layer.hebrew") : t("specialPassage.layer.greek")}
        </span>
        <span className="text-[10px] text-[var(--color-gold-dark)]/60 font-mono">
          {term.strong}
        </span>
      </div>
      <div className="px-4 pb-4 text-center">
        {/* Original script — large */}
        <p
          className="text-3xl leading-relaxed font-semibold text-[var(--color-ink)]"
          dir={isHebrew ? "rtl" : "ltr"}
          lang={isHebrew ? "he" : "grc"}
        >
          {term.text}
        </p>
        {/* Transliteration */}
        <p className="text-sm italic text-[var(--color-gold-dark)] mt-1">
          {term.transliteration}
        </p>
        {/* Meaning */}
        <p className="text-xs text-[var(--color-ink)]/70 mt-2 max-w-md mx-auto leading-relaxed">
          {term.meaning}
        </p>
      </div>
    </div>
  );
}

export default function DevotionalPage() {
  const { t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState<DevotionalPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DevotionalPlanFull | null>(null);
  const [dayReading, setDayReading] = useState<DevotionalDayReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [dayLoading, setDayLoading] = useState(false);

  const planIdInUrl = searchParams.get("plan");

  useEffect(() => {
    fetchDevotionalPlans(locale).then(setPlans).catch(() => {});
  }, [locale]);

  // Plan state is derived from URL. When ?plan=xxx present, fetch it;
  // when absent (incl. after navbar click resets URL), show plan list.
  useEffect(() => {
    if (!planIdInUrl) {
      setSelectedPlan(null);
      setDayReading(null);
      return;
    }
    setLoading(true);
    setDayReading(null);
    fetchDevotionalPlan(planIdInUrl, locale)
      .then((plan) => {
        setSelectedPlan(plan);
        return fetchDevotionalDay(planIdInUrl, 1, defaultTranslationFor(locale), locale);
      })
      .then((d) => d && setDayReading(d))
      .catch(() => {
        setSelectedPlan(null);
        setDayReading(null);
      })
      .finally(() => setLoading(false));
  }, [planIdInUrl, locale]);

  const handleSelectPlan = (planId: string) => {
    setSearchParams({ plan: planId });
  };

  const handleSelectDay = (day: number) => {
    if (!selectedPlan) return;
    setDayLoading(true);
    fetchDevotionalDay(selectedPlan.id, day, defaultTranslationFor(locale), locale)
      .then(setDayReading)
      .catch(() => setDayReading(null))
      .finally(() => setDayLoading(false));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title text-3xl">{t("devotional.title")}</h1>
        <p className="text-sm opacity-60 mt-1">{t("devotional.subtitle")}</p>
      </div>

      {/* Plan cards */}
      {!selectedPlan && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => handleSelectPlan(plan.id)}
              className="text-left p-5 rounded-lg border border-[var(--color-gold-dark)]/15
                         bg-white hover:bg-[var(--color-gold)]/5 transition group"
            >
              <h3 className="font-display font-bold text-lg text-[var(--color-ink)] group-hover:text-[var(--color-gold-dark)]">
                {plan.title}
              </h3>
              <p className="text-sm opacity-60 mt-1">{plan.description}</p>
              <div className="text-xs opacity-40 mt-3">
                {(plan.days === 1 ? t("devotional.day") : t("devotional.days")).replace(
                  "{n}",
                  String(plan.days),
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-sm opacity-50">{t("devotional.loadingPlan")}</p>}

      {/* Selected plan view */}
      {selectedPlan && !loading && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-display font-bold text-[var(--color-ink)]">
                {selectedPlan.title}
              </h2>
              <p className="text-sm opacity-50">{selectedPlan.description}</p>
            </div>
            <button
              onClick={() => setSearchParams({})}
              className="text-xs px-3 py-1.5 rounded border border-[var(--color-gold)]/30
                         hover:bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] transition"
            >
              {t("devotional.allPlans")}
            </button>
          </div>

          {/* Day selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedPlan.readings.map((r) => (
              <button
                key={r.day}
                onClick={() => handleSelectDay(r.day)}
                className={`w-9 h-9 rounded-full text-xs font-bold transition ${
                  dayReading?.day === r.day
                    ? "bg-[var(--color-gold)] text-white"
                    : "border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]"
                }`}
                title={r.title}
              >
                {r.day}
              </button>
            ))}
          </div>

          {dayLoading && <p className="text-sm opacity-50">{t("devotional.loadingReading")}</p>}

          {/* Day reading */}
          {dayReading && !dayLoading && (
            <div className="rounded-lg border border-[var(--color-gold-dark)]/15 bg-white overflow-hidden">
              {/* Day header */}
              <div className="px-5 py-4 bg-[var(--color-gold)]/5 border-b border-[var(--color-gold-dark)]/10">
                <div className="text-[10px] uppercase tracking-wider opacity-40 mb-1">
                  {t("devotional.dayOf")
                    .replace("{day}", String(dayReading.day))
                    .replace("{total}", String(selectedPlan.days))}
                </div>
                <h3 className="font-display font-bold text-lg text-[var(--color-ink)]">
                  {dayReading.title}
                </h3>
                {(() => {
                  const p = formatPassage(dayReading.passage, locale);
                  if (!p) {
                    return <div className="text-xs opacity-50 mt-1">{dayReading.passage}</div>;
                  }
                  return (
                    <Link
                      to={`/reader?book=${p.bookId}&chapter=${p.chapter}&verse=${p.verse}&translation=${dayReading.translation}`}
                      className="text-xs opacity-60 hover:opacity-100 hover:underline mt-1 inline-flex items-center gap-1 text-[var(--color-gold-dark)]"
                      title={t("devotional.openInReader")}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {p.label}
                    </Link>
                  );
                })()}
              </div>

              {/* Original term spotlight */}
              {dayReading.original_term && (
                <OriginalTermCard term={dayReading.original_term} />
              )}

              {/* Verse text */}
              <div className="px-5 py-4 space-y-2">
                {dayReading.verses.map((v) => {
                  const bookId = v.verse_id.split(".")[0] ?? "";
                  return (
                    <div key={v.verse_id} className="text-sm leading-relaxed">
                      <Link
                        to={`/reader?book=${bookId}&chapter=${v.chapter}&verse=${v.verse}&translation=${dayReading.translation}`}
                        className="text-[10px] font-bold text-[var(--color-gold-dark)] opacity-60 hover:opacity-100 hover:underline mr-1"
                        title={t("devotional.openInReader")}
                      >
                        {v.chapter}:{v.verse}
                      </Link>
                      <span className="font-body">{v.text}</span>
                    </div>
                  );
                })}
                {dayReading.verses.length === 0 && (
                  <p className="text-xs opacity-40 italic">
                    {t("devotional.noVerses")}
                  </p>
                )}
              </div>

              {/* Reflection */}
              <div className="px-5 py-4 bg-amber-50/50 border-t border-[var(--color-gold-dark)]/10">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-gold-dark)] opacity-60 mb-2">
                  {t("devotional.reflection")}
                </h4>
                <p className="text-sm leading-relaxed italic text-[var(--color-ink)]">
                  {dayReading.reflection}
                </p>
              </div>

              {/* Navigation */}
              <div className="px-5 py-3 flex justify-between border-t border-[var(--color-gold-dark)]/10">
                <button
                  onClick={() => handleSelectDay(dayReading.day - 1)}
                  disabled={dayReading.day <= 1}
                  className="text-xs text-[var(--color-gold-dark)] hover:underline disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t("devotional.previousDay")}
                </button>
                <button
                  onClick={() => handleSelectDay(dayReading.day + 1)}
                  disabled={dayReading.day >= selectedPlan.days}
                  className="text-xs text-[var(--color-gold-dark)] hover:underline disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t("devotional.nextDay")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
