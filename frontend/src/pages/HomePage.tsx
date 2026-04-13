import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchTranslationStats,
  fetchArcs,
  type TranslationStat,
} from "../services/api";
import VerseOfTheDay from "../components/VerseOfTheDay";
import TranslationPreview from "../components/TranslationPreview";
import { useReadingHistory } from "../hooks/useReadingHistory";

interface QuickAction {
  to: string;
  emoji: string;
  title: string;
  subtitle: string;
  accent?: boolean;
}

export default function HomePage() {
  const [translations, setTranslations] = useState<TranslationStat[]>([]);
  const [totalCrossrefs, setTotalCrossrefs] = useState<number | null>(null);
  const { getLastRead } = useReadingHistory();
  const last = getLastRead();

  useEffect(() => {
    fetchTranslationStats()
      .then((d) => setTranslations(d.translations))
      .catch(() => {});
    fetchArcs(undefined, 1, "distance")
      .then((d) => setTotalCrossrefs(d.metadata.total_crossrefs))
      .catch(() => {});
  }, []);

  const totalVerses = translations.reduce((s, t) => s + t.verses, 0);
  const totalTranslations = translations.length;
  const languages = new Set(translations.map((t) => t.language)).size;

  const quickActions: QuickAction[] = [
    last
      ? {
          to: `/reader?book=${last.book_id}&chapter=${last.chapter}&translation=${last.translation}`,
          emoji: "📖",
          title: "Continue Reading",
          subtitle: `${last.book_name || last.book_id} ${last.chapter} · ${last.translation.toUpperCase()}`,
          accent: true,
        }
      : {
          to: "/reader",
          emoji: "📖",
          title: "Start Reading",
          subtitle: "Open the Reader",
          accent: true,
        },
    {
      to: "/search",
      emoji: "🔍",
      title: "Search",
      subtitle: "Find any verse",
    },
    {
      to: "/arc-diagram",
      emoji: "🔗",
      title: "Cross-References",
      subtitle: totalCrossrefs
        ? `${totalCrossrefs.toLocaleString()} connections`
        : "Arc Diagram",
    },
    {
      to: "/bookmarks",
      emoji: "★",
      title: "Bookmarks",
      subtitle: "Saved verses",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* ─── HERO ─── */}
      <section className="relative rounded-xl p-8 md:p-12 mb-8 overflow-hidden border"
        style={{
          backgroundColor: "var(--bg-void)",
          borderColor: "rgba(196, 162, 101, 0.2)",
          backgroundImage:
            "radial-gradient(ellipse at top left, rgba(196,162,101,0.18), transparent 60%), radial-gradient(ellipse at bottom right, rgba(196,162,101,0.08), transparent 50%)",
        }}
      >
        <div className="relative">
          <p className="font-display text-[var(--color-gold)] text-xs uppercase tracking-[0.3em] mb-3 opacity-70">
            Bible Data Pipeline
          </p>
          <h1
            className="font-display font-bold text-4xl md:text-6xl leading-tight mb-4"
            style={{ color: "var(--color-parchment)" }}
          >
            The Word,
            <br />
            <span className="text-[var(--color-gold)] italic">
              quantified &amp; connected.
            </span>
          </h1>
          <p className="font-body text-lg md:text-xl max-w-2xl opacity-70 mb-8"
            style={{ color: "var(--color-parchment)" }}
          >
            &ldquo;In the beginning was the Word.&rdquo;
            <span className="opacity-50 text-sm ml-2">— John 1:1</span>
          </p>

          {/* Hero stats inline */}
          <div className="flex flex-wrap gap-6 md:gap-10 mb-8 font-display">
            <HeroStat value={totalVerses.toLocaleString()} label="verses" />
            <HeroStat value={totalTranslations.toString()} label="translations" />
            <HeroStat value={languages.toString()} label="languages" />
            <HeroStat
              value={
                totalCrossrefs !== null ? totalCrossrefs.toLocaleString() : "—"
              }
              label="cross-references"
            />
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3">
            <Link
              to="/reader"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold
                         bg-[var(--color-gold)] text-[var(--bg-void)]
                         hover:opacity-90 transition shadow-lg shadow-amber-900/30"
            >
              Start Reading &rarr;
            </Link>
            <Link
              to="/arc-diagram"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold
                         border border-[var(--color-gold)]/40 text-[var(--color-gold)]
                         hover:bg-[var(--color-gold)]/10 transition"
            >
              Explore Cross-Refs
            </Link>
          </div>
        </div>
      </section>

      {/* ─── QUICK ACTIONS ─── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickActions.map((a) => (
          <Link
            key={a.to + a.title}
            to={a.to}
            className={`rounded-lg border p-4 card-hover transition group ${
              a.accent
                ? "bg-gradient-to-br from-[var(--color-gold)]/10 to-transparent border-[var(--color-gold)]/40"
                : "bg-white"
            }`}
          >
            <div className="text-3xl mb-2">{a.emoji}</div>
            <div className="font-display font-bold text-sm group-hover:text-[var(--color-gold)] transition">
              {a.title}
            </div>
            <div className="text-xs opacity-60 mt-0.5 truncate">
              {a.subtitle}
            </div>
          </Link>
        ))}
      </section>

      {/* ─── VERSE OF THE DAY ─── */}
      <VerseOfTheDay />

      {/* ─── TRANSLATION PREVIEW ─── */}
      <TranslationPreview />

      {/* ─── TRANSLATIONS TABLE (collapsed to the bottom, reference material) ─── */}
      <div className="bg-white rounded-lg shadow-sm border p-5 mb-8 overflow-x-auto">
        <h3 className="font-display font-bold text-lg mb-3">
          Available Translations
        </h3>
        <table className="w-full text-sm min-w-[420px]">
          <thead>
            <tr className="border-b text-left opacity-60">
              <th className="pb-2 font-normal text-xs uppercase tracking-wider">ID</th>
              <th className="pb-2 font-normal text-xs uppercase tracking-wider">Language</th>
              <th className="pb-2 font-normal text-xs uppercase tracking-wider">Verses</th>
              <th className="pb-2 font-normal text-xs uppercase tracking-wider">Avg Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {translations.map((t) => (
              <tr key={t.translation_id} className="border-b last:border-0 hover:bg-gray-50 transition">
                <td className="py-2 font-mono font-bold text-[var(--color-gold)]">
                  {t.translation_id.toUpperCase()}
                </td>
                <td className="py-2">{t.language}</td>
                <td className="py-2">{t.verses.toLocaleString()}</td>
                <td className="py-2">{t.avg_sentiment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl md:text-3xl font-bold text-[var(--color-gold)]">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider opacity-50"
        style={{ color: "var(--color-parchment)" }}
      >
        {label}
      </div>
    </div>
  );
}
