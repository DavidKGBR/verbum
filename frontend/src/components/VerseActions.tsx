import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchVerseCrossrefs,
  fetchVerseTranslations,
  type VerseCrossRef,
} from "../services/api";

interface Props {
  verseId: string;
  text: string;
  translation: string;
}

type Tab = "none" | "crossrefs" | "compare";

export default function VerseActions({ verseId, text, translation }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("none");
  const [crossrefs, setCrossrefs] = useState<VerseCrossRef[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadCrossrefs() {
    if (tab === "crossrefs") { setTab("none"); return; }
    setTab("crossrefs");
    setLoading(true);
    try {
      const data = await fetchVerseCrossrefs(verseId);
      setCrossrefs(data.outgoing);
    } catch { setCrossrefs([]); }
    finally { setLoading(false); }
  }

  async function loadCompare() {
    if (tab === "compare") { setTab("none"); return; }
    setTab("compare");
    setLoading(true);
    try {
      const data = await fetchVerseTranslations(verseId, "kjv,nvi,rvr,bbe,ra,acf");
      setTranslations(data.translations);
    } catch { setTranslations({}); }
    finally { setLoading(false); }
  }

  function copyVerse() {
    navigator.clipboard.writeText(`${verseId} — ${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function goToVerse(vid: string) {
    const parts = vid.split(".");
    if (parts.length === 3) {
      navigate(`/reader?book=${parts[0]}&chapter=${parts[1]}&verse=${parts[2]}`);
    }
  }

  return (
    <div className="ml-9 mb-3 mt-1">
      {/* Action buttons */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={loadCrossrefs}
          className={`text-xs px-3 py-1 rounded border transition ${
            tab === "crossrefs" ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]" : "hover:bg-gray-100"
          }`}
        >
          🔗 Cross-refs
        </button>
        <button
          onClick={loadCompare}
          className={`text-xs px-3 py-1 rounded border transition ${
            tab === "compare" ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]" : "hover:bg-gray-100"
          }`}
        >
          🔀 Compare
        </button>
        <button
          onClick={copyVerse}
          className="text-xs px-3 py-1 rounded border hover:bg-gray-100 transition"
        >
          {copied ? "✅ Copied" : "📋 Copy"}
        </button>
      </div>

      {/* Cross-refs panel */}
      {tab === "crossrefs" && (
        <div className="bg-white border rounded p-3 text-sm">
          {loading ? (
            <p className="opacity-50">Loading cross-references...</p>
          ) : crossrefs.length === 0 ? (
            <p className="opacity-50">No cross-references found.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold opacity-60 mb-2">
                {crossrefs.length} cross-references
              </p>
              {crossrefs.slice(0, 10).map((cr) => (
                <div
                  key={cr.target_verse_id}
                  onClick={() => goToVerse(cr.target_verse_id)}
                  className="flex gap-2 cursor-pointer hover:bg-[var(--color-gold)]/10
                             rounded p-1.5 transition"
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
                  + {crossrefs.length - 10} more
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Compare panel */}
      {tab === "compare" && (
        <div className="bg-white border rounded p-3 text-sm">
          {loading ? (
            <p className="opacity-50">Loading translations...</p>
          ) : Object.keys(translations).length === 0 ? (
            <p className="opacity-50">No translations found.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(translations).map(([tid, txt]) => (
                <div key={tid} className="flex gap-2">
                  <span
                    className={`text-xs font-bold shrink-0 w-12 pt-0.5 ${
                      tid === translation ? "text-[var(--color-gold)]" : "opacity-50"
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
