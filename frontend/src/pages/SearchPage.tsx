import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { searchVerses, type SearchResult } from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useI18n, defaultTranslationFor, type Locale } from "../i18n/i18nContext";
import { localizeBookName } from "../i18n/bookNames";

// Suggestions are matched against verse text via ILIKE — they must exist in
// the user's active translation, so they're locale-specific.
const KEYWORD_SUGGESTIONS: Record<Locale, string[]> = {
  en: ["love", "faith", "hope", "grace", "peace", "wisdom", "Jesus", "David", "Moses", "beginning", "light"],
  pt: ["amor", "fé", "esperança", "graça", "paz", "sabedoria", "Jesus", "Davi", "Moisés", "princípio", "luz"],
  es: ["amor", "fe", "esperanza", "gracia", "paz", "sabiduría", "Jesús", "David", "Moisés", "principio", "luz"],
};

interface PopularVerse {
  ref: string;
  verse_id: string;
  preview: string;
}

// Handpicked showcase verses — ref + first-line preview in each locale.
// The verse_id stays canonical so the Reader deep-link works universally.
const POPULAR_VERSES: Record<Locale, PopularVerse[]> = {
  en: [
    { ref: "John 3:16",        verse_id: "JHN.3.16", preview: "For God so loved the world..." },
    { ref: "Psalm 23:1",       verse_id: "PSA.23.1", preview: "The LORD is my shepherd..." },
    { ref: "Romans 8:28",      verse_id: "ROM.8.28", preview: "And we know that all things work together for good..." },
    { ref: "Philippians 4:13", verse_id: "PHP.4.13", preview: "I can do all things through Christ which strengtheneth me." },
  ],
  pt: [
    { ref: "João 3:16",        verse_id: "JHN.3.16", preview: "Porque Deus amou o mundo de tal maneira..." },
    { ref: "Salmos 23:1",      verse_id: "PSA.23.1", preview: "O Senhor é o meu pastor; nada me faltará." },
    { ref: "Romanos 8:28",     verse_id: "ROM.8.28", preview: "E sabemos que todas as coisas contribuem juntamente para o bem..." },
    { ref: "Filipenses 4:13",  verse_id: "PHP.4.13", preview: "Posso todas as coisas naquele que me fortalece." },
  ],
  es: [
    { ref: "Juan 3:16",        verse_id: "JHN.3.16", preview: "Porque de tal manera amó Dios al mundo..." },
    { ref: "Salmos 23:1",      verse_id: "PSA.23.1", preview: "Jehová es mi pastor; nada me faltará." },
    { ref: "Romanos 8:28",     verse_id: "ROM.8.28", preview: "Y sabemos que a los que aman a Dios, todas las cosas..." },
    { ref: "Filipenses 4:13",  verse_id: "PHP.4.13", preview: "Todo lo puedo en Cristo que me fortalece." },
  ],
};

const SENTIMENT_I18N: Record<string, string> = {
  positive: "search.sentiment.positive",
  negative: "search.sentiment.negative",
  neutral:  "search.sentiment.neutral",
};

/**
 * Rebuild the verse reference in the user's locale. The backend stores
 * references in English ("1 Kings 14:10"), so for PT/ES we swap the
 * book name using localizeBookName() while keeping the chapter:verse
 * numeric suffix intact. If the reference shape is unexpected we fall
 * back to the original string to avoid breaking the display.
 */
function localizedReference(
  reference: string,
  bookId: string,
  chapter: number,
  verse: number,
  locale: Locale,
): string {
  if (locale === "en") return reference;
  const m = reference.match(/^(.+?)\s+\d+:\d+$/);
  const enBookName = m?.[1] ?? bookId;
  return `${localizeBookName(bookId, locale, enBookName)} ${chapter}:${verse}`;
}

function verseIdToReaderLink(verseId: string): string {
  const parts = verseId.split(".");
  if (parts.length !== 3) return "/reader";
  return `/reader?book=${parts[0]}&chapter=${parts[1]}&verse=${parts[2]}`;
}

export default function SearchPage() {
  const { t, locale } = useI18n();
  const translation = defaultTranslationFor(locale);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Run search on mount (or URL change) when ?q= is present. Also re-runs
  // when the user switches UI locale — so a PT-BR visitor typing "amor"
  // and then switching to ES gets re-queried against the ES corpus.
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q && q !== query) setQuery(q);
    if (q) void runSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, locale]);

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      // Search inside the user's active translation so PT users hit NVI,
      // ES users hit RVR, etc. — previously always KJV → "amor" returned 0.
      const data = await searchVerses(trimmed, translation);
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
              {KEYWORD_SUGGESTIONS[locale].map((tag) => (
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
              {POPULAR_VERSES[locale].map((v) => (
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
          // The sentiment polarity on every row was computed once with TextBlob
          // on the KJV text. It doesn't reflect the PT/ES corpus shown to the
          // user (e.g. "queima esterco" reads as Neutral only because KJV's
          // "burns dung" was classified that way). Hide the badge until R7
          // recomputes sentiment per translation.  TODO(R7): re-enable for
          // all translations once the multilingual sentiment job lands.
          const showSentiment = translation === "kjv";
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
                  {localizedReference(r.reference, r.book_id, r.chapter, r.verse, locale)}
                </span>
                {showSentiment && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded shrink-0 ${sClass}`}
                    aria-label={t("search.sentimentLabel").replace("{label}", r.sentiment_label)}
                  >
                    <span aria-hidden className="mr-1">{sIcon}</span>
                    {t(SENTIMENT_I18N[r.sentiment_label] ?? "") || r.sentiment_label}
                  </span>
                )}
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
