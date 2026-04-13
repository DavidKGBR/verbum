import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchVerses, type SearchResult } from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await searchVerses(query.trim());
      setResults(data.results);
      setTotalResults(data.total_results);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
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
    <div>
      <h2 className="text-2xl font-bold mb-4 text-[var(--color-ink)]">
        Verse Search
      </h2>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search verses (e.g., love, beginning, faith)..."
          className="flex-1 border rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/60"
        />
        <button
          type="submit"
          className="bg-[var(--color-gold)] text-white px-6 py-2 rounded-lg font-bold hover:opacity-90 transition"
        >
          Search
        </button>
      </form>

      {loading && <LoadingSpinner text="Searching..." />}

      {searched && !loading && (
        <p className="text-sm opacity-60 mb-4">
          {totalResults} results for &quot;{query}&quot;
        </p>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="text-sm opacity-50 bg-white border rounded p-4 text-center">
          No verses match your query. Try another keyword.
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
                  aria-label={`Sentiment: ${r.sentiment_label}`}
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
