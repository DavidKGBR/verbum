import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { searchVerses, type SearchResult } from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useI18n } from "../i18n/i18nContext";

const KEYWORD_SUGGESTIONS = [
  "love",
  "faith",
  "hope",
  "grace",
  "peace",
  "wisdom",
  "Jesus",
  "David",
  "Moses",
  "beginning",
  "light",
];

interface PopularVerse {
  ref: string;
  verse_id: string;
  preview: string;
}

const POPULAR_VERSES: PopularVerse[] = [
  {
    ref: "John 3:16",
    verse_id: "JHN.3.16",
    preview: "For God so loved the world...",
  },
  {
    ref: "Psalm 23:1",
    verse_id: "PSA.23.1",
    preview: "The LORD is my shepherd...",
  },
  {
    ref: "Romans 8:28",
    verse_id: "ROM.8.28",
    preview: "And we know that all things work together for good...",
  },
  {
    ref: "Philippians 4:13",
    verse_id: "PHP.4.13",
    preview: "I can do all things through Christ which strengtheneth me.",
  },
];

function verseIdToReaderLink(verseId: string): string {
  const parts = verseId.split(".");
  if (parts.length !== 3) return "/reader";
  return `/reader?book=${parts[0]}&chapter=${parts[1]}&verse=${parts[2]}`;
}

export default function SearchPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Run search on mount (or URL change) when ?q= is present.
  // Also keeps the input in sync if the user navigates via back/forward.
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q && q !== query) setQuery(q);
    if (q) void runSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const data = await searchVerses(trimmed);
      setResults(data.results);
      setTotalResults(data.total_results);
      setSearched(true);
    } catch {
      setResults([]);
      setTotalResults(0);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    // Push ?q= to the URL so reload / share / back button all work.
    setSearchParams(trimmed ? { q: trimmed } : {});
    void runSearch(trimmed);
  }

  function handleTagClick(tag: string) {
    setQuery(tag);
    setSearchParams({ q: tag });
    void runSearch(tag);
  }

  function highlightMatch(text: string): string {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.replace(regex, "<mark class='bg-yellow-200'>$1</mark>");
  }

  function goToVerse(r: SearchResult) {
    navigate(`/reader?book=${r.book_id}&chapter=${r.chapter}&verse=${r.verse}`);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="page-title text-3xl mb-4">{t("search.title")}</h2>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholderLong")}
          className="flex-1 border rounded-lg px-4 py-2 bg-white focus:outline-none
                     focus:ring-2 focus:ring-[var(--color-gold)]/50
                     focus:border-[var(--color-gold)]/60"
        />
        <button
          type="submit"
          className="bg-[var(--color-gold)] text-white px-6 py-2 rounded-lg font-bold
                     hover:opacity-90 transition focus:outline-none
                     focus:ring-2 focus:ring-[var(--color-gold)]/60"
        >
          {t("search.submit")}
        </button>
      </form>

      {loading && <LoadingSpinner text={t("search.searching")} />}

      {/* Empty state: suggestions + popular verses */}
      {!searched && !loading && (
        <div className="space-y-8 fade-in">
          <section>
            <h3 className="text-xs uppercase tracking-[0.2em] opacity-50 mb-3 font-display">
              {t("search.trySearchingFor")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {KEYWORD_SUGGESTIONS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="px-3 py-1 rounded-full border border-[var(--color-gold)]/40
                             text-sm bg-white hover:bg-[var(--color-gold)]/10
                             hover:border-[var(--color-gold)] transition
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40"
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-[0.2em] opacity-50 mb-3 font-display">
              {t("search.popularVerses")}
            </h3>
            <div className="space-y-2">
              {POPULAR_VERSES.map((v) => (
                <Link
                  key={v.verse_id}
                  to={verseIdToReaderLink(v.verse_id)}
                  className="flex items-baseline gap-3 bg-white border rounded-lg
                             px-4 py-3 hover:border-[var(--color-gold)]/50
                             hover:shadow-sm transition group
                             focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40"
                >
                  <span className="font-display font-bold text-sm text-[var(--color-gold)]
                                   shrink-0 w-28 group-hover:text-[var(--color-gold-dark)] transition">
                    {v.ref}
                  </span>
                  <span className="verse-text text-sm opacity-70 truncate">
                    {v.preview}
                  </span>
                  <span className="ml-auto text-[var(--color-gold)] opacity-0
                                   group-hover:opacity-100 transition shrink-0">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {searched && !loading && (
        <p className="text-sm opacity-60 mb-4">
          {t("search.resultsFor")
            .replace("{total}", String(totalResults))
            .replace("{query}", query)}
        </p>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="text-sm opacity-50 bg-white border rounded p-4 text-center">
          {t("search.noResults")}
        </p>
      )}

      <div className="space-y-3">
        {results.map((r) => {
          const sIcon =
            r.sentiment_label === "positive"
              ? "▲"
              : r.sentiment_label === "negative"
                ? "▼"
                : "■";
          const sClass =
            r.sentiment_label === "positive"
              ? "bg-green-100 text-green-700"
              : r.sentiment_label === "negative"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600";
          return (
            <div
              key={r.verse_id}
              role="button"
              tabIndex={0}
              onClick={() => goToVerse(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToVerse(r);
                }
              }}
              className="bg-white rounded-lg border p-4 shadow-sm cursor-pointer
                         hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
                         focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50"
            >
              <div className="flex justify-between items-start mb-1 gap-2">
                <span className="font-bold text-sm text-[var(--color-gold)]">
                  {r.reference}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded shrink-0 ${sClass}`}
                  aria-label={t("search.sentimentLabel").replace("{label}", r.sentiment_label)}
                >
                  <span aria-hidden className="mr-1">{sIcon}</span>
                  {r.sentiment_label}
                </span>
              </div>
              <p
                className="text-sm leading-relaxed break-words"
                dangerouslySetInnerHTML={{ __html: highlightMatch(r.text) }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
