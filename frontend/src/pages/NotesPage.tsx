import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useVerseNotes,
  HIGHLIGHT_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  type HighlightCategory,
  type VerseNote,
} from "../hooks/useVerseNotes";
import {
  notesToMarkdown,
  downloadMarkdown,
} from "../components/notes/notesExport";
import { formatDate } from "../utils/dateFormat";
import { useI18n } from "../i18n/i18nContext";
import { localizeBookName } from "../i18n/bookNames";

type Filter = "all" | HighlightCategory | "uncategorised";

function readerLinkFor(n: VerseNote): string {
  const parts = n.verse_id.split(".");
  const book = n.book_id ?? parts[0];
  const chapter = n.chapter ?? (Number(parts[1]) || 1);
  const verse = n.verse ?? (Number(parts[2]) || 1);
  const translation = n.translation ?? "kjv";
  return `/reader?book=${book}&chapter=${chapter}&verse=${verse}&translation=${translation}`;
}

export default function NotesPage() {
  const { notes, list, remove } = useVerseNotes();
  const { locale } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const all = useMemo(() => list(), [list]);

  const filtered = useMemo(() => {
    if (filter === "all") return all;
    if (filter === "uncategorised") return all.filter((n) => !n.category);
    return all.filter((n) => n.category === filter);
  }, [all, filter]);

  const groupedByBook = useMemo(() => {
    const m = new Map<string, VerseNote[]>();
    for (const n of filtered) {
      const key = n.book_name ?? n.book_id ?? "—";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(n);
    }
    return m;
  }, [filtered]);

  const markdown = useMemo(
    () => notesToMarkdown(filtered, { title: "Verbum Notes" }),
    [filtered]
  );

  const bookCount = groupedByBook.size;
  const totalCount = Object.keys(notes).length;

  function copyMarkdown() {
    navigator.clipboard
      .writeText(markdown)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title text-3xl">Notes</h1>
        <p className="text-sm opacity-60 mt-1">
          {totalCount === 0
            ? "No notes yet. Open the Reader, click a verse, and pick ✍️ Note."
            : `${filtered.length} ${filtered.length === 1 ? "note" : "notes"}${
                filter === "all" ? "" : " (filtered)"
              } in ${bookCount} ${bookCount === 1 ? "book" : "books"}`}
        </p>
      </div>

      {totalCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`All (${all.length})`}
          />
          {HIGHLIGHT_CATEGORIES.map((cat) => {
            const count = all.filter((n) => n.category === cat).length;
            if (count === 0) return null;
            return (
              <FilterChip
                key={cat}
                active={filter === cat}
                onClick={() => setFilter(cat)}
                label={`${CATEGORY_EMOJIS[cat]} ${CATEGORY_LABELS[cat]} (${count})`}
                color={`var(--hl-${cat})`}
              />
            );
          })}
          {all.some((n) => !n.category) && (
            <FilterChip
              active={filter === "uncategorised"}
              onClick={() => setFilter("uncategorised")}
              label={`Uncategorised (${all.filter((n) => !n.category).length})`}
            />
          )}
          <div className="ml-auto">
            <button
              onClick={() => setExportOpen(true)}
              className="text-xs px-3 py-1.5 rounded bg-[var(--color-ink)]
                         text-[var(--color-parchment)] hover:opacity-80
                         transition focus:outline-none focus:ring-2
                         focus:ring-[var(--color-gold)]/50"
            >
              Export Markdown
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && totalCount > 0 && (
        <p className="opacity-50 italic">No notes match this filter.</p>
      )}

      {totalCount === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--color-gold-dark)]/30 p-8 text-center">
          <p className="opacity-60 mb-4">
            Notes and highlights you save will appear here, grouped by book.
          </p>
          <Link
            to="/reader"
            className="inline-block px-4 py-2 rounded bg-[var(--color-gold)]
                       text-white hover:opacity-90 transition"
          >
            Open the Reader
          </Link>
        </div>
      )}

      {/* Book sections */}
      <div className="space-y-4">
        {Array.from(groupedByBook.entries()).map(([book, bookNotes]) => (
          <details
            key={book}
            open
            className="rounded border border-[var(--color-gold-dark)]/20
                       bg-white"
          >
            <summary
              className="cursor-pointer select-none px-4 py-2 font-display
                         text-[var(--color-ink)] font-bold hover:bg-[var(--color-gold)]/5
                         transition focus:outline-none focus:ring-2
                         focus:ring-[var(--color-gold)]/40 rounded"
            >
              {bookNotes[0]?.book_id
                ? localizeBookName(bookNotes[0].book_id, locale, book)
                : book}
              <span className="ml-2 text-xs opacity-50 font-normal font-body">
                {bookNotes.length} {bookNotes.length === 1 ? "note" : "notes"}
              </span>
            </summary>
            <div className="px-4 pb-4 space-y-3">
              {bookNotes.map((n) => (
                <NoteCard key={n.verse_id} note={n} onDelete={() => remove(n.verse_id)} />
              ))}
            </div>
          </details>
        ))}
      </div>

      {/* Export modal */}
      {exportOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 fade-in"
          onClick={() => setExportOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h2 className="font-display font-bold text-lg">Export Markdown</h2>
              <button
                onClick={() => setExportOpen(false)}
                aria-label="Close"
                className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <pre
              className="flex-1 overflow-auto text-xs font-mono leading-relaxed
                         p-4 bg-[var(--color-parchment)]/50 whitespace-pre-wrap"
            >
              {markdown}
            </pre>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
              <button
                onClick={copyMarkdown}
                className="text-xs px-3 py-1.5 rounded border hover:bg-gray-100 transition"
              >
                {copied ? "✅ Copied" : "📋 Copy"}
              </button>
              <button
                onClick={() => downloadMarkdown(markdown, "verbum-notes.md")}
                className="text-xs px-3 py-1.5 rounded bg-[var(--color-gold)]
                           text-white hover:opacity-90 transition"
              >
                Download .md
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition
                 focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/40 ${
                   active
                     ? "bg-[var(--color-ink)] text-[var(--color-parchment)] border-[var(--color-ink)]"
                     : "bg-white hover:bg-gray-50"
                 }`}
      style={active && color ? { backgroundColor: color, borderColor: color } : undefined}
    >
      {label}
    </button>
  );
}

function NoteCard({ note, onDelete }: { note: VerseNote; onDelete: () => void }) {
  const cat = note.category;
  return (
    <div
      className="rounded border border-[var(--color-gold-dark)]/15 bg-[var(--color-parchment)]/40 p-3"
      style={
        cat
          ? {
              borderLeft: `4px solid var(--hl-${cat})`,
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          <Link
            to={readerLinkFor(note)}
            className="font-display font-bold text-[var(--color-ink)] hover:text-[var(--color-gold)] transition"
          >
            {note.reference ?? note.verse_id}
          </Link>
          {cat && (
            <span
              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: `var(--hl-${cat})` }}
            >
              {CATEGORY_LABELS[cat]}
            </span>
          )}
          {note.translation && (
            <span className="text-[10px] uppercase tracking-wider opacity-50 font-mono">
              {note.translation}
            </span>
          )}
        </div>
        <button
          onClick={onDelete}
          className="text-[11px] opacity-40 hover:opacity-100 hover:text-red-700 transition focus:outline-none focus:underline"
          title="Delete note"
        >
          Delete
        </button>
      </div>

      {note.text && (
        <blockquote className="text-sm italic opacity-70 border-l-2 border-[var(--color-gold)]/30 pl-3 mb-2">
          {note.text}
        </blockquote>
      )}

      {note.note && note.note.trim() && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.note}</p>
      )}

      <div className="text-[11px] opacity-40 mt-2 flex items-center gap-3">
        <span>Added {formatDate(note.created_at)}</span>
        {note.updated_at > note.created_at && (
          <span>· Edited {formatDate(note.updated_at)}</span>
        )}
        <Link
          to={readerLinkFor(note)}
          className="ml-auto text-[var(--color-gold-dark)] hover:text-[var(--color-ink)] transition"
        >
          Open in reader →
        </Link>
      </div>
    </div>
  );
}
