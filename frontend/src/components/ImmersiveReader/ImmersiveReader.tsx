import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchReaderPage,
  fetchBooks,
  type ReaderPage,
  type ReaderVerse,
  type Book,
} from "../../services/api";
import OrnateCorner from "./OrnateCorner";
import DropCap from "./DropCap";
import { useTranslatorNotes } from "../../hooks/useTranslatorNotes";
import { useVerseNotes } from "../../hooks/useVerseNotes";
import { parseKjvAnnotations } from "../reader/kjvAnnotations";

const VERSES_PER_PAGE = 15;
const TRANSLATIONS = ["kjv", "bbe", "nvi", "ra", "acf", "rvr", "apee", "asv", "web", "darby"];

type FlipDirection = "next" | "prev" | null;

export default function ImmersiveReader() {
  const [books, setBooks] = useState<Book[]>([]);
  const [data, setData] = useState<ReaderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookId, setBookId] = useState("GEN");
  const [chapter, setChapter] = useState(1);
  const [translation, setTranslation] = useState("kjv");
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [flipDir, setFlipDir] = useState<FlipDirection>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { notesOn, toggle: toggleNotes } = useTranslatorNotes();
  const { notes: verseNotes } = useVerseNotes();

  /**
   * Background color for a highlighted verse. Parchment-themed alpha is
   * subtle (0.12); immersive is dark so we use a stronger alpha.
   */
  function highlightBgFor(verseId: string): string | undefined {
    const cat = verseNotes[verseId]?.category;
    if (!cat) return undefined;
    return `color-mix(in srgb, var(--hl-${cat}) 22%, transparent)`;
  }
  const flipKey = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isKjv = translation === "kjv";

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    fetchBooks(translation).then(setBooks).catch(() => {});
  }, [translation]);

  useEffect(() => {
    setLoading(true);
    setSpreadIndex(0);
    fetchReaderPage(bookId, chapter, translation)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [bookId, chapter, translation]);

  // A "spread" = two pages = 2 * VERSES_PER_PAGE verses. On mobile we still
  // compute spreads the same way but only render one page at a time.
  const versesPerSpread = VERSES_PER_PAGE * 2;
  const totalSpreads = data ? Math.max(1, Math.ceil(data.verses.length / versesPerSpread)) : 0;

  const leftVerses: ReaderVerse[] = data
    ? data.verses.slice(spreadIndex * versesPerSpread, spreadIndex * versesPerSpread + VERSES_PER_PAGE)
    : [];
  const rightVerses: ReaderVerse[] = data
    ? data.verses.slice(
        spreadIndex * versesPerSpread + VERSES_PER_PAGE,
        spreadIndex * versesPerSpread + versesPerSpread
      )
    : [];

  function triggerFlip(dir: FlipDirection) {
    flipKey.current += 1; // forces re-mount of page content so animation plays
    setFlipDir(dir);
  }

  const prev = useCallback(() => {
    if (spreadIndex > 0) {
      triggerFlip("prev");
      setSpreadIndex(spreadIndex - 1);
    } else if (data?.has_previous) {
      triggerFlip("prev");
      setChapter(chapter - 1);
    }
  }, [spreadIndex, data, chapter]);

  const next = useCallback(() => {
    if (spreadIndex < totalSpreads - 1) {
      triggerFlip("next");
      setSpreadIndex(spreadIndex + 1);
    } else if (data?.has_next) {
      triggerFlip("next");
      setChapter(chapter + 1);
    }
  }, [spreadIndex, totalSpreads, data, chapter]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't hijack keys when a form field is focused
      const active = document.activeElement;
      const tag = active?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prev, next, toggleFullscreen]);

  // Drop cap is only applied to the very first verse of the whole chapter
  // (spreadIndex 0, first verse of left page)
  const showDropCap = spreadIndex === 0;

  function verseBody(v: ReaderVerse, pageFootnotes: string[]): React.ReactNode {
    if (!(isKjv && notesOn)) return v.text_clean ?? v.text;
    const parsed = parseKjvAnnotations(v.text);
    const noteOffsets: number[] = [];
    for (const n of parsed.notes) {
      pageFootnotes.push(n);
      noteOffsets.push(pageFootnotes.length);
    }
    return parsed.segments.map((seg, i) => {
      if (seg.kind === "text") return <span key={i}>{seg.content}</span>;
      if (seg.kind === "added")
        return (
          <span key={i} className="italic opacity-60">
            {seg.content}
          </span>
        );
      const globalIdx = noteOffsets[seg.index - 1];
      return (
        <sup key={i} className="text-[var(--color-gold-dark)] font-bold mx-0.5">
          {globalIdx}
        </sup>
      );
    });
  }

  function renderVerses(verses: ReaderVerse[], withDropCap: boolean) {
    if (verses.length === 0) {
      return <p className="opacity-40 italic text-center pt-10">· · ·</p>;
    }
    // Footnotes accumulated per-page (left and right have independent counters)
    const pageFootnotes: string[] = [];
    const firstBody = verses[0];
    const firstText = isKjv && notesOn
      ? null // handled by verseBody segments
      : (firstBody.text_clean ?? firstBody.text);

    return (
      <div className="font-body text-[var(--color-ink)] text-[17px] leading-[1.85]">
        {verses.map((v, i) => {
          const hlBg = highlightBgFor(v.verse_id);
          const hlStyle = hlBg
            ? {
                backgroundColor: hlBg,
                borderRadius: "2px",
                padding: "0 2px",
                margin: "0 -2px",
              }
            : undefined;
          if (withDropCap && i === 0) {
            // Drop-cap: use clean text for the letter + rest to keep the visual
            const body = firstText ?? "";
            return (
              <span key={v.verse} style={hlStyle}>
                <DropCap letter={body[0] || firstBody.text[0] || ""} />
                <sup className="text-[var(--color-gold-dark)] text-[10px] font-bold mr-1 align-super">
                  {v.verse}
                </sup>
                {isKjv && notesOn
                  ? verseBody(v, pageFootnotes)
                  : body.slice(1)}{" "}
              </span>
            );
          }
          return (
            <span key={v.verse} style={hlStyle}>
              <sup className="text-[var(--color-gold-dark)] text-[10px] font-bold mr-1 align-super">
                {v.verse}
              </sup>
              {verseBody(v, pageFootnotes)}{" "}
            </span>
          );
        })}

        {pageFootnotes.length > 0 && (
          <div className="mt-5 pt-2 border-t border-dashed border-[var(--color-gold-dark)]/30">
            <ol className="space-y-0.5 text-[11px] text-[var(--color-gold-dark)]/90 leading-snug">
              {pageFootnotes.map((note, i) => (
                <li key={i}>
                  <sup className="font-bold mr-1">{i + 1}</sup>
                  {note}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  }

  const flipClass =
    flipDir === "next"
      ? "page-flip-next"
      : flipDir === "prev"
        ? "page-flip-prev"
        : "";

  return (
    <div
      ref={containerRef}
      className={`relative book-ambient-glow ${isFullscreen ? "w-screen h-screen overflow-auto p-8" : "min-h-[80vh] rounded-xl p-4 md:p-8"}`}
      style={{
        backgroundColor: "var(--bg-void)",
        boxShadow: "inset 0 0 120px rgba(196, 162, 101, 0.06)",
      }}
    >
      {/* Controls bar */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select
          value={bookId}
          onChange={(e) => {
            setBookId(e.target.value);
            setChapter(1);
          }}
          className="border border-[var(--color-gold-dark)]/30 rounded px-3 py-1.5
                     bg-[var(--bg-ambient)] text-[var(--color-parchment)] text-sm
                     focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50"
        >
          {books.map((b) => (
            <option key={b.book_id} value={b.book_id}>
              {b.book_name}
            </option>
          ))}
        </select>

        <select
          value={chapter}
          onChange={(e) => setChapter(Number(e.target.value))}
          className="border border-[var(--color-gold-dark)]/30 rounded px-3 py-1.5
                     bg-[var(--bg-ambient)] text-[var(--color-parchment)] text-sm
                     focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50"
        >
          {Array.from({ length: data?.total_chapters || 1 }, (_, i) => i + 1).map((ch) => (
            <option key={ch} value={ch}>
              Ch. {ch}
            </option>
          ))}
        </select>

        <select
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          className="border border-[var(--color-gold-dark)]/30 rounded px-3 py-1.5
                     bg-[var(--bg-ambient)] text-[var(--color-parchment)] text-sm
                     focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50"
        >
          {TRANSLATIONS.map((t) => (
            <option key={t} value={t}>
              {t.toUpperCase()}
            </option>
          ))}
        </select>

        {isKjv && (
          <button
            onClick={toggleNotes}
            className={`text-xs px-3 py-1.5 rounded border transition
                        focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40 ${
                          notesOn
                            ? "bg-[var(--color-gold)]/20 border-[var(--color-gold)] text-[var(--color-gold)]"
                            : "border-[var(--color-gold-dark)]/30 text-[var(--color-parchment)]/70 hover:bg-[var(--color-gold)]/10"
                        }`}
            title="Show KJV translator annotations"
          >
            Notes: {notesOn ? "on" : "off"}
          </button>
        )}

        <span className="ml-auto text-xs opacity-40 text-[var(--color-parchment)] hidden md:inline">
          ← → to turn · F for fullscreen
        </span>

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="ml-auto md:ml-0 shrink-0 border border-[var(--color-gold-dark)]/40
                     rounded px-2 py-1.5 text-[var(--color-gold)]
                     hover:bg-[var(--color-gold)]/10 transition
                     focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40"
        >
          {isFullscreen ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4m0 5H4m11 0V4m0 5h5M9 15v5m0-5H4m11 0v5m0-5h5" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
            </svg>
          )}
        </button>
      </div>

      {loading ? (
        <p className="text-center text-[var(--color-gold)] opacity-50 py-20 font-body text-lg">
          Loading...
        </p>
      ) : !data ? (
        <p className="text-center text-red-400 py-20">Failed to load.</p>
      ) : (
        <div className="book-scene">
          <div
            key={flipKey.current}
            onAnimationEnd={() => setFlipDir(null)}
            className={`book-spread mx-auto max-w-[1100px] ${flipClass}`}
          >
            {/* Chapter title banner (above the spread) */}
            <div className="text-center mb-4">
              <h2
                className="font-display text-2xl tracking-[0.25em]"
                style={{ color: "var(--color-gold)" }}
              >
                {data.book_name}
              </h2>
              <span className="block text-xs tracking-[0.4em] opacity-50 mt-1 text-[var(--color-parchment)]">
                CHAPTER {data.chapter}
              </span>
            </div>

            {/* ── The spread: two pages on md+, single page on mobile ── */}
            <div className="flex justify-center">
              {/* LEFT PAGE */}
              <div
                onClick={prev}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    prev();
                  }
                }}
                className="book-page-left paper-texture
                           relative w-full md:w-1/2 min-h-[520px]
                           p-8 md:p-10 cursor-w-resize
                           focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40"
                aria-label="Previous page"
              >
                <OrnateCorner position="top-left" />
                <OrnateCorner position="bottom-left" />
                {renderVerses(leftVerses, showDropCap)}
                {/* Page number */}
                <div
                  className="absolute bottom-3 left-0 right-0 text-center text-xs
                             font-body tracking-[0.3em] opacity-40"
                  style={{ color: "var(--color-gold-dark)" }}
                >
                  {spreadIndex * 2 + 1}
                </div>
              </div>

              {/* SPINE (desktop only) */}
              <div
                aria-hidden
                className="book-spine hidden md:block w-3 min-h-[520px]"
              />

              {/* RIGHT PAGE (desktop only) */}
              <div
                onClick={next}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    next();
                  }
                }}
                className="book-page-right paper-texture
                           relative w-1/2 min-h-[520px]
                           p-8 md:p-10 cursor-e-resize
                           hidden md:block
                           focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40"
                aria-label="Next page"
              >
                <OrnateCorner position="top-right" />
                <OrnateCorner position="bottom-right" />
                {renderVerses(rightVerses, false)}
                <div
                  className="absolute bottom-3 left-0 right-0 text-center text-xs
                             font-body tracking-[0.3em] opacity-40"
                  style={{ color: "var(--color-gold-dark)" }}
                >
                  {spreadIndex * 2 + 2}
                </div>
              </div>
            </div>

            {/* Spread indicator */}
            <div
              className="text-center mt-4 text-xs font-body tracking-widest"
              style={{ color: "var(--color-gold-dark)", opacity: 0.7 }}
            >
              Spread {spreadIndex + 1} / {totalSpreads}
            </div>
          </div>

          {/* Navigation arrows (mobile primary, desktop fallback) */}
          <div className="flex justify-between mt-4 max-w-[1100px] mx-auto md:hidden">
            <button
              onClick={prev}
              disabled={spreadIndex === 0 && !data.has_previous}
              className="text-[var(--color-gold)] opacity-60 hover:opacity-100
                         disabled:opacity-20 transition text-2xl px-4"
              aria-label="Previous page"
            >
              &larr;
            </button>
            <button
              onClick={next}
              disabled={spreadIndex >= totalSpreads - 1 && !data.has_next}
              className="text-[var(--color-gold)] opacity-60 hover:opacity-100
                         disabled:opacity-20 transition text-2xl px-4"
              aria-label="Next page"
            >
              &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
