import { useEffect, useRef, useState } from "react";
import {
  useVerseNotes,
  type HighlightCategory,
} from "../../hooks/useVerseNotes";
import HighlightBar from "./HighlightBar";
import { formatRelative } from "../../utils/dateFormat";
import { useI18n } from "../../i18n/i18nContext";

interface Props {
  verseId: string;
  reference?: string;
  text?: string;
  translation?: string;
  bookId?: string;
  bookName?: string;
  chapter?: number;
  verse?: number;
  onSaved?: () => void;
}

const MAX_LENGTH = 1000;

export default function NoteEditor({
  verseId,
  reference,
  text,
  translation,
  bookId,
  bookName,
  chapter,
  verse,
  onSaved,
}: Props) {
  const { t } = useI18n();
  const { get, upsert, remove } = useVerseNotes();
  const existing = get(verseId);

  const [category, setCategory] = useState<HighlightCategory | undefined>(
    existing?.category
  );
  const [noteText, setNoteText] = useState<string>(existing?.note ?? "");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Refresh state when a different verse is loaded (same component instance)
  useEffect(() => {
    setCategory(existing?.category);
    setNoteText(existing?.note ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseId]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [verseId]);

  const hasChanges =
    (existing?.category ?? undefined) !== category ||
    (existing?.note ?? "") !== noteText;

  function doSave() {
    upsert(verseId, {
      category,
      note: noteText,
      reference,
      text,
      translation,
      book_id: bookId,
      book_name: bookName,
      chapter,
      verse,
    });
    onSaved?.();
  }

  function doDelete() {
    remove(verseId);
    setCategory(undefined);
    setNoteText("");
    onSaved?.();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (hasChanges) doSave();
    }
  }

  return (
    <div className="bg-white border rounded p-3 text-sm space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs uppercase tracking-wider opacity-50 font-display">
          {t("notes.editor.label")}
        </div>
        <HighlightBar value={category} onChange={setCategory} size="sm" />
      </div>

      <textarea
        ref={textareaRef}
        value={noteText}
        onChange={(e) => setNoteText(e.target.value.slice(0, MAX_LENGTH))}
        onKeyDown={handleKeyDown}
        rows={5}
        placeholder={t("notes.editor.placeholder")}
        className="w-full rounded border border-[var(--color-gold-dark)]/20 px-3 py-2
                   text-sm leading-relaxed bg-[var(--color-parchment)]/40
                   focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50
                   focus:border-[var(--color-gold)]/50 resize-y"
      />

      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="opacity-50">
          <span className="tabular-nums">{noteText.length}</span>
          <span className="mx-1">/</span>
          <span className="tabular-nums">{MAX_LENGTH}</span>
          {existing && (
            <span className="ml-3">
              {t("notes.editor.lastEdit").replace("{when}", formatRelative(existing.updated_at))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {existing && (
            <button
              type="button"
              onClick={doDelete}
              className="px-3 py-1 rounded border border-red-300 text-red-700
                         hover:bg-red-50 transition focus:outline-none
                         focus:ring-2 focus:ring-red-300"
            >
              {t("notes.editor.delete")}
            </button>
          )}
          <button
            type="button"
            onClick={doSave}
            disabled={!hasChanges}
            className="px-3 py-1 rounded bg-[var(--color-gold)] text-white
                       hover:opacity-90 transition disabled:opacity-30
                       disabled:cursor-not-allowed focus:outline-none
                       focus:ring-2 focus:ring-[var(--color-gold)]/60"
          >
            {t("notes.editor.save")}
          </button>
        </div>
      </div>

      <p className="text-[11px] opacity-40">
        {t("notes.editor.tip")}
      </p>
    </div>
  );
}
