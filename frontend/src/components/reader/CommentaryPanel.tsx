import { useEffect, useRef, useState } from "react";
import {
  fetchCommentary,
  COMMENTARIES,
  type CommentaryChapter,
  type CommentaryVerse,
} from "../../services/api";
import LoadingSpinner from "../common/LoadingSpinner";
import { useI18n } from "../../i18n/i18nContext";

interface Props {
  book: string;
  chapter: number;
  verse: number;
}

/**
 * Find the commentary entry that covers the requested verse.
 * Commentators often group verses (e.g. Matthew Henry has an entry for
 * verse 1 that covers 1–2, then verse 3 covers 3–5). We pick the entry
 * with the highest `number` that is <= the target verse.
 */
function findVerseEntry(
  content: CommentaryVerse[],
  verse: number
): CommentaryVerse | null {
  let best: CommentaryVerse | null = null;
  for (const entry of content) {
    if (entry.type === "verse" && entry.number <= verse) {
      if (!best || entry.number > best.number) {
        best = entry;
      }
    }
  }
  return best;
}

export default function CommentaryPanel({ book, chapter, verse }: Props) {
  const { t } = useI18n();
  const [commentaryId, setCommentaryId] = useState("matthew-henry");
  const [data, setData] = useState<CommentaryChapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In-memory cache: avoid re-fetching the same chapter when user clicks
  // different verses within the same chapter.
  const cache = useRef(new Map<string, CommentaryChapter>());

  useEffect(() => {
    const key = `${commentaryId}:${book}:${chapter}`;
    const cached = cache.current.get(key);
    if (cached) {
      setData(cached);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    fetchCommentary(commentaryId, book, chapter)
      .then((d) => {
        cache.current.set(key, d);
        setData(d);
      })
      .catch(() => setError(t("commentary.notAvailable")))
      .finally(() => setLoading(false));
  }, [commentaryId, book, chapter, t]);

  const entry = data ? findVerseEntry(data.chapter.content, verse) : null;
  const commentatorName =
    COMMENTARIES.find((c) => c.id === commentaryId)?.name ?? commentaryId;

  return (
    <div className="bg-white border rounded p-3 text-sm space-y-3">
      {/* Commentary selector */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-wider opacity-50 font-display">
          {t("commentary.label")}
        </div>
        <select
          value={commentaryId}
          onChange={(e) => setCommentaryId(e.target.value)}
          className="text-xs border rounded px-2 py-1 bg-white focus:outline-none
                     focus:ring-2 focus:ring-[var(--color-gold)]/40"
        >
          {COMMENTARIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <LoadingSpinner
          text={t("commentary.loadingCommentator").replace("{name}", commentatorName)}
        />
      )}

      {error && <p className="text-sm opacity-60 italic">{error}</p>}

      {!loading && !error && entry && (
        <div className="space-y-2">
          <div className="text-xs opacity-50">
            {entry.number === verse
              ? t("commentary.onVerse")
                  .replace("{name}", commentatorName)
                  .replace("{n}", String(verse))
              : t("commentary.onVerseRange")
                  .replace("{name}", commentatorName)
                  .replace("{a}", String(entry.number))
                  .replace("{b}", String(verse))}
          </div>
          {entry.content.map((paragraph, i) => (
            <p
              key={i}
              className="font-body text-[15px] leading-relaxed whitespace-pre-line"
            >
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {!loading && !error && !entry && data && (
        <p className="text-sm opacity-50 italic">
          {t("commentary.noneFound")
            .replace("{n}", String(verse))
            .replace("{name}", commentatorName)}
        </p>
      )}
    </div>
  );
}
