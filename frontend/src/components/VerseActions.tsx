import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchEmotionalLandscape,
  fetchInterlinearChapter,
  fetchVerseCrossrefs,
  fetchVerseTranslations,
  type EmotionalPoint,
  type InterlinearWord,
  type VerseCrossRef,
} from "../services/api";
import { useBookmarks } from "../hooks/useBookmarks";
import { useVerseNotes } from "../hooks/useVerseNotes";
import AIExplanationPanel from "./AIExplanationPanel";
import NoteEditor from "./notes/NoteEditor";
import CommentaryPanel from "./reader/CommentaryPanel";
import ShareModal from "./sharing/ShareModal";
import { useTranslationIdsCsv } from "../hooks/useTranslations";
import { useI18n } from "../i18n/i18nContext";
import ActionIcon from "./icons/ActionIcon";

interface Props {
  verseId: string;
  text: string;
  translation: string;
  reference?: string;
  bookId?: string;
  bookName?: string;
  chapter?: number;
  verse?: number;
  initialTab?: Tab;
}

export type Tab =
  | "none"
  | "crossrefs"
  | "compare"
  | "explain"
  | "notes"
  | "commentary"
  | "wordStudy"
  | "emotion"
  | "topics";

interface VerseTopic {
  topic_id: number;
  name: string;
  slug: string;
  verse_count: number;
}

export default function VerseActions({
  verseId,
  text,
  translation,
  reference,
  bookId,
  bookName,
  chapter,
  verse,
  initialTab = "none",
}: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isBookmarked, toggle } = useBookmarks();
  const { get: getNote } = useVerseNotes();
  const allTranslationsCsv = useTranslationIdsCsv();
  const [tab, setTab] = useState<Tab>(initialTab);
  const existingNote = getNote(verseId);
  const hasNote =
    !!existingNote && (!!existingNote.category || !!existingNote.note?.trim());
  const [crossrefs, setCrossrefs] = useState<VerseCrossRef[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [wordStudyWord, setWordStudyWord] = useState<InterlinearWord | null>(null);
  const [emotionSeries, setEmotionSeries] = useState<EmotionalPoint[]>([]);
  const [verseTopics, setVerseTopics] = useState<VerseTopic[]>([]);

  // Auto-load if initialTab requests data
  useEffect(() => {
    if (initialTab === "crossrefs") void doLoadCrossrefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doLoadCrossrefs() {
    setLoading(true);
    try {
      const data = await fetchVerseCrossrefs(verseId);
      setCrossrefs(data.outgoing);
    } catch {
      setCrossrefs([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCrossrefs() {
    if (tab === "crossrefs") {
      setTab("none");
      return;
    }
    setTab("crossrefs");
    if (crossrefs.length === 0) await doLoadCrossrefs();
  }

  async function loadCompare() {
    if (tab === "compare") {
      setTab("none");
      return;
    }
    setTab("compare");
    if (Object.keys(translations).length > 0) return;
    setLoading(true);
    try {
      const data = await fetchVerseTranslations(verseId, allTranslationsCsv);
      setTranslations(data.translations);
    } catch {
      setTranslations({});
    } finally {
      setLoading(false);
    }
  }

  function loadExplain() {
    setTab(tab === "explain" ? "none" : "explain");
  }

  async function loadWordStudy() {
    if (tab === "wordStudy") {
      setTab("none");
      return;
    }
    setTab("wordStudy");
    if (wordStudyWord || !bookId || !chapter || !verse) return;
    setLoading(true);
    try {
      const data = await fetchInterlinearChapter(bookId, chapter);
      // Pick first noun in this verse, fall back to any word
      const inVerse = data.words.filter((w) => w.verse_id === verseId);
      const firstNoun = inVerse.find((w) => /noun|N-/i.test(w.grammar)) ?? inVerse[0] ?? null;
      setWordStudyWord(firstNoun);
    } catch {
      setWordStudyWord(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadEmotion() {
    if (tab === "emotion") {
      setTab("none");
      return;
    }
    setTab("emotion");
    if (emotionSeries.length > 0 || !bookId) return;
    setLoading(true);
    try {
      const data = await fetchEmotionalLandscape(bookId, translation);
      setEmotionSeries(data.series.filter((s) => s.chapter === chapter));
    } catch {
      setEmotionSeries([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadTopics() {
    if (tab === "topics") {
      setTab("none");
      return;
    }
    setTab("topics");
    if (verseTopics.length > 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/topics/for-verse/${verseId}`);
      if (res.ok) {
        const data = await res.json();
        setVerseTopics(data.topics ?? []);
      } else {
        setVerseTopics([]);
      }
    } catch {
      setVerseTopics([]);
    } finally {
      setLoading(false);
    }
  }

  function copyVerse() {
    navigator.clipboard.writeText(`${reference || verseId} — ${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleBookmark() {
    toggle({ verse_id: verseId, text, translation, reference });
  }

  function goToVerse(vid: string) {
    const parts = vid.split(".");
    if (parts.length === 3) {
      navigate(`/reader?book=${parts[0]}&chapter=${parts[1]}&verse=${parts[2]}`);
    }
  }

  const bookmarked = isBookmarked(verseId);

  return (
    <div className="ml-9 mb-3 mt-1">
      {/* Action buttons — two rows grouped by purpose:
          row 1 = analysis/reading (crossrefs, explain, commentary, compare)
          row 2 = personal/share (note, bookmark, copy, share).
          Each row still has flex-wrap so mobile can reflow without breaking. */}
      <div className="flex gap-2 mb-2 flex-wrap">
        <button
          onClick={loadCrossrefs}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded border transition ${
            tab === "crossrefs"
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : "hover:bg-gray-100"
          }`}
        >
          <ActionIcon name="link" /> {t("verseActions.btn.crossrefs")}
        </button>
        <button
          onClick={loadExplain}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded border transition ${
            tab === "explain"
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : "hover:bg-gray-100"
          }`}
        >
          <ActionIcon name="sparkles" /> {t("verseActions.btn.explain")}
        </button>
        <button
          onClick={() => setTab(tab === "commentary" ? "none" : "commentary")}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded border transition ${
            tab === "commentary"
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : "hover:bg-gray-100"
          }`}
        >
          <ActionIcon name="book" /> {t("verseActions.btn.commentary")}
        </button>
        <button
          onClick={loadCompare}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded border transition ${
            tab === "compare"
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : "hover:bg-gray-100"
          }`}
        >
          <ActionIcon name="compare" /> {t("verseActions.btn.compare")}
        </button>
        <button
          onClick={loadWordStudy}
          title={t("verseActions.wordStudy.title")}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded border transition ${
            tab === "wordStudy"
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : "hover:bg-gray-100"
          }`}
        >
          <ActionIcon name="aleph" /> {t("verseActions.btn.wordStudy")}
        </button>
        <button
          onClick={loadEmotion}
          title={t("verseActions.emotion.title")}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded border transition ${
            tab === "emotion"
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : "hover:bg-gray-100"
          }`}
        >
          <ActionIcon name="wave" /> {t("verseActions.btn.emotion")}
        </button>
        <button
          onClick={loadTopics}
          title={t("verseActions.topics.title")}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded border transition ${
            tab === "topics"
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : "hover:bg-gray-100"
          }`}
        >
          <ActionIcon name="tag" /> {t("verseActions.btn.topics")}
        </button>
      </div>

      <div className="flex gap-2 mb-2 flex-wrap">
        <button
          onClick={() => setTab(tab === "notes" ? "none" : "notes")}
          title={hasNote ? t("verseActions.note.edit") : t("verseActions.note.add")}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded border transition ${
            tab === "notes"
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : hasNote
                ? "bg-amber-50 text-amber-900 border-amber-300"
                : "hover:bg-gray-100"
          }`}
        >
          <ActionIcon name={hasNote ? "pencil-filled" : "pencil"} />{" "}
          {hasNote ? t("verseActions.btn.noteWith") : t("verseActions.btn.note")}
        </button>
        <button
          onClick={handleBookmark}
          title={bookmarked ? t("verseActions.bookmark.remove") : t("verseActions.bookmark.save")}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded border transition ${
            bookmarked
              ? "bg-amber-100 text-amber-800 border-amber-300"
              : "hover:bg-gray-100"
          }`}
        >
          <ActionIcon name={bookmarked ? "star-filled" : "star"} />{" "}
          {bookmarked ? t("verseActions.btn.saved") : t("verseActions.btn.save")}
        </button>
        <button
          onClick={copyVerse}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded border hover:bg-gray-100 transition"
        >
          <ActionIcon name={copied ? "check" : "clipboard"} />{" "}
          {copied ? t("verseActions.btn.copied") : t("verseActions.btn.copy")}
        </button>
        <button
          onClick={() => setShareOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded border hover:bg-gray-100 transition"
        >
          <ActionIcon name="share" /> {t("verseActions.btn.share")}
        </button>
      </div>

      {shareOpen && (
        <ShareModal
          text={text}
          reference={reference || verseId}
          translation={translation}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Cross-refs panel */}
      {tab === "crossrefs" && (
        <div className="bg-white border rounded p-3 text-sm">
          {loading ? (
            <p className="opacity-50">{t("verseActions.crossrefs.loading")}</p>
          ) : crossrefs.length === 0 ? (
            <p className="opacity-50">{t("verseActions.crossrefs.none")}</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold opacity-60 mb-2">
                {t("verseActions.crossrefs.count").replace("{n}", String(crossrefs.length))}
              </p>
              {crossrefs.slice(0, 10).map((cr) => (
                <div
                  key={cr.target_verse_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => goToVerse(cr.target_verse_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goToVerse(cr.target_verse_id);
                    }
                  }}
                  className="flex gap-2 cursor-pointer hover:bg-[var(--color-gold)]/10
                             rounded p-1.5 transition focus:outline-none
                             focus:ring-2 focus:ring-[var(--color-gold)]/50"
                >
                  <span className="text-xs font-bold text-[var(--color-gold)] shrink-0 w-20">
                    {cr.target_verse_id}
                  </span>
                  <span className="text-xs opacity-70 line-clamp-1">
                    {cr.target_text || "—"}
                  </span>
                </div>
              ))}
              {crossrefs.length > 10 && (
                <p className="text-xs opacity-50 pt-1">
                  {t("verseActions.crossrefs.more").replace("{n}", String(crossrefs.length - 10))}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Explain panel */}
      {tab === "explain" && (
        <AIExplanationPanel verseId={verseId} translation={translation} />
      )}

      {/* Commentary panel */}
      {tab === "commentary" && bookId && chapter && verse && (
        <CommentaryPanel book={bookId} chapter={chapter} verse={verse} />
      )}

      {/* Note editor panel */}
      {tab === "notes" && (
        <NoteEditor
          verseId={verseId}
          reference={reference}
          text={text}
          translation={translation}
          bookId={bookId}
          bookName={bookName}
          chapter={chapter}
          verse={verse}
        />
      )}

      {/* Word study panel */}
      {tab === "wordStudy" && (
        <div className="bg-white border rounded p-3 text-sm">
          {loading ? (
            <p className="opacity-50">{t("common.loading")}</p>
          ) : !wordStudyWord ? (
            <p className="opacity-50">{t("verseActions.wordStudy.none")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-3">
                <span
                  className="text-xl font-bold text-[var(--color-gold)]"
                  lang={wordStudyWord.language === "hebrew" ? "he" : "el"}
                >
                  {wordStudyWord.original_word}
                </span>
                <span className="text-xs italic opacity-70">
                  {wordStudyWord.transliteration}
                </span>
                <span className="text-[10px] uppercase tracking-wider opacity-50">
                  {wordStudyWord.strongs_id}
                </span>
              </div>
              <p className="text-xs opacity-80">
                {wordStudyWord.gloss || wordStudyWord.english}
              </p>
              <div className="flex gap-3 mt-1 text-xs">
                <Link
                  to={`/word-study/${wordStudyWord.strongs_id}`}
                  className="text-[var(--color-gold)] hover:underline"
                >
                  {t("verseActions.wordStudy.openStudy")} →
                </Link>
                {bookId && chapter && (
                  <Link
                    to={`/reader?book=${bookId}&chapter=${chapter}&verse=${verse}&mode=interlinear&translation=${translation}`}
                    className="text-[var(--color-gold)] hover:underline"
                  >
                    {t("verseActions.wordStudy.openInterlinear")} →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Emotion panel */}
      {tab === "emotion" && (
        <div className="bg-white border rounded p-3 text-sm">
          {loading ? (
            <p className="opacity-50">{t("common.loading")}</p>
          ) : emotionSeries.length === 0 ? (
            <p className="opacity-50">{t("verseActions.emotion.none")}</p>
          ) : (
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-50 mb-2">
                {t("verseActions.emotion.chapterFlow").replace("{n}", String(chapter ?? ""))}
              </p>
              <svg
                viewBox={`0 0 ${Math.max(emotionSeries.length, 1)} 40`}
                preserveAspectRatio="none"
                className="w-full h-12 block"
                role="img"
                aria-label={t("verseActions.btn.emotion")}
              >
                <line
                  x1="0"
                  y1="20"
                  x2={Math.max(emotionSeries.length, 1)}
                  y2="20"
                  stroke="currentColor"
                  strokeWidth="0.1"
                  className="opacity-20"
                />
                {emotionSeries.map((s, i) => {
                  const h = Math.max(Math.abs(s.polarity) * 18, 0.5);
                  const y = s.polarity >= 0 ? 20 - h : 20;
                  const isCurrent = s.verse === verse;
                  return (
                    <rect
                      key={i}
                      x={i}
                      y={y}
                      width={1}
                      height={h}
                      fill={
                        isCurrent
                          ? "var(--color-gold)"
                          : s.polarity >= 0
                            ? "rgb(34,197,94)"
                            : "rgb(239,68,68)"
                      }
                      opacity={isCurrent ? 1 : 0.6}
                    >
                      <title>{`v${s.verse}: ${s.polarity.toFixed(2)}`}</title>
                    </rect>
                  );
                })}
              </svg>
              <div className="flex justify-between text-[10px] opacity-40 mt-1">
                <span>v1</span>
                <span>v{emotionSeries[emotionSeries.length - 1]?.verse ?? "?"}</span>
              </div>
              {bookId && (
                <Link
                  to={`/emotional?book=${bookId}&translation=${translation}`}
                  className="text-xs text-[var(--color-gold)] hover:underline mt-2 inline-block"
                >
                  {t("verseActions.emotion.openLandscape")} →
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Topics panel */}
      {tab === "topics" && (
        <div className="bg-white border rounded p-3 text-sm">
          {loading ? (
            <p className="opacity-50">{t("common.loading")}</p>
          ) : verseTopics.length === 0 ? (
            <p className="opacity-50">{t("verseActions.topics.none")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {verseTopics.map((tp) => (
                <Link
                  key={tp.topic_id}
                  to={`/topics/${tp.slug}`}
                  className="text-xs px-2 py-1 rounded-full border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 hover:bg-[var(--color-gold)]/15 transition"
                  title={t("verseActions.topics.versesIn").replace("{n}", String(tp.verse_count))}
                >
                  {tp.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compare panel */}
      {tab === "compare" && (
        <div className="bg-white border rounded p-3 text-sm">
          {loading ? (
            <p className="opacity-50">{t("verseActions.compare.loading")}</p>
          ) : Object.keys(translations).length === 0 ? (
            <p className="opacity-50">{t("verseActions.compare.none")}</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(translations).map(([tid, txt]) => (
                <div key={tid} className="flex gap-2">
                  <span
                    className={`text-xs font-bold shrink-0 w-12 pt-0.5 ${
                      tid === translation
                        ? "text-[var(--color-gold)]"
                        : "opacity-50"
                    }`}
                  >
                    {tid.toUpperCase()}
                  </span>
                  <span className="text-xs leading-relaxed">{txt}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
