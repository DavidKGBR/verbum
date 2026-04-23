import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchExplorerSearch,
  type ExplorerSearchResult,
} from "../../services/api";
import { useI18n } from "../../i18n/i18nContext";

interface Props {
  onSelect: (result: ExplorerSearchResult) => void;
}

/**
 * Color-coded pill per result type. Emoji icons (📗🏷️🔗👤📍) were removed
 * in favor of the text-only colored badge — the pill color alone is enough
 * to signal category, and fewer pictographs mean a cleaner list.
 */
const TYPE_COLORS: Record<string, string> = {
  strongs: "text-green-700",
  topic: "text-amber-700",
  thread: "text-teal-700",
  person: "text-blue-700",
  place: "text-orange-700",
};

export default function ExplorerSearchBar({ onSelect }: Props) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExplorerSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const lang = locale !== "en" ? locale : undefined;
      const data = await fetchExplorerSearch(q, 12, lang);
      setResults(data.results);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 250);
    return () => clearTimeout(timerRef.current);
  }, [query, search]);

  function handleSelect(r: ExplorerSearchResult) {
    setOpen(false);
    setQuery("");
    setResults([]);
    onSelect(r);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIdx(-1);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("explorer.searchPlaceholder")}
          className="w-full pl-10 pr-9 py-2.5 rounded-lg border border-[var(--color-gold-dark)]/20
                     bg-white text-sm text-[var(--color-ink)]
                     placeholder:text-[var(--color-ink)]/40
                     focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50
                     focus:border-[var(--color-gold)]/50 transition"
        />
        {/* Magnifying glass icon (SVG, currentColor) */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-gold-dark)]/50 pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        {loading && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                       rounded-full border-2 border-[var(--color-gold-dark)]/30
                       border-t-[var(--color-gold)] animate-spin"
            aria-label="Loading"
          />
        )}
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg shadow-lg
                     bg-white border border-[var(--color-gold-dark)]/20
                     max-h-80 overflow-y-auto"
          onMouseDown={(e) => e.preventDefault()} // prevent blur closing
        >
          {results.map((r, i) => (
            <button
              key={`${r.type}:${r.id}`}
              onClick={() => handleSelect(r)}
              className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition
                ${i === activeIdx ? "bg-[var(--color-gold)]/10" : "hover:bg-[var(--color-gold)]/5"}
                ${i > 0 ? "border-t border-[var(--color-gold-dark)]/10" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate text-[var(--color-ink)]">
                    {r.label}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-bold ${TYPE_COLORS[r.type] || "opacity-50"}`}
                  >
                    {t(`explorer.typeBadge.${r.type}`)}
                  </span>
                </div>
                {r.secondary_label && (
                  <p className="text-xs opacity-50 truncate mt-0.5">
                    {r.secondary_label}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Click-away */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
