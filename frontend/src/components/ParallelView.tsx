import { useState, useEffect } from "react";
import {
  fetchBooks,
  fetchParallelPage,
  type Book,
  type ParallelPage,
} from "../services/api";
import LoadingSpinner from "./common/LoadingSpinner";

const TRANSLATIONS = ["kjv", "bbe", "nvi", "ra", "acf", "rvr", "apee", "asv", "web", "darby"];

export default function ParallelView() {
  const [books, setBooks] = useState<Book[]>([]);
  const [page, setPage] = useState<ParallelPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookId, setBookId] = useState("GEN");
  const [chapter, setChapter] = useState(1);
  const [left, setLeft] = useState("kjv");
  const [right, setRight] = useState("nvi");

  useEffect(() => {
    fetchBooks("kjv").then(setBooks).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchParallelPage(bookId, chapter, left, right)
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [bookId, chapter, left, right]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select
          value={bookId}
          onChange={(e) => { setBookId(e.target.value); setChapter(1); }}
          className="border rounded px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/60"
        >
          {books.map((b) => (
            <option key={b.book_id} value={b.book_id}>{b.book_name}</option>
          ))}
        </select>

        <select
          value={chapter}
          onChange={(e) => setChapter(Number(e.target.value))}
          className="border rounded px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/60"
        >
          {Array.from({ length: 150 }, (_, i) => i + 1).map((ch) => (
            <option key={ch} value={ch}>Ch. {ch}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 text-sm">
          <select
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/60"
          >
            {TRANSLATIONS.map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
          <span className="text-[var(--color-gold)] font-bold">vs</span>
          <select
            value={right}
            onChange={(e) => setRight(e.target.value)}
            className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/60"
          >
            {TRANSLATIONS.map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading parallel view..." />
      ) : page ? (
        <div>
          <h2 className="text-xl font-bold mb-4 text-[var(--color-ink)]">
            {page.book_name} {page.chapter}
            <span className="text-sm font-normal opacity-50 ml-2">
              {page.left_translation.toUpperCase()} vs {page.right_translation.toUpperCase()}
            </span>
          </h2>

          {/* Column headers (md+) */}
          <div className="hidden md:grid grid-cols-[2rem_1fr_1fr] gap-3 pb-2 mb-2 border-b text-xs opacity-50 uppercase tracking-wider">
            <span />
            <span>{page.left_translation.toUpperCase()}</span>
            <span>{page.right_translation.toUpperCase()}</span>
          </div>
          <div className="space-y-2">
            {page.verses.map((v) => (
              <div
                key={v.verse}
                className="border-b pb-2 grid gap-3
                           grid-cols-[2rem_1fr]
                           md:grid-cols-[2rem_1fr_1fr]"
              >
                <span className="text-xs font-bold text-[var(--color-gold)] pt-1 text-right">
                  {v.verse}
                </span>
                <div>
                  {/* Mobile label, hidden on md+ */}
                  <span className="md:hidden text-[10px] uppercase tracking-wider opacity-40 font-bold">
                    {page.left_translation.toUpperCase()}
                  </span>
                  <p className="text-sm leading-relaxed">
                    {v.left_text || <span className="opacity-30 italic">missing</span>}
                  </p>
                </div>
                <div className="md:col-start-3 col-start-2 pt-2 md:pt-0 border-t md:border-t-0 border-dashed">
                  <span className="md:hidden text-[10px] uppercase tracking-wider opacity-40 font-bold">
                    {page.right_translation.toUpperCase()}
                  </span>
                  <p className="text-sm leading-relaxed">
                    {v.right_text || <span className="opacity-30 italic">missing</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-red-600">Failed to load parallel view.</p>
      )}
    </div>
  );
}
