import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchBooks,
  fetchReaderPage,
  fetchCrossrefCounts,
  type Book,
  type ReaderPage,
} from "../services/api";
import LoadingSpinner from "./common/LoadingSpinner";
import VerseActions from "./VerseActions";
import { useReadingHistory } from "../hooks/useReadingHistory";

const TRANSLATIONS = ["kjv", "bbe", "nvi", "ra", "acf", "rvr", "apee", "asv", "web", "darby"];

type InitialTab = "none" | "crossrefs";

export default function BibleReader() {
  const [searchParams] = useSearchParams();
  const { record } = useReadingHistory();
  const [books, setBooks] = useState<Book[]>([]);
  const [page, setPage] = useState<ReaderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookId, setBookId] = useState(searchParams.get("book") || "GEN");
  const [chapter, setChapter] = useState(Number(searchParams.get("chapter")) || 1);
  const [translation, setTranslation] = useState(searchParams.get("translation") || "kjv");
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<InitialTab>("none");
  const [crossrefCounts, setCrossrefCounts] = useState<Record<string, number>>({});
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
    setActiveTab("none");
    fetchReaderPage(bookId, chapter, translation)
      .then((p) => {
        setPage(p);
        // Record reading history
        record({
          book_id: p.book_id,
          book_name: p.book_name,
          chapter: p.chapter,
          translation: p.translation,
        });
      })
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [bookId, chapter, translation, record]);

  // Load cross-ref counts for this chapter
  useEffect(() => {
    fetchCrossrefCounts(bookId, chapter)
      .then((d) => setCrossrefCounts(d.counts))
      .catch(() => setCrossrefCounts({}));
  }, [bookId, chapter]);

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

  function openVerse(verse: number, tab: InitialTab = "none") {
    if (activeVerse === verse && activeTab === tab) {
      setActiveVerse(null);
      setActiveTab("none");
    } else {
      setActiveVerse(verse);
      setActiveTab(tab);
    }
  }

  // Esc closes active verse panel
  useEffect(() => {
    if (activeVerse === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveVerse(null);
        setActiveTab("none");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeVerse]);

  const totalChapters = page?.total_chapters || 1;

  return (
    <div className="max-w-3xl mx-auto">
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
          {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => (
            <option key={ch} value={ch}>Chapter {ch}</option>
          ))}
        </select>

        <select
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          className="border rounded px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/60"
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
          <div className="mb-6 fade-in">
            <h2 className="page-title text-3xl">
              {page.book_name} {page.chapter}
            </h2>
            <p className="text-xs opacity-50 mt-1">
              {page.testament} &middot; {page.category} &middot;{" "}
              {page.translation.toUpperCase()} &middot; {page.verse_count} verses
            </p>
          </div>

          {/* Verses */}
          <div className="space-y-0.5 fade-in">
            {page.verses.map((v) => {
              const xrefCount = crossrefCounts[v.verse_id] || 0;
              const isActive = activeVerse === v.verse;
              return (
                <div
                  key={v.verse}
                  ref={(el) => { if (el) verseRefs.current.set(v.verse, el); }}
                  className={`rounded-sm py-1 px-2 ${
                    highlightVerse === v.verse || isActive
                      ? "verse-row-active"
                      : "verse-row"
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <span
                      onClick={() => openVerse(v.verse, "none")}
                      className="verse-number text-sm pt-0.5 w-7 shrink-0
                                 text-right cursor-pointer hover:text-[var(--color-ink)] transition"
                    >
                      {v.verse}
                    </span>
                    <p className="verse-text flex-1">{v.text}</p>
                    {xrefCount > 0 && (
                      <button
                        onClick={() => openVerse(v.verse, "crossrefs")}
                        title={`${xrefCount} cross-references`}
                        className="text-[10px] shrink-0 px-1.5 py-0.5 rounded mt-0.5
                                   text-[var(--color-gold-dark)] opacity-40 hover:opacity-100
                                   hover:bg-[var(--color-gold)]/10 transition"
                      >
                        🔗 {xrefCount}
                      </button>
                    )}
                  </div>

                  {isActive && (
                    <VerseActions
                      verseId={v.verse_id}
                      text={v.text}
                      translation={translation}
                      reference={v.reference}
                      initialTab={activeTab}
                    />
                  )}
                </div>
              );
            })}
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
