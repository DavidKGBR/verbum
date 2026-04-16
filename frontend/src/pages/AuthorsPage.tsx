import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchAuthors,
  fetchAuthorDetail,
  fetchAuthorBooks,
  type Author,
  type AuthorDetail,
  type AuthorBookStats,
} from "../services/api";
import AuthorCompare from "../components/authors/AuthorCompare";
import { useI18n } from "../i18n/i18nContext";
import { localized } from "../i18n/localized";

// ── Period parser ──────────────────────────────────────────────────────────

function parsePeriod(period: string): { start: number; end: number } | null {
  // Format: ~YEAR BC, ~START–END BC/AD
  const cleaned = period.replace(/~/g, "").trim();
  const isAD = cleaned.includes("AD");
  const sign = isAD ? 1 : -1;
  const numPart = cleaned.replace(/\s*(BC|AD)\s*/gi, "").trim();

  // Range: "1050–950" or "60–70"
  const rangeMatch = numPart.match(/(\d+)\s*[–\-]\s*(\d+)/);
  if (rangeMatch) {
    const a = parseInt(rangeMatch[1], 10) * sign;
    const b = parseInt(rangeMatch[2], 10) * sign;
    return { start: Math.min(a, b), end: Math.max(a, b) };
  }

  // Single year: "1400"
  const singleMatch = numPart.match(/(\d+)/);
  if (singleMatch) {
    const y = parseInt(singleMatch[1], 10) * sign;
    return { start: y, end: y };
  }

  return null;
}

export default function AuthorsPage() {
  const { t, locale } = useI18n();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "OT" | "NT">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuthorDetail | null>(null);
  const [bookStats, setBookStats] = useState<AuthorBookStats[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchAuthors(filter === "all" ? undefined : filter)
      .then(setAuthors)
      .catch(() => setAuthors([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const handleExpand = (authorId: string) => {
    if (expanded === authorId) {
      setExpanded(null);
      setDetail(null);
      setBookStats([]);
      return;
    }
    setExpanded(authorId);
    setDetailLoading(true);
    Promise.all([fetchAuthorDetail(authorId), fetchAuthorBooks(authorId)])
      .then(([d, b]) => {
        setDetail(d);
        setBookStats(b);
      })
      .catch(() => {
        setDetail(null);
        setBookStats([]);
      })
      .finally(() => setDetailLoading(false));
  };

  // ── Summary stats (computed from loaded authors) ───────────────────────
  const totalBooks = authors.reduce((s, a) => s + a.books.length, 0);
  const otCount = authors.filter((a) => a.testament === "OT").length;
  const ntCount = authors.filter((a) => a.testament === "NT").length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title text-3xl">{t("authors.title")}</h1>
        <p className="text-sm opacity-60 mt-1">
          {t("authors.subtitle")}
        </p>
      </div>

      {/* Summary stats */}
      {!loading && authors.length > 0 && (
        <div className="flex gap-3 mb-5 flex-wrap">
          {[
            { label: t("authors.stats.authors"), value: authors.length },
            { label: t("authors.stats.books"), value: totalBooks },
            { label: t("authors.stats.ot"), value: t("authors.stats.nAuthors").replace("{n}", String(otCount)) },
            { label: t("authors.stats.nt"), value: t("authors.stats.nAuthors").replace("{n}", String(ntCount)) },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/15"
            >
              <span className="text-sm font-bold text-[var(--color-gold-dark)]">
                {s.value}
              </span>
              <span className="text-[10px] uppercase tracking-wider opacity-50">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Historical timeline */}
      {!loading && authors.length > 0 && (
        <AuthorTimeline authors={authors} />
      )}

      {/* Filter chips + Compare toggle */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        {(["all", "OT", "NT"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-4 py-1.5 rounded-full border transition ${
              filter === f
                ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
                : "border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]"
            }`}
          >
            {f === "all"
              ? t("authors.filter.all")
              : f === "OT"
                ? t("authors.filter.ot")
                : t("authors.filter.nt")}
          </button>
        ))}
        <span className="w-px h-4 bg-gray-200 mx-1" />
        <button
          onClick={() => {
            setCompareMode(!compareMode);
            setCompareSelection([]);
          }}
          className={`text-xs px-4 py-1.5 rounded-full border transition ${
            compareMode
              ? "bg-blue-500 text-white border-blue-500"
              : "border-blue-200 hover:bg-blue-50 text-blue-500"
          }`}
        >
          {compareMode ? t("authors.compare.cancel") : t("authors.compare.toggle")}
        </button>
        {compareMode && compareSelection.length > 0 && (
          <span className="text-[10px] opacity-50">
            {t("authors.compare.selected").replace("{n}", String(compareSelection.length))}
          </span>
        )}
      </div>

      {/* Comparison panel */}
      {compareMode && compareSelection.length === 2 && (() => {
        const a = authors.find((x) => x.author_id === compareSelection[0]);
        const b = authors.find((x) => x.author_id === compareSelection[1]);
        if (!a || !b) return null;
        return (
          <AuthorCompare
            authors={[a, b]}
            onClose={() => {
              setCompareMode(false);
              setCompareSelection([]);
            }}
          />
        );
      })()}

      {loading && <p className="text-sm opacity-50">{t("authors.loading")}</p>}

      {/* Author cards */}
      <div className="space-y-3">
        {authors.map((author) => {
          const isOpen = expanded === author.author_id;
          const isSelected = compareSelection.includes(author.author_id);
          return (
            <div
              key={author.author_id}
              className={`rounded-lg border bg-white overflow-hidden transition ${
                isSelected
                  ? "border-blue-400 ring-2 ring-blue-200"
                  : "border-[var(--color-gold-dark)]/15"
              }`}
            >
              <div className="flex items-start">
                {/* Compare checkbox */}
                {compareMode && (
                  <button
                    onClick={() => {
                      setCompareSelection((prev) =>
                        prev.includes(author.author_id)
                          ? prev.filter((id) => id !== author.author_id)
                          : prev.length < 2
                            ? [...prev, author.author_id]
                            : prev
                      );
                    }}
                    className={`shrink-0 w-8 flex items-center justify-center self-stretch
                               border-r transition ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : "bg-gray-50 text-gray-300 hover:bg-blue-50 hover:text-blue-400"
                    }`}
                  >
                    {isSelected ? "✓" : "○"}
                  </button>
                )}
              <button
                onClick={() => !compareMode && handleExpand(author.author_id)}
                className="flex-1 text-left px-4 py-3 flex items-start justify-between gap-3
                           hover:bg-[var(--color-gold)]/5 transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-[var(--color-ink)]">
                      {localized(author, locale, "name")}
                    </h3>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      author.testament === "OT"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-[var(--color-new-testament)]/10 text-[var(--color-new-testament)]"
                    }`}>
                      {author.testament}
                    </span>
                  </div>
                  <p className="text-xs opacity-50 mt-0.5">
                    {localized(author, locale, "period")} · {localized(author, locale, "literary_style")}
                  </p>
                  {!isOpen && (
                    <p className="text-sm opacity-60 mt-1 line-clamp-1">
                      {author.books.length} {author.books.length !== 1 ? t("authors.books") : t("authors.book")}: {author.books.join(", ")}
                    </p>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 opacity-40 transition-transform shrink-0 mt-1 ${isOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              </div>{/* end flex items-start */}

              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-[var(--color-gold-dark)]/10">
                  {/* Description */}
                  <p className="text-sm leading-relaxed font-body mt-3">
                    {localized(author, locale, "description")}
                  </p>

                  {/* Books */}
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-2">
                      {t("authors.booksWritten")}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {author.books.map((bookId) => (
                        <Link
                          key={bookId}
                          to={`/reader?book=${bookId}&chapter=1`}
                          className="text-xs px-2.5 py-1 rounded border border-[var(--color-gold)]/30
                                     hover:bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] transition"
                        >
                          {bookId}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Vocabulary stats */}
                  {detailLoading && (
                    <p className="text-xs opacity-50">{t("authors.loadingVocab")}</p>
                  )}
                  {!detailLoading && detail?.stats && detail.stats.unique_strongs > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-2">
                        {t("authors.vocabFingerprint")}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        <div className="text-center p-2 rounded bg-[var(--color-gold)]/5">
                          <div className="text-lg font-bold text-[var(--color-gold-dark)]">
                            {detail.stats.unique_strongs.toLocaleString()}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider opacity-50">
                            {t("authors.uniqueWords")}
                          </div>
                        </div>
                        <div className="text-center p-2 rounded bg-[var(--color-gold)]/5">
                          <div className="text-lg font-bold text-[var(--color-gold-dark)]">
                            {detail.stats.total_words.toLocaleString()}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider opacity-50">
                            {t("authors.totalWords")}
                          </div>
                        </div>
                        <div className="text-center p-2 rounded bg-[var(--color-gold)]/5">
                          <div className="text-lg font-bold text-[var(--color-gold-dark)]">
                            {detail.stats.total_verses.toLocaleString()}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider opacity-50">
                            {t("authors.verses")}
                          </div>
                        </div>
                        <div className="text-center p-2 rounded bg-[var(--color-gold)]/5">
                          <div className="text-lg font-bold text-[var(--color-gold-dark)]">
                            {detail.stats.total_words > 0
                              ? ((detail.stats.unique_strongs / detail.stats.total_words) * 100).toFixed(1)
                              : "—"}%
                          </div>
                          <div className="text-[9px] uppercase tracking-wider opacity-50">
                            {t("authors.vocabRichness")}
                          </div>
                        </div>
                      </div>

                      {/* Top words */}
                      {detail.stats.top_words && detail.stats.top_words.length > 0 && (
                        <div>
                          <h4 className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-1">
                            {t("authors.mostUsedWords")}
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {detail.stats.top_words.map((w, i) => (
                              <Link
                                key={i}
                                to={`/word-study/${w.strongs_id}`}
                                className="text-[11px] px-2 py-0.5 rounded bg-[var(--color-gold)]/10
                                           text-[var(--color-gold-dark)] hover:bg-[var(--color-gold)]/20 transition"
                                title={`${w.strongs_id} — ${w.gloss} — ${w.occurrences} ${t("authors.occurrences")}`}
                              >
                                {w.transliteration && <span className="font-semibold">{w.transliteration}</span>}
                                {w.transliteration && w.gloss ? " · " : ""}
                                {w.gloss} <span className="opacity-40">({w.occurrences})</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Book stats breakdown */}
                  {!detailLoading && bookStats.length > 0 && (
                    <BookStatsBreakdown books={bookStats} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Author Timeline ────────────────────────────────────────────────────────

function AuthorTimeline({ authors }: { authors: Author[] }) {
  const { t, locale } = useI18n();
  const items = useMemo(() => {
    const parsed = authors
      .map((a) => ({ author: a, range: parsePeriod(a.period) }))
      .filter((x): x is { author: Author; range: { start: number; end: number } } => x.range !== null);

    if (parsed.length === 0) return { entries: [], minYear: 0, maxYear: 0, span: 1 };

    const minYear = Math.min(...parsed.map((p) => p.range.start));
    const maxYear = Math.max(...parsed.map((p) => p.range.end));
    const span = maxYear - minYear || 1;

    return {
      entries: parsed,
      minYear,
      maxYear,
      span,
    };
  }, [authors]);

  if (items.entries.length === 0) return null;

  const { entries, minYear, span } = items;
  const yearToPercent = (y: number) => ((y - minYear) / span) * 100;

  // Era markers
  const eras = [
    { label: t("authors.era.patriarchs"), year: -2000 },
    { label: t("authors.era.exodus"), year: -1400 },
    { label: t("authors.era.kings"), year: -1000 },
    { label: t("authors.era.exile"), year: -586 },
    { label: t("authors.era.nt"), year: 0 },
  ].filter((e) => e.year >= minYear && e.year <= minYear + span);

  return (
    <div className="mb-5 p-4 rounded-lg border bg-white">
      <h4 className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-3">
        {t("authors.historicalTimeline")}
      </h4>

      {/* Era markers */}
      <div className="relative h-4 mb-1">
        {eras.map((era) => (
          <span
            key={era.label}
            className="absolute text-[8px] uppercase tracking-wider opacity-30 -translate-x-1/2"
            style={{ left: `${yearToPercent(era.year)}%` }}
          >
            {era.label}
          </span>
        ))}
      </div>

      {/* Timeline bar */}
      <div className="relative h-8 bg-gray-50 rounded overflow-hidden">
        {entries.map(({ author, range }) => {
          const left = yearToPercent(range.start);
          const width = Math.max(yearToPercent(range.end) - left, 0.8);
          const isOT = author.testament === "OT";

          return (
            <div
              key={author.author_id}
              className={`absolute top-1 h-6 rounded-sm cursor-default transition-opacity
                         hover:opacity-100 ${isOT ? "bg-emerald-400/60" : "bg-[var(--color-gold)]/60"}
                         group`}
              style={{ left: `${left}%`, width: `${width}%`, minWidth: "4px" }}
              title={`${localized(author, locale, "name")} — ${localized(author, locale, "period")}`}
            >
              {/* Tooltip on hover */}
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1
                             bg-[var(--color-ink)] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                {localized(author, locale, "name")} · {localized(author, locale, "period")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Year axis */}
      <div className="relative h-4 mt-1">
        <span className="absolute left-0 text-[9px] opacity-40">
          {Math.abs(minYear)} {t("common.bc")}
        </span>
        <span className="absolute right-0 text-[9px] opacity-40">
          {Math.abs(minYear + span)} {minYear + span < 0 ? t("common.bc") : t("common.ad")}
        </span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[9px] opacity-40 mt-1">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> {t("authors.stats.ot")}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--color-gold)]" /> {t("authors.stats.nt")}
        </span>
      </div>
    </div>
  );
}

// ── Book Stats Breakdown Component ─────────────────────────────────────────

function BookStatsBreakdown({ books }: { books: AuthorBookStats[] }) {
  const { t } = useI18n();
  const maxWords = Math.max(...books.map((b) => b.total_words), 1);

  function sentimentColor(s: number): string {
    if (s > 0.05) return "bg-emerald-400";
    if (s < -0.05) return "bg-rose-400";
    return "bg-amber-400";
  }

  function sentimentLabel(s: number): string {
    if (s > 0.05) return t("authors.sentiment.positive");
    if (s < -0.05) return t("authors.sentiment.negative");
    return t("authors.sentiment.neutral");
  }

  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-2">
        {t("authors.booksBreakdown")}
      </h4>
      <div className="space-y-2">
        {books.map((b) => {
          const pct = (b.total_words / maxWords) * 100;
          return (
            <div key={b.book_id} className="group">
              <div className="flex items-center gap-3">
                <Link
                  to={`/reader?book=${b.book_id}&chapter=1`}
                  className="text-xs font-bold w-12 shrink-0 text-[var(--color-gold-dark)]
                             hover:underline"
                >
                  {b.book_id}
                </Link>
                <div className="flex-1 h-5 bg-gray-50 rounded overflow-hidden relative">
                  <div
                    className={`h-full rounded ${sentimentColor(b.avg_sentiment)} opacity-60 transition-all`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-[var(--color-ink)]">
                    {b.total_words.toLocaleString()} {t("common.words")}
                  </span>
                </div>
                <span className="text-[10px] opacity-40 w-20 text-right shrink-0">
                  {b.total_chapters} {t("authors.chUnit")} · {b.total_verses} {t("authors.vsUnit")}
                </span>
              </div>
              {/* Hover detail */}
              <div className="hidden group-hover:flex gap-4 ml-15 mt-0.5 text-[10px] opacity-50 pl-15">
                <span>{b.avg_words_per_verse?.toFixed(1)} {t("authors.wordsPerVerseUnit")}</span>
                <span>{t("authors.sentimentLabel")}: {sentimentLabel(b.avg_sentiment)} ({b.avg_sentiment?.toFixed(3)})</span>
                <span>{b.category}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-2 text-[9px] opacity-40">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> {t("authors.sentimentLegend.positive")}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> {t("authors.sentimentLegend.neutral")}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> {t("authors.sentimentLegend.negative")}</span>
      </div>
    </div>
  );
}
