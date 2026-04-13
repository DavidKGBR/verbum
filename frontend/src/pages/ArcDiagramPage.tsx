import { useState } from "react";
import { useArcData } from "../hooks/useArcData";
import ArcDiagram from "../components/ArcDiagram/ArcDiagram";
import ArcDetailPanel from "../components/ArcDiagram/ArcDetailPanel";
import LoadingSpinner from "../components/common/LoadingSpinner";

interface SelectedArc {
  sourceBook: string;
  targetBook: string;
  connectionCount: number;
}

export default function ArcDiagramPage() {
  const { books, arcs, totalCrossrefs, loading, error, filters, setFilters } =
    useArcData();
  const [selectedArc, setSelectedArc] = useState<SelectedArc | null>(null);

  function handleArcClick(sourceBook: string, targetBook: string, count: number) {
    setSelectedArc({ sourceBook, targetBook, connectionCount: count });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-[var(--color-ink)]">
        Cross-Reference Arc Diagram
      </h2>
      <p className="text-sm opacity-60 mb-4">
        {totalCrossrefs.toLocaleString()} total cross-references &middot;{" "}
        {arcs.length} arcs shown &middot; Inspired by Chris Harrison
      </p>

      {/* Filter controls */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <label className="flex items-center gap-2 text-sm">
          Source book:
          <select
            value={filters.sourceBook}
            onChange={(e) => setFilters({ sourceBook: e.target.value })}
            className="border rounded px-2 py-1 bg-white text-sm"
          >
            <option value="">All books</option>
            {books.map((b) => (
              <option key={b.book_id} value={b.book_id}>
                {b.book_name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          Color by:
          <select
            value={filters.colorBy}
            onChange={(e) =>
              setFilters({
                colorBy: e.target.value as "distance" | "testament" | "category",
              })
            }
            className="border rounded px-2 py-1 bg-white text-sm"
          >
            <option value="distance">Arc distance</option>
            <option value="testament">Testament</option>
            <option value="category">Book category</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          Min connections: {filters.minConnections}
          <input
            type="range"
            min={1}
            max={50}
            value={filters.minConnections}
            onChange={(e) =>
              setFilters({ minConnections: Number(e.target.value) })
            }
            className="w-32"
          />
        </label>
      </div>

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading cross-references..." />
      ) : (
        <div className="flex flex-col lg:flex-row border rounded bg-white overflow-hidden">
          <div className="flex-1 overflow-x-auto">
            <ArcDiagram
              books={books}
              arcs={arcs}
              colorBy={filters.colorBy}
              width={selectedArc ? 900 : 1200}
              height={480}
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
