import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCrossrefsBetween, type DetailedCrossRef } from "../../services/api";
import { localizeBookName, localizeBookAbbrev } from "../../i18n/bookNames";
import { useI18n, type Locale } from "../../i18n/i18nContext";

interface Props {
  sourceBook: string;
  targetBook: string;
  connectionCount: number;
  onClose: () => void;
}

const INITIAL_GROUPS_VISIBLE = 5;

function parseChapter(verseId: string): number {
  const parts = verseId.split(".");
  return parts.length >= 2 ? Number(parts[1]) || 0 : 0;
}

/** Short reference like "1:2" from "GEN.1.2" if source_ref is not provided. */
function shortRef(verseId: string): string {
  const parts = verseId.split(".");
  if (parts.length < 3) return verseId;
  return `${parts[1]}:${parts[2]}`;
}

/** Locale-aware "Ap 22:4" / "Rev 22:4" / "Ap 22:4" from "REV.22.4".
 *
 * The backend's `target_ref` is always English ("Revelation 22:4"), so we
 * ignore it for non-English locales and rebuild from the canonical verse_id
 * via the localized abbreviation table. English keeps the backend string
 * (which already carries the human form like "Rev 22:4"). */
function shortRefWithBook(
  verseId: string,
  fallback: string | null | undefined,
  locale: Locale,
): string {
  const parts = verseId.split(".");
  if (parts.length < 3) return fallback || verseId;
  if (locale === "en" && fallback) return fallback;
  const abbrev = localizeBookAbbrev(parts[0], locale);
  return `${abbrev} ${parts[1]}:${parts[2]}`;
}

export default function ArcDetailPanel({
  sourceBook,
  targetBook,
  connectionCount,
  onClose,
}: Props) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [crossrefs, setCrossrefs] = useState<DetailedCrossRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const srcName = localizeBookName(sourceBook, locale);
  const tgtName = localizeBookName(targetBook, locale);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setShowAll(false);
    fetchCrossrefsBetween(sourceBook, targetBook)
      .then((d) => setCrossrefs(d.crossrefs))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [sourceBook, targetBook]);

  // Esc closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Group crossrefs by source chapter
  const groups = useMemo(() => {
    const map = new Map<number, DetailedCrossRef[]>();
    for (const cr of crossrefs) {
      const ch = parseChapter(cr.source_verse_id);
      if (!map.has(ch)) map.set(ch, []);
      map.get(ch)!.push(cr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [crossrefs]);

  const visibleGroups = showAll ? groups : groups.slice(0, INITIAL_GROUPS_VISIBLE);
  const hiddenGroupsCount = groups.length - INITIAL_GROUPS_VISIBLE;

  function goToVerse(vid: string) {
    const parts = vid.split(".");
    if (parts.length === 3) {
      navigate(`/reader?book=${parts[0]}&chapter=${parts[1]}&verse=${parts[2]}`);
    }
  }

  function openBook(bookId: string) {
    navigate(`/reader?book=${bookId}&chapter=1`);
  }

  return (
    <div
      className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l shadow-lg flex flex-col max-h-[60vh] lg:max-h-none lg:h-full"
      role="complementary"
      aria-label={`${srcName} → ${tgtName}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start p-4 border-b">
        <div>
          <h3 className="font-display font-bold text-[var(--color-ink)]">
            {srcName} → {tgtName}
          </h3>
          <p className="text-xs opacity-60">
            {connectionCount.toLocaleString()} {t("arc.connections")}
            {crossrefs.length > 0 && crossrefs.length < connectionCount && (
              <span className="opacity-70"> · {t("arc.showingTop").replace("{n}", String(crossrefs.length))}</span>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="text-gray-400 hover:text-gray-700 text-xl leading-none px-2 rounded
                     focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]"
        >
          &times;
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3 animate-pulse" aria-busy="true" aria-live="polite">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-1.5"></div>
                <div className="h-2 bg-gray-100 rounded w-full mb-1"></div>
                <div className="h-2 bg-gray-100 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 bg-red-50 rounded p-2">
            {t("arc.loadError")}
          </p>
        ) : groups.length === 0 ? (
          <p className="text-sm opacity-50">{t("arc.noData")}</p>
        ) : (
          <>
            <div className="space-y-2">
              {visibleGroups.map(([chapter, refs]) => (
                <details
                  key={chapter}
                  open
                  className="group border rounded px-2 py-1 open:bg-gray-50/50"
                >
                  <summary
                    className="cursor-pointer text-xs font-bold text-[var(--color-ink)]
                               py-1 px-0.5 select-none list-none flex items-center gap-1
                               marker:content-none"
                  >
                    <span className="text-[var(--color-gold)] text-[10px]
                                     transition-transform group-open:rotate-90">
                      ▸
                    </span>
                    <span>
                      {srcName} {chapter}
                    </span>
                    <span className="opacity-50 font-normal ml-auto">
                      {refs.length} {refs.length !== 1 ? t("arc.refs") : t("arc.ref")}
                    </span>
                  </summary>
                  <div className="space-y-0.5 mt-1">
                    {refs.map((cr, i) => (
                      <button
                        key={i}
                        onClick={() => goToVerse(cr.target_verse_id)}
                        className="w-full text-left text-xs rounded px-1.5 py-1
                                   hover:bg-[var(--color-gold)]/10 transition
                                   focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]/40
                                   flex items-center gap-2"
                        title={cr.target_text || ""}
                      >
                        <span className="font-mono text-[var(--color-gold-dark)] shrink-0">
                          {cr.source_ref ? cr.source_ref.split(" ").pop() : shortRef(cr.source_verse_id)}
                        </span>
                        <span className="opacity-50">→</span>
                        <span className="text-[var(--color-gold)] font-bold truncate">
                          {shortRefWithBook(cr.target_verse_id, cr.target_ref, locale)}
                        </span>
                        <span className="opacity-40 ml-auto">▸</span>
                      </button>
                    ))}
                  </div>
                </details>
              ))}
            </div>

            {hiddenGroupsCount > 0 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full mt-3 text-xs text-[var(--color-gold)]
                           py-2 rounded border border-dashed border-[var(--color-gold)]/30
                           hover:bg-[var(--color-gold)]/5 transition"
              >
                {t("arc.showMore").replace("{n}", String(hiddenGroupsCount))}
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer: Reader shortcuts */}
      {!loading && !error && groups.length > 0 && (
        <div className="border-t p-3 grid grid-cols-2 gap-2 shrink-0 bg-gray-50/60">
          <button
            onClick={() => openBook(sourceBook)}
            className="text-xs px-2 py-1.5 rounded border
                       hover:bg-[var(--color-gold)]/10 hover:border-[var(--color-gold)]/50
                       transition focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40"
          >
            {t("arc.open")} {srcName} →
          </button>
          <button
            onClick={() => openBook(targetBook)}
            className="text-xs px-2 py-1.5 rounded border
                       hover:bg-[var(--color-gold)]/10 hover:border-[var(--color-gold)]/50
                       transition focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40"
          >
            {t("arc.open")} {tgtName} →
          </button>
        </div>
      )}
    </div>
  );
}
