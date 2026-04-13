import { Link } from "react-router-dom";
import { useBookmarks } from "../hooks/useBookmarks";

function verseLink(verseId: string, translation?: string): string {
  const parts = verseId.split(".");
  if (parts.length !== 3) return "/reader";
  const [book, chapter, verse] = parts;
  const t = translation ? `&translation=${translation}` : "";
  return `/reader?book=${book}&chapter=${chapter}&verse=${verse}${t}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BookmarksPage() {
  const { bookmarks, remove } = useBookmarks();

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="page-title text-3xl mb-2">Bookmarks</h2>
      <p className="font-body text-sm opacity-60 mb-6">
        Verses you've saved · stored locally on this device
      </p>

      {bookmarks.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center">
          <div className="text-5xl mb-3 opacity-30">☆</div>
          <p className="opacity-60 mb-4">No bookmarks yet.</p>
          <Link
            to="/reader"
            className="inline-block bg-[var(--color-gold)] text-white px-4 py-2 rounded text-sm hover:opacity-90 transition"
          >
            Start reading
          </Link>
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
