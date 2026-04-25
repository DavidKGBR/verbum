import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchAuthorDetail,
  fetchAuthorBooks,
  type Author,
  type AuthorDetail,
  type AuthorBookStats,
} from "../../services/api";
import { useI18n } from "../../i18n/i18nContext";
import { localized } from "../../i18n/localized";

interface Props {
  authors: [Author, Author];
  onClose: () => void;
}

interface AuthorData {
  detail: AuthorDetail | null;
  books: AuthorBookStats[];
  loading: boolean;
}

export default function AuthorCompare({ authors, onClose }: Props) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<[AuthorData, AuthorData]>([
    { detail: null, books: [], loading: true },
    { detail: null, books: [], loading: true },
  ]);

  useEffect(() => {
    const load = async (idx: 0 | 1) => {
      const author = authors[idx];
      try {
        const [detail, books] = await Promise.all([
          fetchAuthorDetail(author.author_id),
          fetchAuthorBooks(author.author_id),
        ]);
        setData((prev) => {
          const next = [...prev] as [AuthorData, AuthorData];
          next[idx] = { detail, books, loading: false };
          return next;
        });
      } catch {
        setData((prev) => {
          const next = [...prev] as [AuthorData, AuthorData];
          next[idx] = { detail: null, books: [], loading: false };
          return next;
        });
      }
    };
    load(0);
    load(1);
  }, [authors]);

  // Find shared top words
  const sharedWords = new Set<string>();
  if (data[0].detail?.stats?.top_words && data[1].detail?.stats?.top_words) {
    const set0 = new Set(data[0].detail.stats.top_words.map((w) => w.strongs_id));
    data[1].detail.stats.top_words.forEach((w) => {
      if (set0.has(w.strongs_id)) sharedWords.add(w.strongs_id);
    });
  }

  return (
    <div className="rounded-lg border-2 border-[var(--color-gold)]/30 bg-white p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg text-[var(--color-ink)]">
          {t("authors.compare.title")}
        </h3>
        <button
          onClick={onClose}
          className="text-xs px-3 py-1 rounded border border-red-200 text-red-400
                     hover:bg-red-50 transition"
        >
          {t("authors.compare.close")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {([0, 1] as const).map((idx) => {
          const author = authors[idx];
          const { detail, books, loading } = data[idx];

          return (
            <div key={author.author_id} className="space-y-4">
              {/* Header */}
              <div className="pb-3 border-b">
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-bold text-lg">
                    {localized(author, locale, "name")}
                  </h4>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    author.testament === "OT"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-[var(--color-new-testament)]/10 text-[var(--color-new-testament)]"
                  }`}>
                    {author.testament}
                  </span>
                </div>
                <p className="text-xs opacity-50 mt-0.5">
                  {localized(author, locale, "period")} · {localized(author, locale, "literary_style")}
                </p>
                <p className="text-xs opacity-40 mt-0.5">
                  {author.books.length} {author.books.length !== 1 ? t("authors.books") : t("authors.book")}: {author.books.join(", ")}
                </p>
              </div>

              {loading && (
                <p className="text-xs opacity-50 animate-pulse">{t("authors.compare.loadingStats")}</p>
              )}

              {/* Vocab stats */}
              {!loading && detail?.stats && detail.stats.unique_strongs > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <StatBox
                    value={detail.stats.unique_strongs.toLocaleString()}
                    label={t("authors.uniqueWords")}
                  />
                  <StatBox
                    value={detail.stats.total_words.toLocaleString()}
                    label={t("authors.totalWords")}
                  />
                  <StatBox
                    value={detail.stats.total_verses.toLocaleString()}
                    label={t("authors.verses")}
                  />
                  <StatBox
                    value={
                      detail.stats.total_words > 0
                        ? `${((detail.stats.unique_strongs / detail.stats.total_words) * 100).toFixed(1)}%`
                        : "—"
                    }
                    label={t("authors.vocabRichness")}
                  />
                </div>
              )}

              {/* Top words (shared ones highlighted) */}
              {!loading && detail?.stats?.top_words && detail.stats.top_words.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-1">
                    {t("authors.compare.topWords")}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.stats.top_words.map((w, i) => {
                      const isShared = sharedWords.has(w.strongs_id);
                      return (
                        <Link
                          key={i}
                          to={`/word-study/${w.strongs_id}`}
                          className={`text-[11px] px-2 py-0.5 rounded transition ${
                            isShared
                              ? "bg-[var(--color-gold)]/30 text-[var(--color-gold-dark)] font-bold ring-1 ring-[var(--color-gold)]/50"
                              : "bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] hover:bg-[var(--color-gold)]/20"
                          }`}
                          title={`${w.strongs_id} — ${w.gloss} — ${w.occurrences}×${isShared ? ` (${t("authors.compare.highlighted")})` : ""}`}
                        >
                          {w.transliteration && <span className="font-semibold">{w.transliteration}</span>}
                          {w.transliteration && w.gloss ? " · " : ""}
                          {w.gloss} <span className="opacity-40">({w.occurrences})</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Book stats bars */}
              {!loading && books.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-1">
                    {t("authors.compare.books")}
                  </div>
                  <div className="space-y-1">
                    {books.map((b) => {
                      const maxWords = Math.max(...books.map((x) => x.total_words), 1);
                      const pct = (b.total_words / maxWords) * 100;
                      return (
                        <div key={b.book_id} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold w-10 shrink-0 text-[var(--color-gold-dark)]">
                            {b.book_id}
                          </span>
                          <div className="flex-1 h-4 bg-gray-50 rounded overflow-hidden relative">
                            <div
                              className="h-full rounded bg-[var(--color-gold)]/40"
                              style={{ width: `${Math.max(pct, 3)}%` }}
                            />
                            <span className="absolute inset-0 flex items-center px-1.5 text-[9px] text-[var(--color-ink)]">
                              {b.total_words.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sharedWords.size > 0 && (
        <div className="mt-4 pt-3 border-t text-xs opacity-50 text-center">
          {(sharedWords.size === 1
            ? t("authors.compare.shared")
            : t("authors.compare.sharedPlural")
          ).replace("{n}", String(sharedWords.size))}
          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[var(--color-gold)]/40 align-middle" /> {t("authors.compare.highlighted")}
        </div>
      )}
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-2 rounded bg-[var(--color-gold)]/5">
      <div className="text-base font-bold text-[var(--color-gold-dark)]">{value}</div>
      <div className="text-[8px] uppercase tracking-wider opacity-50">{label}</div>
    </div>
  );
}
