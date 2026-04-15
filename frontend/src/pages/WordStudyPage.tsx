import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchStrongs,
  fetchVersesByStrongs,
  fetchWordDistribution,
  type StrongsEntry,
  type BookFrequency,
} from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import WordJourney from "../components/lexicon/WordJourney";
import { useI18n } from "../i18n/i18nContext";
import { localizeBookName } from "../i18n/bookNames";

const PAGE_SIZE = 20;

export default function WordStudyPage() {
  const { strongsId } = useParams<{ strongsId: string }>();
  const { locale } = useI18n();
  const [entry, setEntry] = useState<StrongsEntry | null>(null);
  const [distribution, setDistribution] = useState<BookFrequency[]>([]);
  const [totalOccurrences, setTotalOccurrences] = useState(0);
  const [verses, setVerses] = useState<any[]>([]);
  const [totalVerses, setTotalVerses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!strongsId) return;
    setLoading(true);
    setShowAll(false);

    Promise.all([
      fetchStrongs(strongsId),
      fetchWordDistribution(strongsId).catch(() => ({
        strongs_id: strongsId,
        total_occurrences: 0,
        distribution: [],
      })),
      fetchVersesByStrongs(strongsId, 500),
    ])
      .then(([e, dist, v]) => {
        setEntry(e);
        setDistribution(dist.distribution);
        setTotalOccurrences(dist.total_occurrences);
        setVerses(v.verses);
        setTotalVerses(v.total_results);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [strongsId]);

  if (!strongsId) return <p>No Strong's ID provided.</p>;

  if (loading) return <LoadingSpinner text="Loading word study..." />;
  if (!entry)
    return (
      <div className="max-w-4xl mx-auto p-8">
        <p className="text-red-600">
          Strong's entry <strong>{strongsId}</strong> not found.
        </p>
        <Link to="/reader" className="text-[var(--color-gold-dark)] hover:underline mt-2 inline-block">
          Back to Reader
        </Link>
      </div>
    );

  const isHebrew = entry.language === "hebrew";
  const topBook = distribution[0];
  const booksCount = distribution.length;
  const maxFreq = distribution[0]?.frequency || 1;

  // Parse related Strong's from long_definition ("from H2616")
  const relatedIds = extractRelatedStrongs(entry.long_definition || "");

  const visibleVerses = showAll ? verses : verses.slice(0, PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="relative rounded-xl p-8 md:p-12 mb-8 overflow-hidden border bg-white"
           style={{ borderColor: "rgba(196, 162, 101, 0.2)" }}>
        <div className="absolute top-4 right-8 text-[160px] leading-none opacity-[0.04] pointer-events-none select-none"
             style={{ fontFamily: "serif" }}>
          {entry.original}
        </div>
        <div className="relative">
          <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-[var(--color-gold-dark)] opacity-60">
            {entry.language} · {strongsId}
          </span>
          <div className={`text-6xl md:text-7xl mt-2 mb-4 ${isHebrew ? "font-hebrew" : "font-greek"}`}>
            {entry.original}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span className="italic opacity-70">{entry.transliteration}</span>
            {entry.pronunciation && (
              <span className="font-mono text-xs opacity-50">[{entry.pronunciation}]</span>
            )}
            {entry.part_of_speech && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]">
                {entry.part_of_speech}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Occurrences" value={totalOccurrences.toLocaleString()} />
        <StatCard label="Books" value={String(booksCount)} />
        <StatCard
          label="Most frequent"
          value={topBook ? localizeBookName(topBook.book_id, locale, topBook.book_name) : "—"}
          sub={topBook ? `${topBook.frequency}×` : ""}
        />
      </div>

      {/* Definition */}
      <section className="mb-8">
        <SectionTitle>Definition</SectionTitle>
        <p className="text-lg font-body font-bold leading-snug mb-3">
          {entry.short_definition}
        </p>
        {entry.long_definition && (
          <p className="text-sm leading-relaxed opacity-80">
            {entry.long_definition}
          </p>
        )}
      </section>

      {/* Related words */}
      {relatedIds.length > 0 && (
        <section className="mb-8">
          <SectionTitle>Related Words</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {relatedIds.map((rid) => (
              <Link
                key={rid}
                to={`/word-study/${rid}`}
                className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-gold)]/30
                           hover:bg-[var(--color-gold)]/10 transition text-[var(--color-gold-dark)]"
              >
                {rid}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Translation divergence link */}
      <section className="mb-8">
        <Link
          to={`/translation-divergence?word=${strongsId}`}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border
                     border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/10
                     transition text-[var(--color-gold-dark)]"
        >
          🔀 Compare translations of this word →
        </Link>
      </section>

      {/* Word Journey — usage across eras */}
      <section className="mb-8">
        <SectionTitle>Word Journey Across Eras</SectionTitle>
        <WordJourney strongsId={strongsId} />
      </section>

      {/* Book frequency bar chart */}
      {distribution.length > 0 && (
        <section className="mb-8">
          <SectionTitle>
            Distribution by Book ({booksCount} {booksCount === 1 ? "book" : "books"})
          </SectionTitle>
          <div className="space-y-1.5">
            {distribution.map((d) => (
              <div key={d.book_id} className="flex items-center gap-3 text-sm group">
                <span className="w-24 text-right text-xs opacity-70 shrink-0 truncate">
                  {localizeBookName(d.book_id, locale, d.book_name)}
                </span>
                <div className="flex-1 h-5 bg-[var(--color-gold-dark)]/5 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all group-hover:opacity-90"
                    style={{
                      width: `${Math.max(2, (d.frequency / maxFreq) * 100)}%`,
                      backgroundColor:
                        d.testament === "Old Testament"
                          ? "var(--color-old-testament)"
                          : "var(--color-new-testament)",
                      opacity: 0.7,
                    }}
                    title={`${localizeBookName(d.book_id, locale, d.book_name)}: ${d.frequency} occurrences`}
                  />
                </div>
                <span className="text-xs tabular-nums opacity-50 w-8 text-right">
                  {d.frequency}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All occurrences */}
      <section>
        <SectionTitle>
          Occurrences ({totalVerses.toLocaleString()} verses)
        </SectionTitle>
        <div className="space-y-3">
          {visibleVerses.map((v: any) => (
            <div
              key={v.verse_id}
              className="rounded border border-[var(--color-gold-dark)]/15 bg-white p-3"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <Link
                  to={`/reader?book=${v.book_id}&chapter=${v.chapter}&verse=${v.verse}&translation=kjv`}
                  className="font-display font-bold text-[var(--color-ink)] hover:text-[var(--color-gold)] transition text-sm"
                >
                  {v.reference}
                </Link>
                <span className="text-[10px] opacity-40 shrink-0">
                  {v.book_id}
                </span>
              </div>
              <p className="text-sm font-body leading-relaxed opacity-80">
                {v.verse_text}
              </p>
            </div>
          ))}
        </div>
        {!showAll && verses.length > PAGE_SIZE && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-4 w-full py-2 rounded border border-[var(--color-gold)]/30
                       text-sm text-[var(--color-gold-dark)] hover:bg-[var(--color-gold)]/5
                       transition"
          >
            Show all {verses.length} occurrences
          </button>
        )}
      </section>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-gold-dark)]/15 bg-white p-4 text-center">
      <div className="text-2xl font-bold text-[var(--color-ink)]">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-50 mt-1">{label}</div>
      {sub && <div className="text-xs text-[var(--color-gold-dark)] mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-gold-dark)] opacity-60 mb-3 font-display">
      {children}
    </h3>
  );
}

/**
 * Extract related Strong's IDs from the long_definition.
 * Looks for patterns like "from H2616" or "from G25".
 */
function extractRelatedStrongs(text: string): string[] {
  const matches = text.match(/[HG]\d+/g);
  if (!matches) return [];
  // Dedupe and strip leading zeros
  const seen = new Set<string>();
  return matches
    .map((m) => {
      const prefix = m[0];
      const num = parseInt(m.slice(1), 10);
      return `${prefix}${num}`;
    })
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 10); // cap at 10 to avoid noise
}
