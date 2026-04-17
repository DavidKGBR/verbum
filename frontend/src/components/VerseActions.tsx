import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchVerseCrossrefs,
  fetchVerseTranslations,
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

export type Tab = "none" | "crossrefs" | "compare" | "explain" | "notes" | "commentary";

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
          className={`text-xs px-3 py-1 rounded border transition ${
            tab === "crossrefs"
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : "hover:bg-gray-100"
          }`}
        >
          🔗 {t("verseActions.btn.crossrefs")}
        </button>
        <button
          onClick={loadExplain}
          className={`text-xs px-3 py-1 rounded border transition ${
            tab === "explain"
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : "hover:bg-gray-100"
          }`}
        >
          🤖 {t("verseActions.btn.explain")}
        </button>
        <button
          onClick={() => setTab(tab === "commentary" ? "none" : "commentary")}
          className={`text-xs px-3 py-1 rounded border transition ${
            tab === "commentary"
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : "hover:bg-gray-100"
          }`}
        >
          📚 {t("verseActions.btn.commentary")}
        </button>
        <button
          onClick={loadCompare}
          className={`text-xs px-3 py-1 rounded border transition ${
            tab === "compare"
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : "hover:bg-gray-100"
          }`}
        >
          🔀 {t("verseActions.btn.compare")}
        </button>
      </div>

      <div className="flex gap-2 mb-2 flex-wrap">
        <button
          onClick={() => setTab(tab === "notes" ? "none" : "notes")}
          title={hasNote ? t("verseActions.note.edit") : t("verseActions.note.add")}
          className={`text-xs px-3 py-1 rounded border transition ${
            tab === "notes"
              ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
              : hasNote
                ? "bg-amber-50 text-amber-900 border-amber-300"
                : "hover:bg-gray-100"
          }`}
        >
          {hasNote ? `✍️ ${t("verseActions.btn.noteWith")}` : `✍️ ${t("verseActions.btn.note")}`}
        </button>
        <button
          onClick={handleBookmark}
          title={bookmarked ? t("verseActions.bookmark.remove") : t("verseActions.bookmark.save")}
          className={`text-xs px-3 py-1 rounded border transition ${
            bookmarked
              ? "bg-amber-100 text-amber-800 border-amber-300"
              : "hover:bg-gray-100"
          }`}
        >
          {bookmarked ? `★ ${t("verseActions.btn.saved")}` : `☆ ${t("verseActions.btn.save")}`}
        </button>
        <button
          onClick={copyVerse}
          className="text-xs px-3 py-1 rounded border hover:bg-gray-100 transition"
        >
          {copied ? `✅ ${t("verseActions.btn.copied")}` : `📋 ${t("verseActions.btn.copy")}`}
        </button>
        <button
          onClick={() => setShareOpen(true)}
          className="text-xs px-3 py-1 rounded border hover:bg-gray-100 transition"
        >
          🖼️ {t("verseActions.btn.share")}
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
