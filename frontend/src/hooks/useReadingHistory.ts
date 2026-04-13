import { useCallback, useEffect, useState } from "react";

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
    // ignore
  }
}

export function useReadingHistory() {
  const [history, setHistory] = useState<ReadingEntry[]>(() => readStorage());

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setHistory(readStorage());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const record = useCallback(
    (entry: Omit<ReadingEntry, "visited_at">) => {
      setHistory((prev) => {
        // Dedupe: remove existing entry for same book+chapter+translation, then prepend
        const filtered = prev.filter(
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
        writeStorage(next);
        return next;
      });
    },
    []
  );

  const getLastRead = useCallback((): ReadingEntry | null => {
    return history[0] || null;
  }, [history]);

  const clear = useCallback(() => {
    setHistory([]);
    writeStorage([]);
  }, []);

  return { history, record, getLastRead, clear };
}
