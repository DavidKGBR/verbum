import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bible-bookmarks";

export interface Bookmark {
  verse_id: string;
  reference?: string;
  text?: string;
  translation?: string;
  added_at: number;
}

function readStorage(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(bookmarks: Bookmark[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // localStorage unavailable (private browsing) — silently ignore
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => readStorage());

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setBookmarks(readStorage());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const isBookmarked = useCallback(
    (verseId: string) => bookmarks.some((b) => b.verse_id === verseId),
    [bookmarks]
  );

  const toggle = useCallback(
    (entry: Omit<Bookmark, "added_at">) => {
      setBookmarks((prev) => {
        const exists = prev.some((b) => b.verse_id === entry.verse_id);
        const next = exists
          ? prev.filter((b) => b.verse_id !== entry.verse_id)
          : [{ ...entry, added_at: Date.now() }, ...prev];
        writeStorage(next);
        return next;
      });
    },
    []
  );

  const remove = useCallback((verseId: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.verse_id !== verseId);
      writeStorage(next);
      return next;
    });
  }, []);

  return { bookmarks, isBookmarked, toggle, remove };
}
