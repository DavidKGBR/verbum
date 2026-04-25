import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchCommunityNotes,
  fetchRecentNotes,
  fetchCommunityStats,
  type CommunityNote,
  type CommunityStats,
} from "../services/api";
import { useI18n, defaultTranslationFor } from "../i18n/i18nContext";
import { localized } from "../i18n/localized";
import { localizeBookName } from "../i18n/bookNames";
import LoadingSpinner from "../components/common/LoadingSpinner";

function formatVerseId(verseId: string, locale: string): string {
  const parts = verseId.split(".");
  if (parts.length !== 3) return verseId;
  return `${localizeBookName(parts[0], locale, parts[0])} ${parts[1]}:${parts[2]}`;
}

export default function CommunityPage() {
  const { t, locale } = useI18n();
  const [notes, setNotes] = useState<CommunityNote[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchVerse, setSearchVerse] = useState("");
  const [searchResults, setSearchResults] = useState<CommunityNote[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRecentNotes(20), fetchCommunityStats()])
      .then(([n, s]) => {
        setNotes(n.notes);
        setStats(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = () => {
    if (!searchVerse.trim()) {
      setSearchResults(null);
      return;
    }
    fetchCommunityNotes(searchVerse.trim().toUpperCase())
      .then((d) => setSearchResults(d.notes))
      .catch(() => setSearchResults([]));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-1">{t("community.title")}</h1>
      <p className="text-sm opacity-60 mb-6">{t("community.subtitle")}</p>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border border-[var(--color-gold)]/15 bg-white p-4 text-center">
            <div className="text-2xl font-bold">{stats.total_notes}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-50 mt-1">
              {t("community.totalNotes")}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--color-gold)]/15 bg-white p-4 text-center">
            <div className="text-2xl font-bold">{stats.unique_verses}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-50 mt-1">
              {t("community.versesCovered")}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--color-gold)]/15 bg-white p-4 text-center">
            <div className="text-2xl font-bold">
              {Object.keys(stats.categories).length}
            </div>
            <div className="text-[10px] uppercase tracking-wider opacity-50 mt-1">
              {t("community.categories")}
            </div>
          </div>
        </div>
      )}

      {/* Verse search */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={searchVerse}
          onChange={(e) => setSearchVerse(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={t("community.searchPlaceholder")}
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-gold)]/30 bg-white text-sm"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded-lg bg-[var(--color-gold)] text-white text-sm font-medium"
        >
          {t("community.search")}
        </button>
      </div>

      {/* Search results */}
      {searchResults !== null && (
        <div className="mb-8">
          <h3 className="text-[10px] uppercase tracking-wider font-bold opacity-40 mb-3">
            {t("community.forVerse")} — {formatVerseId(searchVerse.trim().toUpperCase(), locale)} (
            {searchResults.length})
          </h3>
          {searchResults.length === 0 ? (
            <p className="text-sm opacity-50">{t("community.noNotesForVerse")}</p>
          ) : (
            <NoteList
              notes={searchResults}
              expanded={expanded}
              onToggle={setExpanded}
            />
          )}
        </div>
      )}

      {/* Recent notes */}
      {loading ? (
        <LoadingSpinner text={t("common.loading")} />
      ) : (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider font-bold opacity-40 mb-3">
            {t("community.recentNotes")}
          </h3>
          <NoteList
            notes={notes}
            expanded={expanded}
            onToggle={setExpanded}
          />
        </div>
      )}

      {/* Submit link */}
      <div className="mt-8 p-4 rounded-lg border border-dashed border-[var(--color-gold)]/30 text-center">
        <p className="text-sm opacity-60 mb-2">
          {t("community.contributionPrompt")}
        </p>
        <a
          href="https://github.com/DavidKGBR/verbum/issues/new?template=community-note.md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] hover:bg-[var(--color-gold)]/20 transition"
        >
          {t("community.submitViaGithub")}
        </a>
      </div>
    </div>
  );
}

function NoteList({
  notes,
  expanded,
  onToggle,
}: {
  notes: CommunityNote[];
  expanded: string | null;
  onToggle: (id: string | null) => void;
}) {
  const { t, locale } = useI18n();
  const CATEGORY_COLORS: Record<string, string> = {
    theology: "#8B4513",
    language: "#2E8B57",
    culture: "#4169E1",
    interpretation: "#DAA520",
    prophecy: "#B22222",
  };

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div
          key={note.id}
          className="rounded-lg border border-[var(--color-gold)]/15 bg-white overflow-hidden"
        >
          <button
            onClick={() => onToggle(expanded === note.id ? null : note.id)}
            className="w-full text-left p-4 hover:bg-[var(--color-gold)]/5 transition"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">
                {expanded === note.id ? "▾" : "▸"}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-sm">{localized(note, locale, "title")}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Link
                    to={`/reader?book=${note.verse_id.split(".")[0]}&chapter=${note.verse_id.split(".")[1]}&verse=${note.verse_id.split(".")[2]}&translation=${defaultTranslationFor(locale)}`}
                    className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold-dark)] hover:bg-[var(--color-gold)]/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {formatVerseId(note.verse_id, locale)}
                  </Link>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[note.category] || "#666"}15`,
                      color: CATEGORY_COLORS[note.category] || "#666",
                    }}
                  >
                    {t(`community.category.${note.category}`)}
                  </span>
                  <span className="text-[10px] opacity-30">{note.date}</span>
                </div>
              </div>
            </div>
          </button>

          {expanded === note.id && (
            <div className="px-4 pb-4 border-t border-[var(--color-gold)]/10">
              <p className="text-sm leading-relaxed opacity-80 pt-3 whitespace-pre-line">
                {localized(note, locale, "content")}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
