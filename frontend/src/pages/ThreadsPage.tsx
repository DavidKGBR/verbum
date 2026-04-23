import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchThreads,
  fetchThread,
  type SemanticThread,
  type ThreadDetail,
} from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useI18n, defaultTranslationFor } from "../i18n/i18nContext";
import { useScrollToExpanded } from "../hooks/useScrollIntoViewOnChange";
import { localizeBookAbbrev, localizeBookName } from "../i18n/bookNames";

// Semantic tags come from STEPBible morphology in raw form, e.g.
// "{H8354=שָׁתָה=to drink}" or "H9001=ו=&/{H1980G=הָלַךְ=: went»to go:...}".
// Extract just the readable gloss (last "=" segment inside the first {...}).
function cleanSemanticTag(raw: string): string {
  const braceMatch = raw.match(/\{([^}]+)\}/);
  const inner = (braceMatch ? braceMatch[1] : raw).trim();
  const eqParts = inner.split("=");
  const glossRaw = eqParts[eqParts.length - 1].trim();
  const segments = glossRaw
    .split(/[:;»]/)
    .map((s) => s.replace(/_/g, " ").trim())
    .filter(Boolean);
  return segments[0] || glossRaw || raw;
}

// STEPBible transliteration uses dots (syllable) and slashes (morpheme),
// e.g. "va/i.Ye.shet" or "ve./'esh.Teh". Collapse to plain lowercase.
function cleanTransliteration(raw: string): string {
  if (!raw) return "";
  return raw.replace(/[./\\`'"]+/g, "").toLowerCase();
}

// Truncate at word boundary within maxChars.
function truncateAtWord(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice) + "…";
}

export default function ThreadsPage() {
  const { t, locale } = useI18n();
  const [threads, setThreads] = useState<SemanticThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const registerCardRef = useScrollToExpanded(expanded);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [minBooks, setMinBooks] = useState(3);

  useEffect(() => {
    setLoading(true);
    fetchThreads(minBooks)
      .then(setThreads)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [minBooks]);

  const handleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(id);
    setDetailLoading(true);
    fetchThread(id, defaultTranslationFor(locale))
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  };

  // Re-fetch detail when locale changes while a thread is expanded.
  useEffect(() => {
    if (!expanded) return;
    setDetailLoading(true);
    fetchThread(expanded, defaultTranslationFor(locale))
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-1">{t("threads.title")}</h1>
      <p className="text-sm opacity-60 mb-6">
        {t("threads.subtitle")}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm opacity-50">{t("threads.minBooks")}</span>
        {[2, 3, 5, 8, 10].map((n) => (
          <button
            key={n}
            onClick={() => setMinBooks(n)}
            className={`px-3 py-1 rounded-full text-xs transition ${
              minBooks === n
                ? "bg-[var(--color-gold)] text-white"
                : "bg-black/5 hover:bg-black/10"
            }`}
          >
            {t("threads.minPlus").replace("{n}", String(n))}
          </button>
        ))}
        <span className="ml-auto text-xs opacity-40">
          {(threads.length === 1 ? t("threads.foundSingular") : t("threads.found"))
            .replace("{n}", String(threads.length))}
        </span>
      </div>

      {loading ? (
        <LoadingSpinner text={t("threads.loading")} />
      ) : threads.length === 0 ? (
        <p className="text-sm opacity-50">{t("threads.noResults")}</p>
      ) : (
        <div className="space-y-3">
          {threads.map((th) => (
            <div
              key={th.id}
              ref={registerCardRef(th.id)}
              className="rounded-lg border border-[var(--color-gold)]/15 bg-white overflow-hidden"
            >
              <button
                onClick={() => handleExpand(th.id)}
                className="w-full text-left p-4 hover:bg-[var(--color-gold)]/5 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {expanded === th.id ? "▾" : "▸"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-display font-bold text-sm"
                      title={th.semantic_tag}
                    >
                      {cleanSemanticTag(th.semantic_tag)}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] opacity-50">
                        {t("threads.statsVerses").replace("{n}", String(th.verse_count))}
                      </span>
                      <span className="text-[10px] opacity-50">
                        {t("threads.statsBooks").replace("{n}", String(th.book_count))}
                      </span>
                      <span className="text-[10px] opacity-50">
                        {t("threads.statsWords").replace("{n}", String(th.word_count))}
                      </span>
                    </div>
                  </div>
                  <div
                    className="w-16 h-2 rounded-full bg-black/5 overflow-hidden"
                    title={t("threads.tooltipStrength").replace("{score}", th.strength_score.toFixed(2))}
                  >
                    <div
                      className="h-full rounded-full bg-[var(--color-gold)]"
                      style={{
                        width: `${Math.min(100, th.strength_score * 20)}%`,
                      }}
                    />
                  </div>
                </div>
              </button>

              {expanded === th.id && (
                <div className="px-4 pb-4 border-t border-[var(--color-gold)]/10">
                  {detailLoading ? (
                    <p className="text-sm opacity-50 py-3 animate-pulse">
                      {t("threads.loadingThread")}
                    </p>
                  ) : detail ? (
                    <div className="pt-3 space-y-4">
                      {/* Book distribution */}
                      <div className="flex flex-wrap gap-1.5">
                        {detail.books.map((b) => (
                          <span
                            key={b.book_id}
                            title={localizeBookName(b.book_id, locale, b.book_id)}
                            className="text-[10px] px-2 py-1 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] cursor-help"
                          >
                            {localizeBookAbbrev(b.book_id, locale).toUpperCase()}{" "}
                            <span className="opacity-50">({b.count})</span>
                          </span>
                        ))}
                      </div>

                      {/* Verses — grouped by verse_id (same verse may have multiple hits) */}
                      {(() => {
                        const grouped: Array<{
                          verse_id: string;
                          book_id: string;
                          chapter: number;
                          verse: number;
                          verse_text: string | null;
                          hits: Array<{ transliteration: string; gloss: string }>;
                        }> = [];
                        const indexByVid: Record<string, number> = {};
                        for (const v of detail.verses) {
                          if (!(v.verse_id in indexByVid)) {
                            indexByVid[v.verse_id] = grouped.length;
                            grouped.push({
                              verse_id: v.verse_id,
                              book_id: v.book_id,
                              chapter: v.chapter,
                              verse: v.verse,
                              verse_text: v.verse_text ?? null,
                              hits: [],
                            });
                          }
                          grouped[indexByVid[v.verse_id]].hits.push({
                            transliteration: cleanTransliteration(v.transliteration),
                            gloss: v.gloss,
                          });
                        }
                        const shown = grouped.slice(0, 30);
                        return (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {shown.map((g) => (
                              <div
                                key={g.verse_id}
                                className="flex items-start gap-3 p-2 rounded bg-black/[0.02]"
                              >
                                <Link
                                  to={`/reader?book=${g.book_id}&chapter=${g.chapter}&verse=${g.verse}&translation=${defaultTranslationFor(locale)}`}
                                  className="text-xs font-mono text-[var(--color-gold-dark)] hover:underline shrink-0 w-20"
                                >
                                  {`${localizeBookAbbrev(g.book_id, locale).toUpperCase()} ${g.chapter}:${g.verse}`}
                                </Link>
                                <div className="text-xs opacity-70 flex-1 min-w-0">
                                  <div className="flex flex-wrap gap-1.5 mb-0.5">
                                    {g.hits.map((h, i) => (
                                      <span
                                        key={i}
                                        className="font-bold opacity-60"
                                        title={h.gloss}
                                      >
                                        {h.transliteration}
                                        {g.hits.length > 1 && i < g.hits.length - 1 ? " ·" : ""}
                                      </span>
                                    ))}
                                    <span className="opacity-40">
                                      ×{g.hits.length > 1 ? g.hits.length : 1}
                                    </span>
                                  </div>
                                  {g.verse_text && (
                                    <span className="block opacity-70 leading-snug">
                                      {truncateAtWord(g.verse_text, 180)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {grouped.length > 30 && (
                              <p className="text-xs text-center opacity-40 py-2">
                                {t("threads.moreVerses").replace(
                                  "{n}",
                                  String(grouped.length - 30),
                                )}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
