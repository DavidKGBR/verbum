import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchEmotionalLandscape,
  fetchEmotionalPeaks,
  fetchBookProfiles,
} from "../services/api";
import { useBooks, localizeBookName, localizeBookAbbrev } from "../i18n/bookNames";
import { useI18n, defaultTranslationFor } from "../i18n/i18nContext";
import { SENTIMENT_COVERED_PT, SENTIMENT_COVERED_ES } from "../i18n/sentimentCoverage";
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

type Emotion = "positive" | "negative";

export default function EmotionalLandscapePage() {
  const { t, locale } = useI18n();
  const translation = defaultTranslationFor(locale);
  const [tab, setTab] = useState<Tab>("landscape");
  const books = useBooks(translation);
  const [selectedBook, setSelectedBook] = useState("PSA");
  const [series, setSeries] = useState<SentimentPoint[]>([]);
  const [peaks, setPeaks] = useState<PeakVerse[]>([]);
  const [emotion, setEmotion] = useState<Emotion>("positive");
  const [profiles, setProfiles] = useState<BookProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab !== "landscape") return;
    setLoading(true);
    Promise.all([
      fetchEmotionalLandscape(selectedBook, translation),
      fetchEmotionalPeaks(selectedBook, emotion, 10, translation),
    ])
      .then(([land, pk]) => {
        setSeries(land.series);
        setPeaks(pk.results);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedBook, tab, emotion, translation]);

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
            {tb === "landscape" ? t("emotional.tab.landscape") : t("emotional.profiles")}
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

          {/* Fallback indicator moved to inline info icon on the chart title (less noisy). */}

          {loading ? (
            <LoadingSpinner text={t("common.loading")} />
          ) : (
            <>
              {/* Sentiment terrain — SVG scales responsively regardless of verse count */}
              <div className="mb-8 rounded-lg border bg-white p-4 overflow-hidden">
                <h3 className="text-[10px] uppercase tracking-wider font-bold opacity-40 mb-3 flex items-center gap-2">
                  <span>
                    {t("emotional.sentimentFlow")} —{" "}
                    {t("emotional.versesCount").replace("{n}", String(series.length))}
                  </span>
                  {locale !== "en" && !(locale === "pt" ? SENTIMENT_COVERED_PT : SENTIMENT_COVERED_ES).has(selectedBook) && (
                    <span
                      title={t("emotional.sentimentFallback")}
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-current opacity-50 cursor-help normal-case tracking-normal"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 8v5M12 17h.01" />
                      </svg>
                    </span>
                  )}
                </h3>
                <svg
                  viewBox={`0 0 ${Math.max(series.length, 1)} 100`}
                  preserveAspectRatio="none"
                  className="w-full h-32 block"
                  role="img"
                  aria-label={t("emotional.sentimentFlow")}
                >
                  {/* Zero baseline */}
                  <line
                    x1="0"
                    y1="50"
                    x2={Math.max(series.length, 1)}
                    y2="50"
                    stroke="currentColor"
                    strokeWidth="0.1"
                    className="opacity-10"
                  />
                  {series.map((s, i) => {
                    const norm = s.polarity / maxAbs; // in [-1, 1]
                    const barHeight = Math.max(Math.abs(norm) * 50, 0.5); // min 0.5 viewBox units
                    const y = norm >= 0 ? 50 - barHeight : 50;
                    return (
                      <rect
                        key={i}
                        x={i}
                        y={y}
                        width={1}
                        height={barHeight}
                        fill={norm >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
                        opacity={0.7}
                      >
                        <title>
                          {`${localizeBookAbbrev(selectedBook, locale).toUpperCase()} ${s.chapter}:${s.verse} — ${s.polarity.toFixed(3)} (${t(`emotional.label.${s.label}`)})`}
                        </title>
                      </rect>
                    );
                  })}
                </svg>
                <div className="flex justify-between text-[10px] opacity-30 mt-1">
                  <span>{t("emotional.chapter").replace("{n}", "1")}</span>
                  <span>
                    {t("emotional.chapter").replace(
                      "{n}",
                      String(series.length > 0 ? series[series.length - 1].chapter : "?"),
                    )}
                  </span>
                </div>
                {series.length > 0 && series.every((s) => Math.abs(s.polarity) < 0.05) && (
                  <p className="text-[11px] italic opacity-60 mt-3 text-center">
                    {t("emotional.noVariation")}
                  </p>
                )}
              </div>

              {/* Peaks */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-[10px] uppercase tracking-wider font-bold opacity-40">
                    {t("emotional.peaks")} —{" "}
                    {emotion === "positive"
                      ? t("emotional.peaks.mostPositive")
                      : t("emotional.peaks.mostNegative")}
                  </h3>
                  <div className="flex gap-1">
                    {(["positive", "negative"] as Emotion[]).map((em) => (
                      <button
                        key={em}
                        onClick={() => setEmotion(em)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                          emotion === em
                            ? em === "positive"
                              ? "bg-green-500/20 text-green-700"
                              : "bg-red-500/20 text-red-700"
                            : "bg-black/5 hover:bg-black/10 opacity-50"
                        }`}
                      >
                        {em === "positive"
                          ? t("emotional.peaks.mostPositive")
                          : t("emotional.peaks.mostNegative")}
                      </button>
                    ))}
                  </div>
                </div>
                {peaks.length > 0 && (
                  <div className="space-y-2">
                    {peaks.map((p) => {
                      const bookId = p.verse_id.split(".")[0] ?? selectedBook;
                      const localizedRef = `${localizeBookName(bookId, locale, bookId)} ${p.chapter}:${p.verse}`;
                      return (
                        <Link
                          key={p.verse_id}
                          to={`/reader?book=${bookId}&chapter=${p.chapter}&verse=${p.verse}&translation=${translation}`}
                          title={t("emotional.viewInReader")}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)]/5 transition"
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
                            <div className="text-sm font-bold">{localizedRef}</div>
                            <div className="text-xs opacity-60 mt-0.5 line-clamp-2">
                              {p.text}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
                          title={`${t("emotional.label.negative")}: ${p.negative}`}
                        />
                      )}
                      {p.neutral > 0 && (
                        <div
                          className="h-full bg-gray-300/70"
                          style={{
                            width: `${(p.neutral / total) * 100}%`,
                          }}
                          title={`${t("emotional.label.neutral")}: ${p.neutral}`}
                        />
                      )}
                      {p.positive > 0 && (
                        <div
                          className="h-full bg-green-400/70"
                          style={{
                            width: `${(p.positive / total) * 100}%`,
                          }}
                          title={`${t("emotional.label.positive")}: ${p.positive}`}
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
                  <span className="w-3 h-3 rounded bg-red-400/70" /> {t("emotional.label.negative")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-gray-300/70" /> {t("emotional.label.neutral")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-400/70" /> {t("emotional.label.positive")}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
