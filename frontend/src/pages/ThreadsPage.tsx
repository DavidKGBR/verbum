import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchThreads,
  fetchThread,
  type SemanticThread,
  type ThreadDetail,
} from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function ThreadsPage() {
  const [threads, setThreads] = useState<SemanticThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [minBooks, setMinBooks] = useState(3);

  useEffect(() => {
    setLoading(true);
    fetchThreads(minBooks)
      .then(setThreads)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [minBooks]);

  const handleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(id);
    setDetailLoading(true);
    fetchThread(id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-1">Semantic Threads</h1>
      <p className="text-sm opacity-60 mb-6">
        Hidden thematic connections that span distant books — discovered through shared
        semantic tags in the original Hebrew and Greek.
      </p>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm opacity-50">Min books:</span>
        {[2, 3, 5, 8, 10].map((n) => (
          <button
            key={n}
            onClick={() => setMinBooks(n)}
            className={`px-3 py-1 rounded-full text-xs transition ${
              minBooks === n
                ? "bg-[var(--color-gold)] text-white"
                : "bg-black/5 hover:bg-black/10"
            }`}
          >
            {n}+
          </button>
        ))}
        <span className="ml-auto text-xs opacity-40">
          {threads.length} threads found
        </span>
      </div>

      {loading ? (
        <LoadingSpinner text="Discovering threads..." />
      ) : threads.length === 0 ? (
        <p className="text-sm opacity-50">No threads found with these filters.</p>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-[var(--color-gold)]/15 bg-white overflow-hidden"
            >
              <button
                onClick={() => handleExpand(t.id)}
                className="w-full text-left p-4 hover:bg-[var(--color-gold)]/5 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {expanded === t.id ? "▾" : "▸"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-sm">
                      {t.semantic_tag}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] opacity-50">
                        {t.verse_count} verses
                      </span>
                      <span className="text-[10px] opacity-50">
                        {t.book_count} books
                      </span>
                      <span className="text-[10px] opacity-50">
                        {t.word_count} words
                      </span>
                    </div>
                  </div>
                  <div
                    className="w-16 h-2 rounded-full bg-black/5 overflow-hidden"
                    title={`Strength: ${t.strength_score.toFixed(2)}`}
                  >
                    <div
                      className="h-full rounded-full bg-[var(--color-gold)]"
                      style={{
                        width: `${Math.min(100, t.strength_score * 20)}%`,
                      }}
                    />
                  </div>
                </div>
              </button>

              {expanded === t.id && (
                <div className="px-4 pb-4 border-t border-[var(--color-gold)]/10">
                  {detailLoading ? (
                    <p className="text-sm opacity-50 py-3 animate-pulse">
                      Loading thread...
                    </p>
                  ) : detail ? (
                    <div className="pt-3 space-y-4">
                      {/* Book distribution */}
                      <div className="flex flex-wrap gap-1.5">
                        {detail.books.map((b) => (
                          <span
                            key={b.book_id}
                            className="text-[10px] px-2 py-1 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)]"
                          >
                            {b.book_id}{" "}
                            <span className="opacity-50">({b.count})</span>
                          </span>
                        ))}
                      </div>

                      {/* Verses */}
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {detail.verses.slice(0, 30).map((v) => (
                          <div
                            key={v.verse_id}
                            className="flex items-start gap-3 p-2 rounded bg-black/[0.02]"
                          >
                            <Link
                              to={`/reader?book=${v.book_id}&chapter=${v.chapter}&verse=${v.verse}&translation=kjv`}
                              className="text-xs font-mono text-[var(--color-gold-dark)] hover:underline shrink-0 w-20"
                            >
                              {v.reference || v.verse_id}
                            </Link>
                            <div className="text-xs opacity-70 flex-1">
                              <span className="font-bold opacity-50 mr-1">
                                {v.transliteration}
                              </span>
                              ({v.gloss})
                              {v.verse_text && (
                                <span className="block mt-0.5 opacity-60">
                                  {v.verse_text.slice(0, 120)}...
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {detail.verses.length > 30 && (
                          <p className="text-xs text-center opacity-40 py-2">
                            ... and {detail.verses.length - 30} more verses
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
