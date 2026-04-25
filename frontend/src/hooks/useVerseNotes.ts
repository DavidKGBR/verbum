import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "verbum-notes";

export type HighlightCategory =
  | "promise"
  | "warning"
  | "fulfillment"
  | "question"
  | "prayer";

export const HIGHLIGHT_CATEGORIES: readonly HighlightCategory[] = [
  "promise",
  "warning",
  "fulfillment",
  "question",
  "prayer",
] as const;

export const CATEGORY_LABELS: Record<HighlightCategory, string> = {
  promise: "Promise",
  warning: "Warning",
  fulfillment: "Fulfillment",
  question: "Question",
  prayer: "Prayer",
};

export const CATEGORY_EMOJIS: Record<HighlightCategory, string> = {
  promise: "🔵",
  warning: "🔴",
  fulfillment: "🟢",
  question: "🟡",
  prayer: "🟣",
};

export interface VerseNote {
  verse_id: string;
  reference?: string;
  book_id?: string;
  book_name?: string;
  chapter?: number;
  verse?: number;
  translation?: string;
  text?: string;
  category?: HighlightCategory;
  note?: string;
  created_at: number;
  updated_at: number;
}

type NotesMap = Record<string, VerseNote>;

function readStorage(): NotesMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as NotesMap)
      : {};
  } catch {
    return {};
  }
}

function writeStorage(notes: NotesMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // localStorage unavailable (private browsing) — silently ignore
  }
}

/**
 * Compare by (book_id, chapter, verse) for stable sorted output.
 */
function compareNotes(a: VerseNote, b: VerseNote): number {
  if (a.book_id && b.book_id && a.book_id !== b.book_id) {
    return a.book_id.localeCompare(b.book_id);
  }
  if ((a.chapter ?? 0) !== (b.chapter ?? 0)) {
    return (a.chapter ?? 0) - (b.chapter ?? 0);
  }
  return (a.verse ?? 0) - (b.verse ?? 0);
}

// ─── Module-level store (shared across all hook instances in the same tab) ──
//
// `useState` inside the hook gives each component instance its own copy, so
// saving a note in <NoteEditor> wouldn't propagate to <BibleReader>. We use
// `useSyncExternalStore` with a tiny pub/sub to share one source of truth.
// Cross-tab sync still works via the `storage` event below.

let currentNotes: NotesMap = readStorage();
const subscribers = new Set<() => void>();

function notifySubscribers(): void {
  subscribers.forEach((fn) => fn());
}

function setNotes(updater: (prev: NotesMap) => NotesMap): void {
  const next = updater(currentNotes);
  if (next === currentNotes) return;
  currentNotes = next;
  writeStorage(next);
  notifySubscribers();
}

function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function getSnapshot(): NotesMap {
  return currentNotes;
}

// One global `storage` listener re-reads storage on cross-tab writes and
// notifies every subscribed component.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    currentNotes = readStorage();
    notifySubscribers();
  });
}

export function useVerseNotes() {
  const notes = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const get = useCallback(
    (verseId: string): VerseNote | undefined => notes[verseId],
    [notes]
  );

  /**
   * Merge-update a note. `patch` can include any VerseNote field; verse_id
   * comes from the first arg. `created_at` is preserved on edit, `updated_at`
   * always bumped. If `category` is unset and `note` is empty, the entry is
   * removed (so we don't leave empty notes around).
   */
  const upsert = useCallback(
    (verseId: string, patch: Partial<VerseNote>): void => {
      setNotes((prev) => {
        const existing = prev[verseId];
        const now = Date.now();
        const merged: VerseNote = {
          ...(existing ?? { verse_id: verseId, created_at: now, updated_at: now }),
          ...patch,
          verse_id: verseId,
          updated_at: now,
        };
        const noteText = merged.note?.trim() ?? "";
        if (!merged.category && !noteText) {
          if (!(verseId in prev)) return prev;
          const { [verseId]: _removed, ...rest } = prev;
          void _removed;
          return rest;
        }
        return { ...prev, [verseId]: merged };
      });
    },
    []
  );

  const remove = useCallback((verseId: string): void => {
    setNotes((prev) => {
      if (!(verseId in prev)) return prev;
      const { [verseId]: _removed, ...rest } = prev;
      void _removed;
      return rest;
    });
  }, []);

  const list = useCallback(
    (): VerseNote[] => Object.values(notes).sort(compareNotes),
    [notes]
  );

  const byBook = useMemo((): Record<string, VerseNote[]> => {
    const grouped: Record<string, VerseNote[]> = {};
    for (const n of Object.values(notes)) {
      const key = n.book_id ?? "?";
      (grouped[key] ??= []).push(n);
    }
    for (const arr of Object.values(grouped)) arr.sort(compareNotes);
    return grouped;
  }, [notes]);

  const byCategory = useMemo((): Record<
    HighlightCategory | "uncategorised",
    VerseNote[]
  > => {
    const grouped: Record<HighlightCategory | "uncategorised", VerseNote[]> = {
      promise: [],
      warning: [],
      fulfillment: [],
      question: [],
      prayer: [],
      uncategorised: [],
    };
    for (const n of Object.values(notes)) {
      const key: HighlightCategory | "uncategorised" = n.category ?? "uncategorised";
      grouped[key].push(n);
    }
    for (const arr of Object.values(grouped)) arr.sort(compareNotes);
    return grouped;
  }, [notes]);

  const count = Object.keys(notes).length;

  return { notes, get, upsert, remove, list, byBook, byCategory, count };
}
