import { useState, useEffect, useCallback, useRef, forwardRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import HTMLFlipBook from "react-pageflip-enhanced";
import {
  fetchReaderPage,
  type ReaderPage,
  type ReaderVerse,
} from "../../services/api";
import { useBooks, localizeBookName } from "../../i18n/bookNames";
import OrnateCorner from "./OrnateCorner";
import DropCap from "./DropCap";
import { useTranslatorNotes } from "../../hooks/useTranslatorNotes";
import { useVerseNotes } from "../../hooks/useVerseNotes";
import { recordPlanAutoMark } from "../../hooks/useReadingPlans";
import { parseKjvAnnotations } from "../reader/kjvAnnotations";
import { useI18n, defaultTranslationFor } from "../../i18n/i18nContext";
import { useTranslationIds } from "../../hooks/useTranslations";

/**
 * Approximate max chars per page. Mobile pages are 320×480 (vs. 550×720 on
 * desktop), and at 17px/1.85 line-height inside p-8 (32px) padding the
 * mobile content area fits ~13 lines × ~50 chars ≈ 650 chars before text
 * overflows the page boundary. Desktop has roughly 2× the area, so 1400
 * chars there. The previous single 1400 budget was the cause of mobile's
 * "text spilling past the bottom edge" bug.
 */
const CHARS_PER_PAGE_DESKTOP = 1400;
const CHARS_PER_PAGE_MOBILE = 700;

/**
 * Split verses into pages using a character-budget heuristic so that
 * no page is nearly empty while the previous overflows.
 */
function paginateVerses(verses: ReaderVerse[], isMobile: boolean): ReaderVerse[][] {
  if (verses.length === 0) return [];
  const budget = isMobile ? CHARS_PER_PAGE_MOBILE : CHARS_PER_PAGE_DESKTOP;
  const pages: ReaderVerse[][] = [];
  let current: ReaderVerse[] = [];
  let charCount = 0;

  for (const v of verses) {
    const len = (v.text_clean ?? v.text).length;
    if (current.length > 0 && charCount + len > budget) {
      pages.push(current);
      current = [];
      charCount = 0;
    }
    current.push(v);
    charCount += len;
  }
  if (current.length > 0) pages.push(current);

  // Ensure even number of pages for book spread (desktop) — on mobile portrait
  // the FlipBook shows one page at a time so an odd page count is fine.
  if (!isMobile && pages.length % 2 !== 0) pages.push([]);

  return pages;
}

/* ─── Individual page component (forwardRef required by HTMLFlipBook) ───── */
interface BookPageProps {
  verses: ReaderVerse[];
  pageNum: number;
  isFirstPage: boolean;
  isKjv: boolean;
  notesOn: boolean;
  highlightBgFor: (verseId: string) => string | undefined;
  corner: "left" | "right";
  /** Shown on blank trailing pages — e.g. "Genesis 2" */
  nextChapterLabel?: string;
  /** Called when user clicks blank transition page */
  onNextChapter?: () => void;
}

const BookPage = forwardRef<HTMLDivElement, BookPageProps>(function BookPage(
  { verses, pageNum, isFirstPage, isKjv, notesOn, highlightBgFor, corner, nextChapterLabel, onNextChapter },
  ref
) {
  const pageFootnotes: string[] = [];

  function verseBody(v: ReaderVerse): React.ReactNode {
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

  const tl = corner === "left" ? "top-left" : "top-right";
  const bl = corner === "left" ? "bottom-left" : "bottom-right";

  return (
    <div
      ref={ref}
      className="paper-texture relative w-full h-full p-5 md:p-10 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #f5f0e8 0%, #ede5d8 50%, #e8e0d0 100%)",
        boxShadow:
          corner === "left"
            ? "inset -8px 0 16px -8px rgba(0,0,0,0.08)"
            : "inset 8px 0 16px -8px rgba(0,0,0,0.08)",
      }}
    >
      <OrnateCorner position={tl} />
      <OrnateCorner position={bl} />

      {verses.length === 0 ? (
        <div
          className={`flex flex-col items-center justify-center h-full ${
            onNextChapter ? "cursor-pointer" : ""
          }`}
          onClick={onNextChapter}
        >
          {nextChapterLabel ? (
            <div className="text-center opacity-30 hover:opacity-50 transition-opacity">
              {/* Decorative divider */}
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="w-10 h-px bg-[var(--color-gold-dark)]" />
                <svg className="w-3 h-3 text-[var(--color-gold-dark)]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
                </svg>
                <div className="w-10 h-px bg-[var(--color-gold-dark)]" />
              </div>
              <p className="text-sm font-display italic text-[var(--color-gold-dark)]">
                {nextChapterLabel}
              </p>
              <div className="flex items-center justify-center gap-3 mt-5">
                <div className="w-10 h-px bg-[var(--color-gold-dark)]" />
                <svg className="w-3 h-3 text-[var(--color-gold-dark)]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
                </svg>
                <div className="w-10 h-px bg-[var(--color-gold-dark)]" />
              </div>
            </div>
          ) : (
            <span className="text-xs tracking-[0.3em] text-[var(--color-gold-dark)] opacity-30">· · ·</span>
          )}
        </div>
      ) : (
        <div className="font-body text-[var(--color-ink)] text-[15px] md:text-[17px] leading-[1.75] md:leading-[1.85]">
          {verses.map((v, i) => {
            const hlBg = highlightBgFor(v.verse_id);
            const hlStyle = hlBg
              ? { backgroundColor: hlBg, borderRadius: "2px", padding: "0 2px", margin: "0 -2px" }
              : undefined;

            if (isFirstPage && i === 0) {
              const body = (v.text_clean ?? v.text) || "";
              return (
                <span key={v.verse} style={hlStyle}>
                  <DropCap letter={body[0] || v.text[0] || ""} />
                  <sup className="text-[var(--color-gold-dark)] text-[10px] font-bold mr-1 align-super">
                    {v.verse}
                  </sup>
                  {isKjv && notesOn ? verseBody(v) : body.slice(1)}{" "}
                </span>
              );
            }
            return (
              <span key={v.verse} style={hlStyle}>
                <sup className="text-[var(--color-gold-dark)] text-[10px] font-bold mr-1 align-super">
                  {v.verse}
                </sup>
                {verseBody(v)}{" "}
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
      )}

      {/* Page number */}
      <div
        className="absolute bottom-3 left-0 right-0 text-center text-xs
                   font-body tracking-[0.3em] opacity-40"
        style={{ color: "var(--color-gold-dark)" }}
      >
        {pageNum}
      </div>
    </div>
  );
});

/* ─── Main Immersive Reader ────────────────────────────────────────────── */
export default function ImmersiveReader() {
  const { t, locale } = useI18n();
  const translationIds = useTranslationIds();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<ReaderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookId, setBookId] = useState(searchParams.get("book") || "GEN");
  const [chapter, setChapter] = useState(
    Number(searchParams.get("chapter")) || 1,
  );
  const [translation, setTranslation] = useState(
    searchParams.get("translation") || defaultTranslationFor(locale),
  );

  // Translation follows UI locale: PT → NVI, ES → RVR, EN → KJV — unless the
  // URL pins it.
  useEffect(() => {
    if (searchParams.get("translation")) return;
    setTranslation(defaultTranslationFor(locale));
  }, [locale, searchParams]);

  // Sync state with URL params so that deep-links and banner pill clicks
  // (e.g. from ActivePlanIndicator) actually navigate the book, not just
  // update the address bar.
  useEffect(() => {
    const b = searchParams.get("book");
    const c = searchParams.get("chapter");
    if (b && b !== bookId) setBookId(b);
    if (c) {
      const n = Number(c);
      if (n && n !== chapter) setChapter(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const books = useBooks(translation);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { notesOn, toggle: toggleNotes } = useTranslatorNotes();
  const { notes: verseNotes } = useVerseNotes();

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flipBookRef = useRef<any>(null);
  const isKjv = translation === "kjv";

  // On mobile, shrink the book so it never exceeds the viewport width.
  // The FlipBook with size="stretch" expands to fill its container, which
  // overflows the viewport on narrow screens. We pin it to innerWidth - 32px.
  const [mobileBookWidth, setMobileBookWidth] = useState(
    Math.min(320, window.innerWidth - 32)
  );

  function highlightBgFor(verseId: string): string | undefined {
    const cat = verseNotes[verseId]?.category;
    if (!cat) return undefined;
    return `color-mix(in srgb, var(--hl-${cat}) 22%, transparent)`;
  }

  // Responsive: detect mobile + compute safe book width
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      setMobileBookWidth(Math.min(320, window.innerWidth - 32));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  // ── Reader-page cache (stale-while-revalidate + adjacent prefetch) ───────
  // We keep a Map of already-fetched pages keyed by `book|ch|translation`.
  // When the user jumps to a chapter that's already cached, we apply it
  // synchronously (no loading state, no book remount).
  // After the current chapter lands, we quietly prefetch the next and the
  // previous one in the background, so clicking → / ← never triggers a
  // visible fetch unless the user is at the very edges of the Bible.
  const pageCache = useRef<Map<string, ReaderPage>>(new Map());
  const cacheKey = (b: string, c: number, t: string) => `${b}|${c}|${t}`;

  useEffect(() => {
    const key = cacheKey(bookId, chapter, translation);
    const cached = pageCache.current.get(key);
    if (cached) {
      // Synchronous swap — FlipBook stays mounted, just its children update.
      setData(cached);
      setLoading(false);
      recordPlanAutoMark(`${cached.book_id}.${cached.chapter}`, books);
    } else {
      // Keep the previous `data` rendered so the book doesn't blink white;
      // only show the spinner on the very first load (when data is still null).
      setLoading(true);
      fetchReaderPage(bookId, chapter, translation)
        .then((d) => {
          pageCache.current.set(key, d);
          setData(d);
          recordPlanAutoMark(`${d.book_id}.${d.chapter}`, books);
        })
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }
  }, [bookId, chapter, translation, books]);

  // When the content under the FlipBook changes (new book or chapter), the
  // library's internal currentPageIndex is left wherever the user last
  // flipped. If the new chapter has fewer pages the book lands past the
  // end → blank spread. We can't use a React key on HTMLFlipBook because
  // that either (a) collides with an in-flight flip animation and makes
  // the book replay the same spread, or (b) visibly pops when keyed on
  // the wrapper. Solution: detect genuine content changes (different
  // book or chapter), then imperatively call pageFlip().turnToPage(0)
  // AFTER the library has had time to process the new children.
  const prevContentRef = useRef<{ book: string; chapter: number } | null>(null);
  useEffect(() => {
    if (!data) return;
    const prev = prevContentRef.current;
    const isNewContent =
      !prev || prev.book !== data.book_id || prev.chapter !== data.chapter;
    prevContentRef.current = { book: data.book_id, chapter: data.chapter };
    if (!isNewContent) return;
    // 50ms gives react-pageflip enough time to reconcile new children;
    // requestAnimationFrame alone fired before the lib's internal
    // useEffect ran and turnToPage landed on stale page count.
    const timer = window.setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pf = (flipBookRef.current as any)?.pageFlip?.();
        if (pf && typeof pf.turnToPage === "function") {
          pf.turnToPage(0);
        }
      } catch {
        /* swallow — worst case first-spread render already looks right */
      }
      setCurrentPage(0);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [data]);

  // Prefetch adjacent chapters so the next click has zero latency.
  useEffect(() => {
    if (!data) return;
    const translationId = translation;
    const candidates: Array<[string, number]> = [];
    if (data.has_next) candidates.push([data.book_id, data.chapter + 1]);
    if (data.has_previous) candidates.push([data.book_id, data.chapter - 1]);
    for (const [b, c] of candidates) {
      const key = cacheKey(b, c, translationId);
      if (pageCache.current.has(key)) continue;
      // Fire-and-forget — errors silently ignored; user-triggered fetch will
      // re-raise them and show the error state.
      fetchReaderPage(b, c, translationId)
        .then((d) => pageCache.current.set(key, d))
        .catch(() => {});
    }
  }, [data, translation]);

  // Changing translation invalidates the cache (different verses per edition).
  useEffect(() => {
    pageCache.current.clear();
  }, [translation]);

  const pages = useMemo(
    () => (data ? paginateVerses(data.verses, isMobile) : []),
    [data, isMobile],
  );

  // Navigate to next/prev chapter when at book boundaries
  const goNextChapter = useCallback(() => {
    if (data?.has_next) setChapter((c) => c + 1);
  }, [data]);

  const goPrevChapter = useCallback(() => {
    if (data?.has_previous) setChapter((c) => c - 1);
  }, [data]);

  const onFlip = useCallback(
    (e: { data: number }) => {
      setCurrentPage(e.data);
    },
    []
  );

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowRight") {
        const pf = flipBookRef.current?.pageFlip();
        if (!pf) return;
        const cur = pf.getCurrentPageIndex();
        const total = pf.getPageCount();
        // At last spread → go to next chapter
        if (cur >= total - 2) {
          goNextChapter();
        } else {
          pf.flipNext();
        }
      } else if (e.key === "ArrowLeft") {
        const pf = flipBookRef.current?.pageFlip();
        if (!pf) return;
        const cur = pf.getCurrentPageIndex();
        // At first page → go to previous chapter
        if (cur <= 0) {
          goPrevChapter();
        } else {
          pf.flipPrev();
        }
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggleFullscreen, goNextChapter, goPrevChapter]);

  const contentPages = pages.length; // only content pages for display
  const displayPage = isMobile
    ? `${t("reader.page")} ${Math.min(currentPage + 1, contentPages)} / ${contentPages}`
    : `${t("reader.spread")} ${Math.min(Math.floor(currentPage / 2) + 1, Math.ceil(contentPages / 2))} / ${Math.ceil(contentPages / 2)}`;

  return (
    <div
      ref={containerRef}
      className={`relative book-ambient-glow max-w-full overflow-x-hidden ${
        isFullscreen
          ? "w-screen h-screen overflow-auto p-8"
          : "md:min-h-[80vh] rounded-xl p-3 md:p-8"
      }`}
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
            e.target.blur(); // release focus so arrow keys drive the page flip, not the select
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
          onChange={(e) => {
            setChapter(Number(e.target.value));
            e.target.blur();
          }}
          className="border border-[var(--color-gold-dark)]/30 rounded px-3 py-1.5
                     bg-[var(--bg-ambient)] text-[var(--color-parchment)] text-sm
                     focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50"
        >
          {Array.from({ length: data?.total_chapters || 1 }, (_, i) => i + 1).map((ch) => (
            <option key={ch} value={ch}>
              {t("reader.chapterN").replace("{n}", String(ch))}
            </option>
          ))}
        </select>

        <select
          value={translation}
          onChange={(e) => {
            setTranslation(e.target.value);
            e.target.blur();
          }}
          className="border border-[var(--color-gold-dark)]/30 rounded px-3 py-1.5
                     bg-[var(--bg-ambient)] text-[var(--color-parchment)] text-sm
                     focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50"
        >
          {translationIds.map((t) => (
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
            title={t("reader.translatorNotes")}
          >
            {notesOn ? t("reader.notesOn") : t("reader.notesOff")}
          </button>
        )}

        <span className="ml-auto text-xs opacity-40 text-[var(--color-parchment)] hidden md:inline">
          {t("reader.keysHelp")}
        </span>

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? t("reader.exitFullscreen") : t("reader.enterFullscreen")}
          aria-label={isFullscreen ? t("reader.exitFullscreen") : t("reader.enterFullscreen")}
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

      {!data && loading ? (
        <p className="text-center text-[var(--color-gold)] opacity-50 py-20 font-body text-lg">
          {t("common.loading")}
        </p>
      ) : !data ? (
        <p className="text-center text-red-400 py-20">{t("reader.loadError")}</p>
      ) : (
        /* Book stays mounted across chapter switches; `loading` only dims the
           text slightly so the user has feedback that a fetch is in flight
           (rare — adjacent chapters are prefetched into pageCache).  */
        <div
          className="book-scene transition-opacity duration-200"
          style={{ opacity: loading ? 0.65 : 1 }}
        >
          {/* Chapter title banner */}
          <div className="text-center mb-4">
            <h2
              className="font-display text-2xl tracking-[0.25em]"
              style={{ color: "var(--color-gold)" }}
            >
              {localizeBookName(data.book_id, locale, data.book_name)}
            </h2>
            <span className="block text-xs tracking-[0.4em] opacity-50 mt-1 text-[var(--color-parchment)]">
              {t("reader.chapter").toUpperCase()} {data.chapter}
            </span>
          </div>

          {/* ── FlipBook ──
               No React `key` here: remounting the lib mid-flip caused the
               "flip lands on same spread" bug. Instead we keep the lib
               mounted for the entire session and reset its internal
               currentPageIndex via pageFlip().turnToPage(0) inside the
               useEffect above whenever data.book_id or data.chapter change. */}
          <div className="flex justify-center w-full overflow-hidden">
            <HTMLFlipBook
              ref={flipBookRef}
              width={isMobile ? mobileBookWidth : 550}
              height={isMobile ? Math.round(mobileBookWidth * 1.5) : 720}
              size={isMobile ? "fixed" : "stretch"}
              minWidth={260}
              maxWidth={600}
              minHeight={380}
              maxHeight={850}
              showCover={false}
              mobileScrollSupport={false}
              useMouseEvents={true}
              flippingTime={800}
              usePortrait={isMobile}
              startZIndex={0}
              autoSize={true}
              drawShadow={true}
              maxShadowOpacity={0.15}
              showPageCorners={true}
              disableFlipByClick={false}
              clickEventForward={true}
              className="book-flipbook"
              style={{ margin: "0 auto" }}
              onFlip={onFlip}
            >
              {/* Content pages */}
              {pages.map((pageVerses, idx) => (
                <BookPage
                  key={`p-${idx}`}
                  verses={pageVerses}
                  pageNum={idx + 1}
                  isFirstPage={idx === 0}
                  isKjv={isKjv}
                  notesOn={notesOn}
                  highlightBgFor={highlightBgFor}
                  corner={idx % 2 === 0 ? "left" : "right"}
                  nextChapterLabel={
                    pageVerses.length === 0 && data?.has_next
                      ? `${t("reader.turnNext")} ${localizeBookName(data.book_id, locale, data.book_name)} ${data.chapter + 1}`
                      : undefined
                  }
                  onNextChapter={
                    pageVerses.length === 0 && data?.has_next
                      ? goNextChapter
                      : undefined
                  }
                />
              ))}
              {/* empty — no extra transition pages; blank content page handles the hint */}
            </HTMLFlipBook>
          </div>

          {/* Page indicator */}
          <div
            className="text-center mt-4 text-xs font-body tracking-widest"
            style={{ color: "var(--color-gold-dark)", opacity: 0.7 }}
          >
            {displayPage}
          </div>

          {/* Chapter navigation (mobile + when at boundaries) */}
          <div className="flex justify-between mt-4 max-w-[1100px] mx-auto">
            <button
              onClick={goPrevChapter}
              disabled={!data.has_previous}
              className="text-[var(--color-gold)] opacity-60 hover:opacity-100
                         disabled:opacity-20 transition text-sm px-4 py-2"
              aria-label={t("reader.previous")}
            >
              &larr; {t("reader.previous")}
            </button>
            <button
              onClick={goNextChapter}
              disabled={!data.has_next}
              className="text-[var(--color-gold)] opacity-60 hover:opacity-100
                         disabled:opacity-20 transition text-sm px-4 py-2"
              aria-label={t("reader.next")}
            >
              {t("reader.next")} &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
