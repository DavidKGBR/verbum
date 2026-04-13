import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchRandomVerse, type RandomVerse } from "../services/api";

export default function VerseOfTheDay() {
  const [verse, setVerse] = useState<RandomVerse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetchRandomVerse("kjv")
      .then(setVerse)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function readerLink(): string {
    if (!verse) return "/reader";
    return `/reader?book=${verse.book_id}&chapter=${verse.chapter}&verse=${verse.verse}`;
  }

  return (
    <div
      className="rounded-lg p-6 mb-8 relative overflow-hidden border"
      style={{
        backgroundColor: "var(--bg-ambient)",
        borderColor: "rgba(196, 162, 101, 0.25)",
        backgroundImage:
          "radial-gradient(circle at top right, rgba(196,162,101,0.10), transparent 60%)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-gold)] opacity-70">
          Verse of the Day
        </span>
        <button
          onClick={load}
          disabled={loading}
          title="Random verse"
          className="text-xs text-[var(--color-gold)] opacity-60 hover:opacity-100
                     disabled:opacity-30 transition"
        >
          {loading ? "..." : "↻ New"}
        </button>
      </div>

      {error ? (
        <p className="text-xs text-red-400 opacity-70">
          Could not load random verse.
        </p>
      ) : loading && !verse ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-[var(--color-gold)]/10 rounded w-3/4"></div>
          <div className="h-4 bg-[var(--color-gold)]/10 rounded w-full"></div>
          <div className="h-4 bg-[var(--color-gold)]/10 rounded w-2/3"></div>
        </div>
      ) : verse ? (
        <Link to={readerLink()} className="block group">
          <p
            className="font-body text-[var(--color-parchment)] text-lg leading-relaxed
                       relative pl-6"
          >
            <span
              className="absolute left-0 top-0 text-3xl font-display leading-none
                         text-[var(--color-gold)] opacity-50"
            >
              &ldquo;
            </span>
            {verse.text}
          </p>
          <p
            className="text-right mt-3 text-sm font-display tracking-wide
                       text-[var(--color-gold)] group-hover:text-[var(--color-gold-dark)]
                       transition"
          >
            — {verse.reference}
          </p>
        </Link>
      ) : null}
    </div>
  );
}
