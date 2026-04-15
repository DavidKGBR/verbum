import { useEffect, useState } from "react";
import {
  fetchEmotionalLandscape,
  fetchEmotionalPeaks,
  fetchBookProfiles,
} from "../services/api";
import { useBooks, localizeBookName } from "../i18n/bookNames";
import { useI18n } from "../i18n/i18nContext";
import LoadingSpinner from "../components/common/LoadingSpinner";

interface SentimentPoint {
  verse_id: string;
  chapter: number;
  verse: number;
  polarity: number;
  label: string;
}

interface PeakVerse {
  verse_id: string;
  reference: string;
  chapter: number;
  verse: number;
  text: string;
  polarity: number;
  label: string;
}

interface BookProfile {
  book_id: string;
  book_name: string;
  testament: string;
  avg_polarity: number;
  min_polarity: number;
  max_polarity: number;
  positive: number;
  negative: number;
  neutral: number;
  verse_count: number;
}

type Tab = "landscape" | "profiles";

export default function EmotionalLandscapePage() {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>("landscape");
  const books = useBooks("kjv");
  const [selectedBook, setSelectedBook] = useState("PSA");
  const [series, setSeries] = useState<SentimentPoint[]>([]);
  const [peaks, setPeaks] = useState<PeakVerse[]>([]);
  const [profiles, setProfiles] = useState<BookProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Load landscape data when book changes
  useEffect(() => {
    if (tab !== "landscape") return;
    setLoading(true);
    Promise.all([
      fetchEmotionalLandscape(selectedBook),
      fetchEmotionalPeaks(selectedBook, "positive", 10),
    ])
      .then(([land, pk]) => {
        setSeries(land.series);
        setPeaks(pk.results);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedBook, tab]);

  // Load profiles
  useEffect(() => {
    if (tab !== "profiles") return;
    setLoading(true);
    fetchBookProfiles()
      .then((d) => setProfiles(d.profiles))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  // Simple sparkline-like sentiment visualization
  const maxAbs = Math.max(
    ...series.map((s) => Math.abs(s.polarity)),
    0.01
  );

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-1">{t("emotional.title")}</h1>
      <p className="text-sm opacity-60 mb-6">{t("emotional.subtitle")}</p>

      <div className="flex gap-2 mb-6">
        {(["landscape", "profiles"] as Tab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === tb
                ? "bg-[var(--color-gold)] text-white"
                : "bg-black/5 hover:bg-black/10"
            }`}
          >
            {tb === "landscape" ? t("emotional.title") : t("emotional.profiles")}
          </button>
        ))}
      </div>

      {tab === "landscape" && (
        <>
          {/* Book selector */}
          <div className="mb-6">
            <select
              value={selectedBook}
              onChange={(e) => setSelectedBook(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--color-gold)]/30 bg-white text-sm"
            >
              {books.map((b) => (
                <option key={b.book_id} value={b.book_id}>
                  {b.book_name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <LoadingSpinner text={t("common.loading")} />
          ) : (
            <>
              {/* Sentiment terrain */}
              <div className="mb-8 rounded-lg border bg-white p-4 overflow-hidden">
                <h3 className="text-[10px] uppercase tracking-wider font-bold opacity-40 mb-3">
                  Sentiment Flow — {series.length} verses
                </h3>
                <div className="flex items-center h-32 gap-px">
                  {series.map((s, i) => {
                    const height = Math.abs(s.polarity) / maxAbs;
                    const isPositive = s.polarity >= 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 min-w-0 flex flex-col justify-center h-full relative group"
                        title={`${s.verse_id}: ${s.polarity.toFixed(3)} (${s.label})`}
                      >
                        <div
                          className="w-full rounded-sm transition-all group-hover:opacity-100"
                          style={{
                            height: `${Math.max(2, height * 100)}%`,
                            backgroundColor: isPositive
                              ? "rgb(34, 197, 94)"
                              : "rgb(239, 68, 68)",
                            opacity: 0.6,
                            alignSelf: isPositive ? "flex-end" : "flex-start",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] opacity-30 mt-1">
                  <span>Ch. 1</span>
                  <span>
                    Ch.{" "}
                    {series.length > 0
                      ? series[series.length - 1].chapter
                      : "?"}
                  </span>
                </div>
              </div>

              {/* Peaks */}
              {peaks.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-[10px] uppercase tracking-wider font-bold opacity-40 mb-3">
                    {t("emotional.peaks")} — Most Positive
                  </h3>
                  <div className="space-y-2">
                    {peaks.map((p) => (
                      <div
                        key={p.verse_id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-white"
                      >
                        <span
                          className="text-xs font-mono font-bold shrink-0 w-16 text-right"
                          style={{
                            color:
                              p.polarity >= 0
                                ? "rgb(34, 197, 94)"
                                : "rgb(239, 68, 68)",
                          }}
                        >
                          {p.polarity > 0 ? "+" : ""}
                          {p.polarity.toFixed(3)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold">{p.reference}</div>
                          <div className="text-xs opacity-60 mt-0.5 line-clamp-2">
                            {p.text}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === "profiles" && (
        <>
          {loading ? (
            <LoadingSpinner text={t("common.loading")} />
          ) : (
            <div className="space-y-1.5">
              {profiles.map((p) => {
                const total = p.positive + p.negative + p.neutral;
                return (
                  <div
                    key={p.book_id}
                    className="flex items-center gap-3 text-sm group"
                  >
                    <span className="w-28 text-right text-xs opacity-70 shrink-0 truncate">
                      {localizeBookName(p.book_id, locale, p.book_name)}
                    </span>
                    {/* Stacked bar: negative | neutral | positive */}
                    <div className="flex-1 h-5 bg-black/5 rounded overflow-hidden flex">
                      {p.negative > 0 && (
                        <div
                          className="h-full bg-red-400/70"
                          style={{
                            width: `${(p.negative / total) * 100}%`,
                          }}
                          title={`Negative: ${p.negative}`}
                        />
                      )}
                      {p.neutral > 0 && (
                        <div
                          className="h-full bg-gray-300/70"
                          style={{
                            width: `${(p.neutral / total) * 100}%`,
                          }}
                          title={`Neutral: ${p.neutral}`}
                        />
                      )}
                      {p.positive > 0 && (
                        <div
                          className="h-full bg-green-400/70"
                          style={{
                            width: `${(p.positive / total) * 100}%`,
                          }}
                          title={`Positive: ${p.positive}`}
                        />
                      )}
                    </div>
                    <span className="text-xs tabular-nums opacity-50 w-14 text-right">
                      {p.avg_polarity > 0 ? "+" : ""}
                      {p.avg_polarity.toFixed(2)}
                    </span>
                  </div>
                );
              })}
              {/* Legend */}
              <div className="flex items-center gap-4 justify-center pt-4 text-[10px] opacity-40">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-400/70" /> Negative
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-gray-300/70" /> Neutral
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-400/70" /> Positive
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
