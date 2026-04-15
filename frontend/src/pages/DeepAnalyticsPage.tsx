import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchHapax,
  fetchVocabularyRichness,
  type HapaxResult,
  type VocabRichnessBook,
} from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useI18n } from "../i18n/i18nContext";
import { localizeBookName } from "../i18n/bookNames";

type Tab = "hapax" | "richness";

export default function DeepAnalyticsPage() {
  const [tab, setTab] = useState<Tab>("hapax");

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-1">Deep Analytics</h1>
      <p className="text-sm opacity-60 mb-6">
        Hapax legomena, vocabulary richness, and lexical fingerprints.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["hapax", "richness"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t
                ? "bg-[var(--color-gold)] text-white"
                : "bg-black/5 hover:bg-black/10"
            }`}
          >
            {t === "hapax" ? "Hapax Legomena" : "Vocabulary Richness"}
          </button>
        ))}
      </div>

      {tab === "hapax" && <HapaxTab />}
      {tab === "richness" && <RichnessTab />}
    </div>
  );
}

function HapaxTab() {
  const [data, setData] = useState<HapaxResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [langFilter, setLangFilter] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    fetchHapax({ language: langFilter || undefined, limit: 100 })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [langFilter]);

  if (loading) return <LoadingSpinner text="Finding hapax legomena..." />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm opacity-50">Language:</span>
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
            {l || "All"}
          </button>
        ))}
        <span className="ml-auto text-xs opacity-40">{data.length} words found</span>
      </div>

      <div className="space-y-2">
        {data.map((h) => (
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
                {h.reference} · {h.verse_text?.slice(0, 80)}...
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                h.language === "hebrew"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {h.language}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RichnessTab() {
  const { locale } = useI18n();
  const [books, setBooks] = useState<VocabRichnessBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchVocabularyRichness()
      .then(setBooks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Computing vocabulary richness..." />;

  const maxRichness = books[0]?.richness || 1;

  return (
    <div className="space-y-1.5">
      {books.map((b) => (
        <div key={b.book_id} className="flex items-center gap-3 text-sm group">
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
              title={`${localizeBookName(b.book_id, locale, b.book_name)}: ${b.richness} richness (${b.unique_words} unique / ${b.total_words} total)`}
            />
          </div>
          <span className="text-xs tabular-nums opacity-50 w-14 text-right">
            {(b.richness * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}
