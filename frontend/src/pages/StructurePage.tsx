import { useEffect, useState } from "react";
import {
  fetchAllStructures,
  type LiteraryStructure,
} from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function StructurePage() {
  const [structures, setStructures] = useState<LiteraryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAllStructures()
      .then(setStructures)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = typeFilter
    ? structures.filter((s) => s.type === typeFilter)
    : structures;

  const types = [...new Set(structures.map((s) => s.type))];

  const TYPE_COLORS: Record<string, string> = {
    chiasm: "#8B4513",
    parallelism: "#2E8B57",
    inclusio: "#4169E1",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-1">Literary Structure</h1>
      <p className="text-sm opacity-60 mb-6">
        Chiasms, parallelisms, and inclusio patterns detected in biblical text.
      </p>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setTypeFilter("")}
          className={`px-3 py-1.5 rounded-full text-xs transition ${
            !typeFilter
              ? "bg-[var(--color-gold)] text-white"
              : "bg-black/5 hover:bg-black/10"
          }`}
        >
          All ({structures.length})
        </button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs capitalize transition ${
              typeFilter === t
                ? "bg-[var(--color-gold)] text-white"
                : "bg-black/5 hover:bg-black/10"
            }`}
          >
            {t} ({structures.filter((s) => s.type === t).length})
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading structures..." />
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => (
            <div
              key={s.structure_id}
              className="rounded-lg border bg-white overflow-hidden"
              style={{
                borderLeftWidth: 4,
                borderLeftColor: TYPE_COLORS[s.type] || "#666",
              }}
            >
              <button
                onClick={() =>
                  setExpanded(expanded === s.structure_id ? null : s.structure_id)
                }
                className="w-full text-left p-4 hover:bg-[var(--color-gold)]/5 transition"
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">
                    {expanded === s.structure_id ? "▾" : "▸"}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-sm">{s.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                        style={{
                          backgroundColor: `${TYPE_COLORS[s.type] || "#666"}20`,
                          color: TYPE_COLORS[s.type] || "#666",
                        }}
                      >
                        {s.type}
                      </span>
                      <span className="text-[10px] opacity-40">
                        {s.book_id} {s.chapter_start}
                        {s.chapter_end !== s.chapter_start && `–${s.chapter_end}`}
                      </span>
                      {s.confidence !== undefined && (
                        <span className="text-[10px] opacity-30">
                          {(s.confidence * 100).toFixed(0)}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {expanded === s.structure_id && (
                <div className="px-4 pb-4 border-t border-black/5">
                  {s.description && (
                    <p className="text-sm opacity-70 leading-relaxed pt-3 mb-3">
                      {s.description}
                    </p>
                  )}

                  {/* Elements visualization */}
                  {s.elements && s.elements.length > 0 && (
                    <div className="space-y-1">
                      {s.elements.map((elem, i) => {
                        const isCenter =
                          elem.label === "CENTER" ||
                          elem.label === "C" ||
                          (s.type === "chiasm" &&
                            i === Math.floor(s.elements!.length / 2));
                        return (
                          <div
                            key={i}
                            className={`flex items-start gap-3 p-2 rounded text-sm ${
                              isCenter
                                ? "bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20"
                                : "bg-black/[0.02]"
                            }`}
                            style={
                              s.type === "chiasm"
                                ? {
                                    marginLeft: `${Math.min(
                                      Math.abs(i - Math.floor(s.elements!.length / 2)) * 0,
                                      0
                                    )}px`,
                                    paddingLeft: `${
                                      Math.abs(
                                        i - Math.floor(s.elements!.length / 2)
                                      ) *
                                        8 +
                                      8
                                    }px`,
                                  }
                                : undefined
                            }
                          >
                            <span
                              className="text-xs font-mono font-bold shrink-0 w-16"
                              style={{
                                color: isCenter
                                  ? "var(--color-gold-dark)"
                                  : TYPE_COLORS[s.type] || "#666",
                              }}
                            >
                              {elem.label}
                            </span>
                            <span className="text-xs opacity-40 shrink-0 w-12">
                              v.{elem.verse_start}
                              {elem.verse_end !== elem.verse_start &&
                                `–${elem.verse_end}`}
                            </span>
                            <span className="text-xs opacity-70 flex-1">
                              {elem.summary}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
