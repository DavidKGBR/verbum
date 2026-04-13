import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "bible-reading-history";
const MAX_ENTRIES = 20;

export interface ReadingEntry {
  book_id: string;
  book_name?: string;
  chapter: number;
  translation: string;
  visited_at: number;
}

function readStorage(): ReadingEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(entries: ReadingEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore (private browsing)
  }
}

// ─── Module-level store (shared across instances + reactive within the same tab)
// Mirrors the pattern introduced in useVerseNotes so `useReadingStreak` and
// `useReadingPlans` can subscribe to history changes without needing prop
// drilling or global refactors.

let currentHistory: ReadingEntry[] = readStorage();
const subscribers = new Set<() => void>();

function notifySubscribers(): void {
  subscribers.forEach((fn) => fn());
}

function setHistory(next: ReadingEntry[]): void {
  if (next === currentHistory) return;
  currentHistory = next;
  writeStorage(next);
  notifySubscribers();
}

function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

function getSnapshot(): ReadingEntry[] {
  return currentHistory;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    currentHistory = readStorage();
    notifySubscribers();
  });
}

export function useReadingHistory() {
  const history = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const record = useCallback((entry: Omit<ReadingEntry, "visited_at">) => {
    // Dedupe on book+chapter+translation, then prepend with current timestamp.
    const filtered = currentHistory.filter(
      (e) =>
        !(
          e.book_id === entry.book_id &&
          e.chapter === entry.chapter &&
          e.translation === entry.translation
        )
    );
    const next = [{ ...entry, visited_at: Date.now() }, ...filtered].slice(
      0,
      MAX_ENTRIES
    );
    setHistory(next);
  }, []);

  const getLastRead = useCallback(
    (): ReadingEntry | null => history[0] || null,
    [history]
  );

  const clear = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, record, getLastRead, clear };
}
