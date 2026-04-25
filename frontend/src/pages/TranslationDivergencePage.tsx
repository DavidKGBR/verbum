import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchDivergence,
  type DivergenceResult,
} from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useTranslationIds } from "../hooks/useTranslations";
import { useI18n } from "../i18n/i18nContext";

const DEFAULT_TRANSLATIONS = ["kjv", "nvi", "rvr", "bbe", "acf"];

export default function TranslationDivergencePage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const allTranslations = useTranslationIds();
  const [strongsId, setStrongsId] = useState(searchParams.get("word") || "H2617");
  const [selectedTrans, setSelectedTrans] = useState<string[]>(DEFAULT_TRANSLATIONS);
  const [data, setData] = useState<DivergenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedVerse, setExpandedVerse] = useState<string | null>(null);

  function load() {
    if (!strongsId) return;
    setLoading(true);
    setSearchParams({ word: strongsId }, { replace: true });
    fetchDivergence(strongsId, selectedTrans.join(","), 30)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleTrans(tid: string) {
    setSelectedTrans((prev) =>
      prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title text-2xl">{t("divergence.title")}</h1>
        <p className="text-sm opacity-60 mt-1">
          {t("divergence.subtitle")}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs opacity-60">{t("divergence.strongsLabel")}</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={strongsId}
              onChange={(e) => setStrongsId(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder={t("divergence.placeholder")}
              className="border rounded px-3 py-1.5 w-28 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40"
            />
            <button
              onClick={load}
              className="text-sm px-3 py-1.5 rounded bg-[var(--color-gold)] text-white
                         hover:opacity-90 transition"
            >
              {t("divergence.compareBtn")}
            </button>
          </div>
        </label>

        <div className="flex flex-wrap gap-1.5">
          {allTranslations.map((tid) => (
            <button
              key={tid}
              onClick={() => toggleTrans(tid)}
              className={`text-[10px] px-2 py-1 rounded border uppercase tracking-wider transition ${
                selectedTrans.includes(tid)
                  ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)]"
                  : "bg-white hover:bg-gray-50 border-gray-200"
              }`}
            >
              {tid}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingSpinner text={t("divergence.loading")} />}

      {data && !loading && (
        <>
          {/* Summary */}
          <div className="rounded-lg border bg-white p-4 mb-6">
            <div className="flex items-baseline gap-3 flex-wrap">
              <Link
                to={`/word-study/${data.strongs_id}`}
                className="font-display font-bold text-xl text-[var(--color-ink)] hover:text-[var(--color-gold)] transition"
              >
                {data.strongs_id}
              </Link>
              <span className="text-sm italic opacity-70">{data.gloss}</span>
              <span className="text-xs opacity-50 ml-auto">
                {t("divergence.summary")
                  .replace("{total}", String(data.total_verses))
                  .replace("{shown}", String(data.verses.length))}
              </span>
            </div>
          </div>

          {/* Comparison table */}
          <div className="overflow-x-auto rounded border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-[var(--color-parchment)]/50">
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider opacity-60 sticky left-0 bg-[var(--color-parchment)]/90 z-10">
                    {t("divergence.refHeader")}
                  </th>
                  {selectedTrans.map((tid) => (
                    <th
                      key={tid}
                      className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider opacity-60 min-w-[200px]"
                    >
                      {tid}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.verses.map((v) => {
                  const isExpanded = expandedVerse === v.verse_id;
                  return (
                    <tr
                      key={v.verse_id}
                      className="border-b hover:bg-[var(--color-gold)]/5 transition cursor-pointer"
                      onClick={() =>
                        setExpandedVerse(isExpanded ? null : v.verse_id)
                      }
                    >
                      <td className="px-3 py-2 font-display font-bold text-xs text-[var(--color-gold-dark)] sticky left-0 bg-white z-10 whitespace-nowrap">
                        <Link
                          to={`/reader?book=${v.verse_id.split(".")[0]}&chapter=${v.verse_id.split(".")[1]}&verse=${v.verse_id.split(".")[2]}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-[var(--color-gold)] transition"
                        >
                          {v.reference || v.verse_id}
                        </Link>
                      </td>
                      {selectedTrans.map((tid) => {
                        const text = v.texts[tid] || "";
                        return (
                          <td
                            key={tid}
                            className="px-3 py-2 font-body leading-relaxed"
                          >
                            {isExpanded
                              ? text
                              : text.length > 120
                                ? `${text.slice(0, 120)}…`
                                : text}
                            {!text && (
                              <span className="opacity-30 italic">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.verses.length === 0 && (
            <p className="text-sm opacity-50 italic mt-4">
              {t("divergence.noVerses").replace("{id}", data.strongs_id)}
            </p>
          )}
        </>
      )}

      {!data && !loading && (
        <div className="rounded-lg border border-dashed border-[var(--color-gold-dark)]/30 p-8 text-center">
          <p className="opacity-60 mb-3">
            {t("divergence.emptyHint")}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["H2617", "G25", "G3056", "H430", "G4102"].map((w) => (
              <button
                key={w}
                onClick={() => { setStrongsId(w); }}
                className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-gold)]/30
                           hover:bg-[var(--color-gold)]/10 transition text-[var(--color-gold-dark)]"
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
