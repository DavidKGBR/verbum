import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCrossrefsBetween, type DetailedCrossRef } from "../../services/api";

interface Props {
  sourceBook: string;
  targetBook: string;
  connectionCount: number;
  onClose: () => void;
}

export default function ArcDetailPanel({
  sourceBook,
  targetBook,
  connectionCount,
  onClose,
}: Props) {
  const navigate = useNavigate();
  const [crossrefs, setCrossrefs] = useState<DetailedCrossRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetchCrossrefsBetween(sourceBook, targetBook)
      .then((d) => setCrossrefs(d.crossrefs))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [sourceBook, targetBook]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function goToVerse(vid: string) {
    const parts = vid.split(".");
    if (parts.length === 3) {
      navigate(`/reader?book=${parts[0]}&chapter=${parts[1]}&verse=${parts[2]}`);
    }
  }

  function onRowKey(e: React.KeyboardEvent, vid: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToVerse(vid);
    }
  }

  return (
    <div
      className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l shadow-lg overflow-y-auto p-4 max-h-[60vh] lg:max-h-none"
      role="complementary"
      aria-label={`Cross-references from ${sourceBook} to ${targetBook}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-display font-bold text-[var(--color-ink)]">
            {sourceBook} → {targetBook}
          </h3>
          <p className="text-xs opacity-60">{connectionCount} connections</p>
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

      {loading ? (
        <div className="space-y-3 animate-pulse" aria-busy="true" aria-live="polite">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded p-2">
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-1.5"></div>
              <div className="h-3 bg-gray-100 rounded w-full"></div>
              <div className="h-3 bg-gray-100 rounded w-5/6 mt-1"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 bg-red-50 rounded p-2">
          Could not load cross-references. Try again later.
        </p>
      ) : crossrefs.length === 0 ? (
        <p className="text-sm opacity-50">No detailed data available.</p>
      ) : (
        <div className="space-y-3">
          {crossrefs.map((cr, i) => (
            <div key={i} className="border rounded p-2 text-xs">
              <div
                role="button"
                tabIndex={0}
                onClick={() => goToVerse(cr.source_verse_id)}
                onKeyDown={(e) => onRowKey(e, cr.source_verse_id)}
                className="cursor-pointer hover:text-[var(--color-gold)] transition
                           rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50 p-0.5"
              >
                <span className="font-bold">{cr.source_ref || cr.source_verse_id}</span>
                <p className="opacity-70 line-clamp-2 mt-0.5">
                  {cr.source_text || "—"}
                </p>
              </div>
              <div className="text-center text-[var(--color-gold)] my-1">↓</div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => goToVerse(cr.target_verse_id)}
                onKeyDown={(e) => onRowKey(e, cr.target_verse_id)}
                className="cursor-pointer hover:text-[var(--color-gold)] transition
                           rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50 p-0.5"
              >
                <span className="font-bold">{cr.target_ref || cr.target_verse_id}</span>
                <p className="opacity-70 line-clamp-2 mt-0.5">
                  {cr.target_text || "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
