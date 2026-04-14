import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchDictionary, type DictEntry } from "../services/api";

export default function DictionaryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<DictEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q !== query) setQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      searchDictionary(query, 100)
        .then((d) => setResults(d.results))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
      setSearchParams(query ? { q: query } : {}, { replace: true });
    }, 300);
    return () => { if (debounceRef.current !== null) clearTimeout(debounceRef.current); };
  }, [query, setSearchParams]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title text-3xl">Bible Dictionary</h1>
        <p className="text-sm opacity-60 mt-1">
          ~6,000 entries from Easton's (1897) &amp; Smith's (1863) Bible
          Dictionaries. Public domain.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, places, concepts…"
          className="w-full rounded-lg border border-[var(--color-gold-dark)]/20 px-4 py-3
                     text-sm bg-white focus:outline-none focus:ring-2
                     focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/50"
          autoFocus
        />
      </div>

      {loading && <p className="text-sm opacity-50">Searching…</p>}

      {!loading && query.length >= 2 && results.length === 0 && (
        <p className="text-sm opacity-50 italic">No entries found for "{query}".</p>
      )}

      {query.length < 2 && (
        <div className="rounded-lg border border-dashed border-[var(--color-gold-dark)]/30 p-8 text-center">
          <p className="opacity-60 mb-3">
            Type at least 2 characters to search the dictionary.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Jerusalem", "David", "Sabbath", "Passover", "Tabernacle", "Covenant"].map(
              (w) => (
                <button
                  key={w}
                  onClick={() => setQuery(w)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-gold)]/30
                             hover:bg-[var(--color-gold)]/10 transition text-[var(--color-gold-dark)]"
                >
                  {w}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {results.map((entry) => {
          const isOpen = expanded === entry.slug;
          return (
            <div
              key={entry.slug}
              className="rounded-lg border border-[var(--color-gold-dark)]/15 bg-white overflow-hidden"
            >
              <button
                onClick={() => setExpanded(isOpen ? null : entry.slug)}
                className="w-full text-left px-4 py-3 flex items-start justify-between gap-3
                           hover:bg-[var(--color-gold)]/5 transition"
              >
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-[var(--color-ink)]">
                    {entry.name}
                  </h3>
                  {!isOpen && entry.preview && (
                    <p className="text-sm opacity-60 mt-1 line-clamp-2">
                      {entry.preview}…
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.source.includes("EAS") && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]">
                      Easton
                    </span>
                  )}
                  {entry.source.includes("SMI") && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-new-testament)]/10 text-[var(--color-new-testament)]">
                      Smith
                    </span>
                  )}
                  <svg
                    className={`w-4 h-4 opacity-40 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-[var(--color-gold-dark)]/10">
                  {entry.text_easton && (
                    <div className="mt-3">
                      <h4 className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-gold-dark)] opacity-60 mb-1">
                        Easton's Bible Dictionary
                      </h4>
                      <p className="text-sm leading-relaxed font-body">{entry.text_easton}</p>
                    </div>
                  )}
                  {entry.text_smith && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-new-testament)] opacity-60 mb-1">
                        Smith's Bible Dictionary
                      </h4>
                      <p className="text-sm leading-relaxed font-body">{entry.text_smith}</p>
                    </div>
                  )}
                  <div className="flex gap-3 text-xs pt-2">
                    <Link
                      to={`/search?q=${encodeURIComponent(entry.name)}`}
                      className="text-[var(--color-gold-dark)] hover:underline"
                    >
                      Search in Bible →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
