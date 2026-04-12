import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchBooks,
  fetchReaderPage,
  type Book,
  type ReaderPage,
} from "../services/api";
import LoadingSpinner from "./common/LoadingSpinner";
import VerseActions from "./VerseActions";

const TRANSLATIONS = ["kjv", "bbe", "nvi", "ra", "acf", "rvr", "apee", "asv", "web", "darby"];

export default function BibleReader() {
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [page, setPage] = useState<ReaderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookId, setBookId] = useState(searchParams.get("book") || "GEN");
  const [chapter, setChapter] = useState(Number(searchParams.get("chapter")) || 1);
  const [translation, setTranslation] = useState(searchParams.get("translation") || "kjv");
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const highlightVerse = Number(searchParams.get("verse")) || null;
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Load book list
  useEffect(() => {
    fetchBooks(translation).then(setBooks).catch(() => {});
  }, [translation]);

  // Sync from URL params
  useEffect(() => {
    const b = searchParams.get("book");
    const c = searchParams.get("chapter");
    const t = searchParams.get("translation");
    if (b) setBookId(b);
    if (c) setChapter(Number(c));
    if (t) setTranslation(t);
  }, [searchParams]);

  // Load chapter
  useEffect(() => {
    setLoading(true);
    setActiveVerse(null);
    fetchReaderPage(bookId, chapter, translation)
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [bookId, chapter, translation]);

  // Scroll to highlighted verse
  useEffect(() => {
    if (highlightVerse && page) {
      setTimeout(() => {
        const el = verseRefs.current.get(highlightVerse);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("animate-pulse");
          setTimeout(() => el.classList.remove("animate-pulse"), 3000);
        }
      }, 100);
    }
  }, [highlightVerse, page]);

  const totalChapters = page?.total_chapters || 1;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select
          value={bookId}
          onChange={(e) => { setBookId(e.target.value); setChapter(1); }}
          className="border rounded px-3 py-2 bg-white text-sm"
        >
          {books.map((b) => (
            <option key={b.book_id} value={b.book_id}>{b.book_name}</option>
          ))}
        </select>

        <select
          value={chapter}
          onChange={(e) => setChapter(Number(e.target.value))}
          className="border rounded px-3 py-2 bg-white text-sm"
        >
          {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => (
            <option key={ch} value={ch}>Chapter {ch}</option>
          ))}
        </select>

        <select
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          className="border rounded px-3 py-2 bg-white text-sm"
        >
          {TRANSLATIONS.map((t) => (
            <option key={t} value={t}>{t.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading chapter..." />
      ) : page ? (
        <div>
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[var(--color-ink)]">
              {page.book_name} {page.chapter}
            </h2>
            <p className="text-xs opacity-50 mt-1">
              {page.testament} &middot; {page.category} &middot;{" "}
              {page.translation.toUpperCase()} &middot; {page.verse_count} verses
            </p>
          </div>

          {/* Verses */}
          <div className="space-y-1">
            {page.verses.map((v) => (
              <div
                key={v.verse}
                ref={(el) => { if (el) verseRefs.current.set(v.verse, el); }}
                className={`rounded transition-all duration-200 ${
                  highlightVerse === v.verse
                    ? "bg-yellow-100 border-l-4 border-[var(--color-gold)] pl-3"
                    : "hover:bg-[var(--color-gold)]/5"
                }`}
              >
                <div className="flex gap-3 leading-relaxed py-1 px-1">
                  <span
                    onClick={() =>
                      setActiveVerse(activeVerse === v.verse ? null : v.verse)
                    }
                    className="text-xs font-bold text-[var(--color-gold)] pt-1 w-6 shrink-0
                               text-right cursor-pointer hover:text-[var(--color-ink)] transition"
                  >
                    {v.verse}
                  </span>
                  <p className="text-[15px]">{v.text}</p>
                </div>

                {activeVerse === v.verse && (
                  <VerseActions
                    verseId={v.verse_id}
                    text={v.text}
                    translation={translation}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-4 border-t">
            <button
              disabled={!page.has_previous}
              onClick={() => setChapter(chapter - 1)}
              className="px-4 py-2 rounded bg-[var(--color-ink)] text-[var(--color-parchment)]
                         text-sm disabled:opacity-30 hover:opacity-80 transition"
            >
              Previous
            </button>
            <button
              disabled={!page.has_next}
              onClick={() => setChapter(chapter + 1)}
              className="px-4 py-2 rounded bg-[var(--color-ink)] text-[var(--color-parchment)]
                         text-sm disabled:opacity-30 hover:opacity-80 transition"
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <p className="text-red-600">Failed to load chapter.</p>
      )}
    </div>
  );
}
