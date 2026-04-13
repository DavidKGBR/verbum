import { Link } from "react-router-dom";
import { useBookmarks, type Bookmark } from "../hooks/useBookmarks";
import { formatDate } from "../utils/dateFormat";

const SUGGESTED_VERSES: Array<Omit<Bookmark, "added_at">> = [
  {
    verse_id: "JHN.3.16",
    reference: "John 3:16",
    text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    translation: "kjv",
  },
  {
    verse_id: "PSA.23.1",
    reference: "Psalm 23:1",
    text: "The LORD is my shepherd; I shall not want.",
    translation: "kjv",
  },
  {
    verse_id: "PHP.4.13",
    reference: "Philippians 4:13",
    text: "I can do all things through Christ which strengtheneth me.",
    translation: "kjv",
  },
];

function verseLink(verseId: string, translation?: string): string {
  const parts = verseId.split(".");
  if (parts.length !== 3) return "/reader";
  const [book, chapter, verse] = parts;
  const t = translation ? `&translation=${translation}` : "";
  return `/reader?book=${book}&chapter=${chapter}&verse=${verse}${t}`;
}

export default function BookmarksPage() {
  const { bookmarks, toggle, remove } = useBookmarks();

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="page-title text-3xl mb-2">Bookmarks</h2>
      <p className="font-body text-sm opacity-60 mb-6">
        Verses you've saved · stored locally on this device
      </p>

      {bookmarks.length === 0 ? (
        <div>
          <div className="text-center mb-5">
            <div className="text-5xl mb-2 opacity-30">☆</div>
            <p className="opacity-70 font-body">
              No bookmarks yet. Try starting with one of these:
            </p>
          </div>
          <div className="space-y-2">
            {SUGGESTED_VERSES.map((v) => (
              <div
                key={v.verse_id}
                className="flex items-start gap-3 bg-white border rounded-lg p-4 card-hover"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    to={verseLink(v.verse_id, v.translation)}
                    className="font-display font-bold text-[var(--color-gold)]
                               hover:text-[var(--color-gold-dark)] transition"
                  >
                    {v.reference}
                  </Link>
                  <p className="verse-text text-sm mt-1 line-clamp-2 opacity-80">
                    {v.text}
                  </p>
                </div>
                <button
                  onClick={() => toggle(v)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded border border-amber-300
                             text-amber-700 bg-amber-50 hover:bg-amber-100
                             transition focus:outline-none focus:ring-2
                             focus:ring-[var(--color-gold)]/40"
                  aria-label={`Bookmark ${v.reference}`}
                >
                  ★ Save
                </button>
              </div>
            ))}
          </div>
          <div className="text-center mt-5">
            <Link
              to="/reader"
              className="text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-dark)]
                         transition"
            >
              or browse the Reader →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((b) => (
            <div
              key={b.verse_id}
              className="bg-white border rounded-lg p-4 card-hover group"
            >
              <div className="flex items-start gap-3">
                <span className="text-amber-400 text-xl shrink-0 pt-0.5">★</span>
                <div className="flex-1 min-w-0">
                  <Link
                    to={verseLink(b.verse_id, b.translation)}
                    className="font-display font-bold text-[var(--color-ink)] hover:text-[var(--color-gold)] transition"
                  >
                    {b.reference || b.verse_id}
                  </Link>
                  {b.translation && (
                    <span className="text-xs opacity-50 ml-2">
                      {b.translation.toUpperCase()}
                    </span>
                  )}
                  {b.text && (
                    <p className="verse-text text-sm mt-1.5 line-clamp-2">
                      {b.text}
                    </p>
                  )}
                  <p className="text-xs opacity-40 mt-2">
                    Saved {formatDate(b.added_at)}
                  </p>
                </div>
                <button
                  onClick={() => remove(b.verse_id)}
                  className="text-xs opacity-0 group-hover:opacity-100 text-red-600
                             hover:bg-red-50 px-2 py-1 rounded transition"
                  title="Remove bookmark"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
