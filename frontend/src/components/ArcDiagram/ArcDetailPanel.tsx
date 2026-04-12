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

  useEffect(() => {
    setLoading(true);
    fetchCrossrefsBetween(sourceBook, targetBook)
      .then((d) => setCrossrefs(d.crossrefs))
      .catch(() => setCrossrefs([]))
      .finally(() => setLoading(false));
  }, [sourceBook, targetBook]);

  function goToVerse(vid: string) {
    const parts = vid.split(".");
    if (parts.length === 3) {
      navigate(`/reader?book=${parts[0]}&chapter=${parts[1]}&verse=${parts[2]}`);
    }
  }

  return (
    <div className="w-80 bg-white border-l shadow-lg overflow-y-auto p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-[var(--color-ink)]">
            {sourceBook} → {targetBook}
          </h3>
          <p className="text-xs opacity-60">{connectionCount} connections</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-lg leading-none"
        >
          &times;
        </button>
      </div>

      {loading ? (
        <p className="text-sm opacity-50">Loading...</p>
      ) : crossrefs.length === 0 ? (
        <p className="text-sm opacity-50">No detailed data available.</p>
      ) : (
        <div className="space-y-3">
          {crossrefs.map((cr, i) => (
            <div key={i} className="border rounded p-2 text-xs">
              <div
                onClick={() => goToVerse(cr.source_verse_id)}
                className="cursor-pointer hover:text-[var(--color-gold)] transition"
              >
                <span className="font-bold">{cr.source_ref || cr.source_verse_id}</span>
                <p className="opacity-70 line-clamp-2 mt-0.5">
                  {cr.source_text || "—"}
                </p>
              </div>
              <div className="text-center text-[var(--color-gold)] my-1">↓</div>
              <div
                onClick={() => goToVerse(cr.target_verse_id)}
                className="cursor-pointer hover:text-[var(--color-gold)] transition"
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
