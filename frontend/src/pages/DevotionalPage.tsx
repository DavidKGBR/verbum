import { useEffect, useState } from "react";
import {
  fetchDevotionalPlans,
  fetchDevotionalPlan,
  fetchDevotionalDay,
  type DevotionalPlan,
  type DevotionalPlanFull,
  type DevotionalDayReading,
  type OriginalTerm,
} from "../services/api";

function OriginalTermCard({ term }: { term: OriginalTerm }) {
  const isHebrew = term.language === "hebrew";
  return (
    <div className="mx-5 mt-4 rounded-lg border border-[var(--color-gold)]/25 bg-gradient-to-br from-amber-50/60 to-white overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Language badge */}
        <span className="shrink-0 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold-dark)]">
          {isHebrew ? "Hebrew" : "Greek"}
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
  const [plans, setPlans] = useState<DevotionalPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DevotionalPlanFull | null>(null);
  const [dayReading, setDayReading] = useState<DevotionalDayReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [dayLoading, setDayLoading] = useState(false);

  useEffect(() => {
    fetchDevotionalPlans().then(setPlans).catch(() => {});
  }, []);

  const handleSelectPlan = (planId: string) => {
    setLoading(true);
    setDayReading(null);
    fetchDevotionalPlan(planId)
      .then((plan) => {
        setSelectedPlan(plan);
        // Auto-load day 1
        return fetchDevotionalDay(planId, 1);
      })
      .then(setDayReading)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleSelectDay = (day: number) => {
    if (!selectedPlan) return;
    setDayLoading(true);
    fetchDevotionalDay(selectedPlan.id, day)
      .then(setDayReading)
      .catch(() => setDayReading(null))
      .finally(() => setDayLoading(false));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title text-3xl">Devotional</h1>
        <p className="text-sm opacity-60 mt-1">
          Guided devotional plans with daily Scripture readings and reflective
          questions.
        </p>
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
                {plan.days} day{plan.days !== 1 ? "s" : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-sm opacity-50">Loading plan...</p>}

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
              onClick={() => {
                setSelectedPlan(null);
                setDayReading(null);
              }}
              className="text-xs px-3 py-1.5 rounded border border-[var(--color-gold)]/30
                         hover:bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] transition"
            >
              All Plans
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

          {dayLoading && <p className="text-sm opacity-50">Loading reading...</p>}

          {/* Day reading */}
          {dayReading && !dayLoading && (
            <div className="rounded-lg border border-[var(--color-gold-dark)]/15 bg-white overflow-hidden">
              {/* Day header */}
              <div className="px-5 py-4 bg-[var(--color-gold)]/5 border-b border-[var(--color-gold-dark)]/10">
                <div className="text-[10px] uppercase tracking-wider opacity-40 mb-1">
                  Day {dayReading.day} of {selectedPlan.days}
                </div>
                <h3 className="font-display font-bold text-lg text-[var(--color-ink)]">
                  {dayReading.title}
                </h3>
                <div className="text-xs opacity-50 mt-1">{dayReading.passage}</div>
              </div>

              {/* Original term spotlight */}
              {dayReading.original_term && (
                <OriginalTermCard term={dayReading.original_term} />
              )}

              {/* Verse text */}
              <div className="px-5 py-4 space-y-2">
                {dayReading.verses.map((v) => (
                  <div key={v.verse_id} className="text-sm leading-relaxed">
                    <span className="text-[10px] font-bold opacity-40 mr-1">
                      {v.chapter}:{v.verse}
                    </span>
                    <span className="font-body">{v.text}</span>
                  </div>
                ))}
                {dayReading.verses.length === 0 && (
                  <p className="text-xs opacity-40 italic">
                    Verses not available for this translation.
                  </p>
                )}
              </div>

              {/* Reflection */}
              <div className="px-5 py-4 bg-amber-50/50 border-t border-[var(--color-gold-dark)]/10">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-gold-dark)] opacity-60 mb-2">
                  Reflection
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
                  ← Previous Day
                </button>
                <button
                  onClick={() => handleSelectDay(dayReading.day + 1)}
                  disabled={dayReading.day >= selectedPlan.days}
                  className="text-xs text-[var(--color-gold-dark)] hover:underline disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next Day →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
