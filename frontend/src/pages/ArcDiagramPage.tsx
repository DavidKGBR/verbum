import { useEffect, useRef, useState } from "react";
import { useArcData } from "../hooks/useArcData";
import ArcDiagram from "../components/ArcDiagram/ArcDiagram";
import ArcDetailPanel from "../components/ArcDiagram/ArcDetailPanel";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useI18n } from "../i18n/i18nContext";
import { localizeBookName } from "../i18n/bookNames";

interface SelectedArc {
  sourceBook: string;
  targetBook: string;
  connectionCount: number;
}

export default function ArcDiagramPage() {
  const { t, locale } = useI18n();
  const { books, arcs, totalCrossrefs, loading, error, filters, setFilters } =
    useArcData();
  const [selectedArc, setSelectedArc] = useState<SelectedArc | null>(null);
  const lastAutoPair = useRef<string>("");

  function handleArcClick(sourceBook: string, targetBook: string, count: number) {
    setSelectedArc({ sourceBook, targetBook, connectionCount: count });
  }

  function openPairPanel(src: string, tgt: string) {
    const match = arcs.find(
      (a) => a.source_book_id === src && a.target_book_id === tgt
    );
    handleArcClick(src, tgt, match?.connection_count ?? 0);
  }

  // Auto-open the detail panel when both source and target are explicitly
  // selected. `lastAutoPair` prevents re-opening after the user closes it.
  useEffect(() => {
    const { sourceBook, targetBook } = filters;
    if (!sourceBook || !targetBook) return;
    const pairKey = `${sourceBook}→${targetBook}`;
    if (lastAutoPair.current === pairKey) return;
    lastAutoPair.current = pairKey;
    openPairPanel(sourceBook, targetBook);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.sourceBook, filters.targetBook, arcs]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-[var(--color-ink)]">
        {t("arc.pageTitle")}
      </h2>
      <p className="text-sm opacity-60 mb-4">
        {t("arc.pageSubtitle")
          .replace("{total}", totalCrossrefs.toLocaleString())
          .replace("{arcs}", String(arcs.length))}
      </p>

      {/* Filter controls */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <label className="flex items-center gap-2 text-sm">
          {t("arc.sourceBook")}
          <select
            value={filters.sourceBook}
            onChange={(e) => setFilters({ sourceBook: e.target.value })}
            className="border rounded px-2 py-1 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40"
          >
            <option value="">{t("arc.allBooks")}</option>
            {books.map((b) => (
              <option key={b.book_id} value={b.book_id}>
                {localizeBookName(b.book_id, locale, b.book_name)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          {t("arc.targetBook")}
          <select
            value={filters.targetBook}
            onChange={(e) => setFilters({ targetBook: e.target.value })}
            className="border rounded px-2 py-1 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40"
          >
            <option value="">{t("arc.allBooks")}</option>
            {books.map((b) => (
              <option key={b.book_id} value={b.book_id}>
                {localizeBookName(b.book_id, locale, b.book_name)}
              </option>
            ))}
          </select>
        </label>

        {filters.sourceBook && filters.targetBook && (
          <button
            onClick={() => openPairPanel(filters.sourceBook, filters.targetBook)}
            className="text-sm px-3 py-1 rounded bg-[var(--color-gold)] text-white
                       hover:opacity-90 transition focus:outline-none
                       focus:ring-2 focus:ring-[var(--color-gold)]/60"
          >
            {t("arc.showConnections")}
          </button>
        )}

        <label className="flex items-center gap-2 text-sm">
          {t("arc.colorBy")}
          <select
            value={filters.colorBy}
            onChange={(e) =>
              setFilters({
                colorBy: e.target.value as "distance" | "testament" | "category",
              })
            }
            className="border rounded px-2 py-1 bg-white text-sm"
          >
            <option value="distance">{t("arc.colorBy.distance")}</option>
            <option value="testament">{t("arc.colorBy.testament")}</option>
            <option value="category">{t("arc.colorBy.category")}</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          {t("arc.minConnections").replace("{n}", String(filters.minConnections))}
          <input
            type="range"
            min={1}
            max={50}
            value={filters.minConnections}
            onChange={(e) =>
              setFilters({ minConnections: Number(e.target.value) })
            }
            className="w-32 accent-[var(--color-gold)]"
          />
        </label>
      </div>

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner text={t("arc.loading")} />
      ) : (
        <div className="flex flex-col lg:flex-row border rounded bg-white overflow-hidden"
             style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>
          {/* Mobile: ArcDiagram has minWidth=720, so wrap in a horizontal
              scroller. lg:overflow-hidden keeps the diagram flush at desktop. */}
          <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden lg:overflow-hidden">
            <ArcDiagram
              books={books}
              arcs={arcs}
              colorBy={filters.colorBy}
              onArcClick={handleArcClick}
            />
          </div>
          {selectedArc && (
            <ArcDetailPanel
              sourceBook={selectedArc.sourceBook}
              targetBook={selectedArc.targetBook}
              connectionCount={selectedArc.connectionCount}
              onClose={() => setSelectedArc(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
