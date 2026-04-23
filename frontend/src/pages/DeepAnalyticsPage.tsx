import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchHapax,
  fetchVocabularyRichness,
  fetchVocabularyDensity,
  type HapaxResult,
  type VocabRichnessBook,
  type ChapterDensity,
} from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useI18n, defaultTranslationFor } from "../i18n/i18nContext";
import { localizeBookName } from "../i18n/bookNames";
import { useScrollToExpanded } from "../hooks/useScrollIntoViewOnChange";

type Tab = "hapax" | "richness";

export default function DeepAnalyticsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("hapax");

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-1">{t("analytics.title")}</h1>
      <p className="text-sm opacity-60 mb-6">
        {t("analytics.subtitle")}
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["hapax", "richness"] as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === tabKey
                ? "bg-[var(--color-gold)] text-white"
                : "bg-black/5 hover:bg-black/10"
            }`}
          >
            {tabKey === "hapax" ? t("analytics.tab.hapax") : t("analytics.tab.richness")}
          </button>
        ))}
      </div>

      {tab === "hapax" && <HapaxTab />}
      {tab === "richness" && <RichnessTab />}
    </div>
  );
}

function HapaxTab() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<HapaxResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [langFilter, setLangFilter] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    fetchHapax({
      language: langFilter || undefined,
      translation: defaultTranslationFor(locale),
      limit: 100,
    })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [langFilter, locale]);

  if (loading) return <LoadingSpinner text={t("analytics.hapaxLoading")} />;

  const langLabel = (l: string): string =>
    l === "hebrew"
      ? t("analytics.lang.hebrew")
      : l === "greek"
        ? t("analytics.lang.greek")
        : t("analytics.lang.all");

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm opacity-50">{t("analytics.languageLabel")}</span>
        {["", "hebrew", "greek"].map((l) => (
          <button
            key={l}
            onClick={() => setLangFilter(l)}
            className={`px-3 py-1 rounded-full text-xs transition ${
              langFilter === l
                ? "bg-[var(--color-gold)] text-white"
                : "bg-black/5 hover:bg-black/10"
            }`}
          >
            {langLabel(l)}
          </button>
        ))}
        <span className="ml-auto text-xs opacity-40">
          {t("analytics.wordsFound").replace("{n}", String(data.length))}
        </span>
      </div>

      <div className="space-y-2">
        {data.map((h) => {
          const parts = h.verse_id.split(".");
          const chStr = parts[1] ?? "1";
          const vsStr = parts[2] ?? "1";
          const localizedRef = `${localizeBookName(h.book_id, locale, h.book_id)} ${chStr}:${vsStr}`;
          return (
            <div
              key={h.strongs_id + h.verse_id}
              className="flex items-center gap-4 p-3 rounded-lg border border-[var(--color-gold)]/15 bg-white"
            >
              <div className="w-16 shrink-0">
                <Link
                  to={`/word-study/${h.strongs_id}`}
                  className="text-sm font-mono font-bold text-[var(--color-gold-dark)] hover:underline"
                >
                  {h.strongs_id}
                </Link>
              </div>
              <div className="text-lg font-hebrew">{h.original_word}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {h.transliteration} — <span className="opacity-70">{h.gloss || h.lemma}</span>
                </div>
                <div className="text-xs opacity-50 truncate">
                  <Link
                    to={`/reader?book=${h.book_id}&chapter=${chStr}&verse=${vsStr}&translation=${defaultTranslationFor(locale)}`}
                    className="text-[var(--color-gold-dark)] hover:underline"
                    title={t("analytics.viewInReader")}
                  >
                    {localizedRef}
                  </Link>
                  {" · "}{h.verse_text?.slice(0, 80)}...
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  h.language === "hebrew"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {langLabel(h.language)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RichnessTab() {
  const { t, locale } = useI18n();
  const [books, setBooks] = useState<VocabRichnessBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [chapters, setChapters] = useState<ChapterDensity[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const registerBookRef = useScrollToExpanded(expandedBook);

  useEffect(() => {
    setLoading(true);
    fetchVocabularyRichness()
      .then(setBooks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleBookClick = (bookId: string) => {
    if (expandedBook === bookId) {
      setExpandedBook(null);
      return;
    }
    setExpandedBook(bookId);
    setChapters([]);
    setChaptersLoading(true);
    fetchVocabularyDensity(bookId)
      .then(setChapters)
      .catch(() => setChapters([]))
      .finally(() => setChaptersLoading(false));
  };

  if (loading) return <LoadingSpinner text={t("analytics.richnessLoading")} />;

  const maxRichness = books[0]?.richness || 1;

  return (
    <div>
      <div className="flex items-center gap-4 text-xs mb-3 opacity-60">
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "var(--color-old-testament)", opacity: 0.7 }}
          />
          {t("analytics.oldTestament")}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: "var(--color-new-testament)", opacity: 0.7 }}
          />
          {t("analytics.newTestament")}
        </span>
        <span className="ml-auto italic">{t("analytics.richnessNote")}</span>
      </div>
      <div className="space-y-1.5">
        {books.map((b) => {
          const isExpanded = expandedBook === b.book_id;
          const maxChapterDensity =
            chapters.length > 0 ? Math.max(...chapters.map((c) => c.density)) : 1;
          return (
            <div key={b.book_id} ref={registerBookRef(b.book_id)}>
              <button
                type="button"
                onClick={() => handleBookClick(b.book_id)}
                title={t("analytics.clickForDensity")}
                className={`w-full flex items-center gap-3 text-sm group hover:bg-black/[0.02] rounded px-1 -mx-1 transition ${
                  isExpanded ? "bg-black/[0.03]" : ""
                }`}
              >
                <span className="w-28 text-right text-xs opacity-70 shrink-0 truncate">
                  {localizeBookName(b.book_id, locale, b.book_name)}
                </span>
                <div className="flex-1 h-5 bg-black/5 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all group-hover:opacity-90"
                    style={{
                      width: `${(b.richness / maxRichness) * 100}%`,
                      backgroundColor:
                        b.testament === "Old Testament"
                          ? "var(--color-old-testament)"
                          : "var(--color-new-testament)",
                      opacity: 0.7,
                    }}
                    title={t("analytics.richnessTooltip")
                      .replace("{book}", localizeBookName(b.book_id, locale, b.book_name))
                      .replace("{richness}", String(b.richness))
                      .replace("{unique}", String(b.unique_words))
                      .replace("{total}", String(b.total_words))}
                  />
                </div>
                <span className="text-xs tabular-nums opacity-50 w-14 text-right">
                  {(b.richness * 100).toFixed(1)}%
                </span>
              </button>
              {isExpanded && (
                <div className="mt-2 mb-4 ml-28 pl-3 pr-16 border-l-2 border-[var(--color-gold)]/30">
                  <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1.5">
                    {t("analytics.chapterDensityTitle")}
                  </div>
                  {chaptersLoading ? (
                    <span className="text-xs opacity-40">…</span>
                  ) : chapters.length === 0 ? (
                    <span className="text-xs opacity-40 italic">
                      {t("analytics.noDensityData")}
                    </span>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(18px,1fr))] gap-0.5">
                      {chapters.map((c) => (
                        <Link
                          key={c.chapter}
                          to={`/reader?book=${b.book_id}&chapter=${c.chapter}&verse=1&translation=${defaultTranslationFor(locale)}`}
                          className="h-5 rounded-sm hover:ring-2 hover:ring-[var(--color-gold)] transition-all flex items-center justify-center text-[8px] text-white/80 font-mono"
                          style={{
                            backgroundColor: "var(--color-gold)",
                            opacity: 0.25 + 0.7 * (c.density / maxChapterDensity),
                          }}
                          title={t("analytics.densityTooltip")
                            .replace("{n}", String(c.chapter))
                            .replace("{unique}", String(c.unique_words))
                            .replace("{total}", String(c.total_words))}
                        >
                          {c.chapter}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
