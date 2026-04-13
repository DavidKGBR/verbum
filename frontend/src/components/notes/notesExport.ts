import type { VerseNote } from "../../hooks/useVerseNotes";
import { CATEGORY_EMOJIS, CATEGORY_LABELS } from "../../hooks/useVerseNotes";

export interface ExportOptions {
  title?: string;
  includeVerseText?: boolean;
  /** Format timestamps with this locale. Defaults to the browser locale. */
  locale?: string;
}

function formatDate(ts: number, locale?: string): string {
  try {
    return new Date(ts).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

/**
 * Serialize notes as Markdown, grouped by book. Output is stable (sorted by
 * book → chapter → verse) so diffs between exports are minimal.
 */
export function notesToMarkdown(
  notes: VerseNote[],
  opts: ExportOptions = {}
): string {
  const {
    title = "Verbum Notes",
    includeVerseText = true,
    locale,
  } = opts;

  if (notes.length === 0) {
    return `# ${title}\n\n_No notes yet._\n`;
  }

  const exportedAt = formatDate(Date.now(), locale);
  const parts: string[] = [`# ${title} — exported ${exportedAt}`, ""];

  // Group by book_name (falls back to book_id, then "Other")
  const groups = new Map<string, VerseNote[]>();
  for (const n of notes) {
    const key = n.book_name ?? n.book_id ?? "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }

  for (const [bookName, bookNotes] of groups) {
    parts.push(`## ${bookName}`, "");
    // Notes come in pre-sorted from list()/byBook(), but re-sort defensively
    const sorted = [...bookNotes].sort((a, b) => {
      if ((a.chapter ?? 0) !== (b.chapter ?? 0)) {
        return (a.chapter ?? 0) - (b.chapter ?? 0);
      }
      return (a.verse ?? 0) - (b.verse ?? 0);
    });

    for (const n of sorted) {
      const ref = n.reference ?? n.verse_id;
      const catSuffix = n.category
        ? ` · ${CATEGORY_EMOJIS[n.category]} ${CATEGORY_LABELS[n.category]}`
        : "";
      parts.push(`### ${ref}${catSuffix}`);

      if (includeVerseText && n.text) {
        // Split verse text on existing newlines and prefix each with `> `
        for (const line of n.text.split(/\r?\n/)) {
          parts.push(`> ${line}`);
        }
        parts.push("");
      }

      if (n.note && n.note.trim()) {
        parts.push(n.note.trim(), "");
      }

      const meta: string[] = [];
      if (n.translation) meta.push(n.translation.toUpperCase());
      meta.push(`added ${formatDate(n.created_at, locale)}`);
      if (n.updated_at > n.created_at) {
        meta.push(`edited ${formatDate(n.updated_at, locale)}`);
      }
      parts.push(`_${meta.join(" · ")}_`, "", "---", "");
    }
  }

  // Trim trailing separator noise
  while (parts.length > 0 && (parts[parts.length - 1] === "" || parts[parts.length - 1] === "---")) {
    parts.pop();
  }
  parts.push(""); // final newline

  return parts.join("\n");
}

/**
 * Trigger a .md file download in the browser.
 */
export function downloadMarkdown(content: string, filename = "verbum-notes.md"): void {
  try {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after a tick so the download starts cleanly
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch {
    // noop — caller should have a copy-to-clipboard fallback
  }
}
