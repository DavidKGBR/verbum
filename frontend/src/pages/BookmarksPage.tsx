import { Link } from "react-router-dom";
import { useBookmarks, type Bookmark } from "../hooks/useBookmarks";
import { formatDate } from "../utils/dateFormat";
import { useI18n, type Locale } from "../i18n/i18nContext";
import { localizeBookName } from "../i18n/bookNames";

// Suggested starters per locale — each block uses the locale's own
// translation (NVI for PT, RVR for ES, KJV for EN). verse_id stays
// canonical so the Reader deep-link works regardless of language.
const SUGGESTED_VERSES: Record<Locale, Array<Omit<Bookmark, "added_at">>> = {
  en: [
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
  ],
  pt: [
    {
      verse_id: "JHN.3.16",
      reference: "João 3:16",
      text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho Unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.",
      translation: "nvi",
    },
    {
      verse_id: "PSA.23.1",
      reference: "Salmos 23:1",
      text: "O Senhor é o meu pastor; nada me faltará.",
      translation: "nvi",
    },
    {
      verse_id: "PHP.4.13",
      reference: "Filipenses 4:13",
      text: "Posso todas as coisas naquele que me fortalece.",
      translation: "nvi",
    },
  ],
  es: [
    {
      verse_id: "JHN.3.16",
      reference: "Juan 3:16",
      text: "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.",
      translation: "rvr",
    },
    {
      verse_id: "PSA.23.1",
      reference: "Salmos 23:1",
      text: "Jehová es mi pastor; nada me faltará.",
      translation: "rvr",
    },
    {
      verse_id: "PHP.4.13",
      reference: "Filipenses 4:13",
      text: "Todo lo puedo en Cristo que me fortalece.",
      translation: "rvr",
    },
  ],
};

function verseLink(verseId: string, translation?: string): string {
  const parts = verseId.split(".");
  if (parts.length !== 3) return "/reader";
  const [book, chapter, verse] = parts;
  const t = translation ? `&translation=${translation}` : "";
  return `/reader?book=${book}&chapter=${chapter}&verse=${verse}${t}`;
}

/**
 * Saved bookmarks carry `reference` in whatever language the user was
 * reading in at save time — usually EN because KJV was the old default.
 * Re-derive the reference in the user's current locale from verse_id
 * so an English-saved "1 Kings 14:10" reads as "1 Reis 14:10" today.
 * Falls back to the stored reference / verse_id if the shape is unknown.
 */
function localizedBookmarkRef(b: Bookmark, locale: Locale): string {
  const parts = b.verse_id.split(".");
  if (parts.length !== 3) return b.reference || b.verse_id;
  const [bookId, chapter, verse] = parts;
  // Prefer the stored EN reference as the fallback for localizeBookName
  // (so we don't lose a "1 Kings" → "1 Kings" when the user's locale is EN).
  const m = (b.reference ?? "").match(/^(.+?)\s+\d+:\d+$/);
  const enBookName = m?.[1] ?? bookId;
  return `${localizeBookName(bookId, locale, enBookName)} ${chapter}:${verse}`;
}

export default function BookmarksPage() {
  const { t, locale } = useI18n();
  const { bookmarks, toggle, remove } = useBookmarks();

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="page-title text-3xl mb-2">{t("bookmarks.title")}</h2>
      <p className="font-body text-sm opacity-60 mb-6">
        {t("bookmarks.subtitle")}
      </p>

      {bookmarks.length === 0 ? (
        <div>
          <div className="text-center mb-5">
            <div className="text-5xl mb-2 opacity-30">☆</div>
            <p className="opacity-70 font-body">
              {t("bookmarks.emptyTitle")}
            </p>
          </div>
          <div className="space-y-2">
            {SUGGESTED_VERSES[locale].map((v) => (
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
                  aria-label={t("bookmarks.saveAria").replace("{reference}", v.reference ?? v.verse_id)}
                >
                  {t("bookmarks.save")}
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
              {t("bookmarks.browseReader")}
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
                    {localizedBookmarkRef(b, locale)}
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
                    {t("bookmarks.savedOn").replace("{date}", formatDate(b.added_at))}
                  </p>
                </div>
                <button
                  onClick={() => remove(b.verse_id)}
                  className="text-xs opacity-0 group-hover:opacity-100 text-red-600
                             hover:bg-red-50 px-2 py-1 rounded transition"
                  title={t("bookmarks.removeTitle")}
                >
                  {t("bookmarks.remove")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
