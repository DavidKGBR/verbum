import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchReaderPage,
  fetchCrossrefCounts,
  type ReaderPage,
} from "../services/api";
import { useBooks, localizeBookName } from "../i18n/bookNames";
import LoadingSpinner from "./common/LoadingSpinner";
import VerseActions from "./VerseActions";
import { useReadingHistory } from "../hooks/useReadingHistory";
import { useTranslatorNotes } from "../hooks/useTranslatorNotes";
import { useVerseNotes } from "../hooks/useVerseNotes";
import { recordPlanAutoMark } from "../hooks/useReadingPlans";
import { parseKjvAnnotations } from "./reader/kjvAnnotations";
import { useI18n, defaultTranslationFor } from "../i18n/i18nContext";
import { useTranslationIds } from "../hooks/useTranslations";

// Backend returns the English canonical testament/category on ReaderPage; this
// lookup maps those strings to i18n keys for localized display in the header.
const TESTAMENT_I18N: Record<string, string> = {
  "Old Testament": "book.testament.ot",
  "New Testament": "book.testament.nt",
};
const CATEGORY_I18N: Record<string, string> = {
  "Law":               "book.category.law",
  "History":           "book.category.history",
  "Poetry":            "book.category.poetry",
  "Major Prophets":    "book.category.majorProphets",
  "Minor Prophets":    "book.category.minorProphets",
  "Gospels":           "book.category.gospels",
  "Acts":              "book.category.acts",
  "Pauline Epistles":  "book.category.paulineEpistles",
  "General Epistles":  "book.category.generalEpistles",
  "Apocalyptic":       "book.category.apocalyptic",
};

type InitialTab = "none" | "crossrefs" | "notes";

export default function BibleReader() {
  const { t, locale } = useI18n();
  const [searchParams] = useSearchParams();
  const { record } = useReadingHistory();
  const translationIds = useTranslationIds();
  const [page, setPage] = useState<ReaderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookId, setBookId] = useState(searchParams.get("book") || "GEN");
  const [chapter, setChapter] = useState(Number(searchParams.get("chapter")) || 1);
  const [translation, setTranslation] = useState(
    searchParams.get("translation") || defaultTranslationFor(locale)
  );

  // Follow UI locale: PT → NVI, ES → RVR, EN → KJV unless the URL pins it.
  useEffect(() => {
    if (searchParams.get("translation")) return;
    setTranslation(defaultTranslationFor(locale));
  }, [locale, searchParams]);
  const books = useBooks(translation);
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<InitialTab>("none");
  const [crossrefCounts, setCrossrefCounts] = useState<Record<string, number>>({});
  const { notesOn, toggle: toggleNotes } = useTranslatorNotes();
  const { notes: verseNotes } = useVerseNotes();
  const highlightVerse = Number(searchParams.get("verse")) || null;
  const verseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isKjv = translation === "kjv";

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
        // If this chapter belongs to the active plan, tick it off.
        recordPlanAutoMark(`${p.book_id}.${p.chapter}`, books);
      })
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [bookId, chapter, translation, record, books]);

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

  // Build per-verse rendering info when KJV + notes ON; otherwise a clean string.
  // Also accumulates chapter-level footnotes with global numbering.
  const kjvRender = useMemo(() => {
    const footnotes: string[] = [];
    if (!page) return { verseParts: new Map<number, React.ReactNode>(), footnotes };

    const verseParts = new Map<number, React.ReactNode>();

    if (isKjv && notesOn) {
      for (const v of page.verses) {
        const parsed = parseKjvAnnotations(v.text);
        // Map local note-ref indices (1..n for this verse) to global indices
        const noteOffsets: number[] = [];
        for (const n of parsed.notes) {
          footnotes.push(n);
          noteOffsets.push(footnotes.length);
        }
        verseParts.set(
          v.verse,
          <>
            {parsed.segments.map((seg, i) => {
              if (seg.kind === "text") return <span key={i}>{seg.content}</span>;
              if (seg.kind === "added")
                return (
                  <span key={i} className="italic opacity-60">
                    {seg.content}
                  </span>
                );
              // note-ref: map local index (1-based) → global footnote number
              const globalIdx = noteOffsets[seg.index - 1];
              return (
                <sup
                  key={i}
                  className="text-[var(--color-gold-dark)] font-bold mx-0.5"
                >
                  {globalIdx}
                </sup>
              );
            })}
          </>
        );
      }
    }

    return { verseParts, footnotes };
  }, [page, isKjv, notesOn]);

  function renderVerseText(v: { verse: number; text: string; text_clean?: string }) {
    if (isKjv && notesOn) {
      const node = kjvRender.verseParts.get(v.verse);
      if (node) return node;
    }
    return v.text_clean ?? v.text;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select
          value={bookId}
          onChange={(e) => {
            setBookId(e.target.value);
            setChapter(1);
            e.target.blur(); // release focus so arrow keys drive the reader, not the select
          }}
          className="border rounded px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/60"
        >
          {books.map((b) => (
            <option key={b.book_id} value={b.book_id}>{b.book_name}</option>
          ))}
        </select>

        <select
          value={chapter}
          onChange={(e) => {
            setChapter(Number(e.target.value));
            e.target.blur();
          }}
          className="border rounded px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/60"
        >
          {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => (
            <option key={ch} value={ch}>{t("reader.chapterN").replace("{n}", String(ch))}</option>
          ))}
        </select>

        <select
          value={translation}
          onChange={(e) => {
            setTranslation(e.target.value);
            e.target.blur();
          }}
          className="border rounded px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50 focus:border-[var(--color-gold)]/60"
        >
          {translationIds.map((t) => (
            <option key={t} value={t}>{t.toUpperCase()}</option>
          ))}
        </select>

        {isKjv && (
          <button
            onClick={toggleNotes}
            className={`text-xs px-3 py-1.5 rounded border transition
                        focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40 ${
                          notesOn
                            ? "bg-[var(--color-gold)]/10 border-[var(--color-gold)] text-[var(--color-gold-dark)]"
                            : "bg-white hover:bg-gray-50"
                        }`}
            title={t("reader.translatorNotes")}
          >
            {notesOn ? t("reader.notesOn") : t("reader.notesOff")}
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text={t("reader.loadingChapter")} />
      ) : page ? (
        <div>
          {/* Header */}
          <div className="mb-6 fade-in">
            <h2 className="page-title text-3xl">
              {localizeBookName(page.book_id, locale, page.book_name)} {page.chapter}
            </h2>
            <p className="text-xs opacity-50 mt-1">
              {t(TESTAMENT_I18N[page.testament] ?? "") || page.testament}
              {" "}&middot;{" "}
              {t(CATEGORY_I18N[page.category] ?? "") || page.category}
              {" "}&middot;{" "}
              {page.translation.toUpperCase()} &middot; {page.verse_count} {t("common.verses")}
            </p>
          </div>

          {/* Plan banner moved to ReaderPage → <ActivePlanIndicator />, which
              now renders it once across every mode (Single/Parallel/Immersive/
              Interlinear/Structural) and is collapsible. */}

          {/* Verses */}
          <div className="space-y-0.5 fade-in">
            {page.verses.map((v) => {
              const xrefCount = crossrefCounts[v.verse_id] || 0;
              const isActive = activeVerse === v.verse;
              const note = verseNotes[v.verse_id];
              const highlightClass = note?.category
                ? `verse-highlight-${note.category}`
                : "";
              const rowStateClass =
                highlightVerse === v.verse || isActive
                  ? "verse-row-active"
                  : "verse-row";
              const hasNoteText = !!note?.note?.trim();
              return (
                <div
                  key={v.verse}
                  ref={(el) => { if (el) verseRefs.current.set(v.verse, el); }}
                  role="button"
                  tabIndex={0}
                  onClick={() => openVerse(v.verse, "none")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openVerse(v.verse, "none");
                    }
                  }}
                  className={`rounded-sm py-1 px-2 cursor-pointer
                              focus:outline-none focus-visible:ring-2
                              focus-visible:ring-[var(--color-gold)]/40
                              ${rowStateClass} ${highlightClass}`}
                >
                  <div className="flex gap-3 items-start">
                    <span className="verse-number text-sm pt-0.5 w-7 shrink-0 text-right">
                      {v.verse}
                    </span>
                    <p className="verse-text flex-1">{renderVerseText(v)}</p>
                    {hasNoteText && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openVerse(v.verse, "notes");
                        }}
                        title="Open note"
                        aria-label="Open note"
                        className="text-[11px] shrink-0 pt-1 pr-1
                                   text-[var(--color-gold-dark)] opacity-30 hover:opacity-70
                                   transition-opacity focus:outline-none focus:ring-1
                                   focus:ring-[var(--color-gold)]/40 rounded"
                      >
                        ·✍️
                      </button>
                    )}
                    {xrefCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openVerse(v.verse, "crossrefs");
                        }}
                        title={`${xrefCount} cross-references`}
                        aria-label={`${xrefCount} cross-references`}
                        className="text-[11px] font-mono tabular-nums shrink-0 pt-1 pr-1
                                   text-[var(--color-gold-dark)] opacity-25 hover:opacity-60
                                   transition-opacity focus:outline-none focus:ring-1
                                   focus:ring-[var(--color-gold)]/40 rounded"
                      >
                        ·{xrefCount}
                      </button>
                    )}
                  </div>

                  {isActive && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      // Space/Enter inside a textarea/input must NOT bubble up
                      // to the row's button handler (which re-toggles the menu).
                      // Without this, typing a space in the Note editor closed
                      // the editor every time.
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <VerseActions
                        verseId={v.verse_id}
                        text={v.text_clean ?? v.text}
                        translation={translation}
                        reference={v.reference}
                        bookId={page.book_id}
                        bookName={localizeBookName(page.book_id, locale, page.book_name)}
                        chapter={page.chapter}
                        verse={v.verse}
                        initialTab={activeTab}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* KJV footnotes — only shown when translator notes toggle is on */}
          {isKjv && notesOn && kjvRender.footnotes.length > 0 && (
            <div className="mt-6 pt-3 border-t border-dashed border-[var(--color-gold-dark)]/30">
              <p className="text-[11px] uppercase tracking-[0.25em] opacity-50 mb-2 font-display">
                {t("reader.translatorNotes")}
              </p>
              <ol className="space-y-1 text-xs text-[var(--color-gold-dark)]/90">
                {kjvRender.footnotes.map((note, i) => (
                  <li key={i} className="leading-relaxed">
                    <sup className="font-bold mr-1">{i + 1}</sup>
                    {note}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-4 border-t">
            <button
              disabled={!page.has_previous}
              onClick={() => setChapter(chapter - 1)}
              className="px-4 py-2 rounded bg-[var(--color-ink)] text-[var(--color-parchment)]
                         text-sm disabled:opacity-30 hover:opacity-80 transition"
            >
              {t("reader.previous")}
            </button>
            <button
              disabled={!page.has_next}
              onClick={() => setChapter(chapter + 1)}
              className="px-4 py-2 rounded bg-[var(--color-ink)] text-[var(--color-parchment)]
                         text-sm disabled:opacity-30 hover:opacity-80 transition"
            >
              {t("reader.next")}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-red-600">{t("reader.loadError")}</p>
      )}
    </div>
  );
}
