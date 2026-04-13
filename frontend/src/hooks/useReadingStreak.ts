import { useCallback, useEffect, useSyncExternalStore } from "react";
import { localDateKey, daysBetween } from "../utils/dateFormat";
import { useReadingHistory } from "./useReadingHistory";

const STORAGE_KEY = "verbum-streak";

export interface StreakState {
  /** Consecutive calendar days with at least one read, up to and including today. */
  current: number;
  /** All-time best. */
  longest: number;
  /** YYYY-MM-DD of the last day with a recorded read (local TZ). `null` if never. */
  last_read_date: string | null;
  /** Lifetime counter of distinct read events (same chapter re-read bumps it too). */
  total_chapters: number;
}

export type StreakStatus = "alive" | "at-risk" | "broken" | "empty";

const EMPTY: StreakState = {
  current: 0,
  longest: 0,
  last_read_date: null,
  total_chapters: 0,
};

function readStorage(): StreakState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY;
    return {
      current: Number(parsed.current) || 0,
      longest: Number(parsed.longest) || 0,
      last_read_date:
        typeof parsed.last_read_date === "string" ? parsed.last_read_date : null,
      total_chapters: Number(parsed.total_chapters) || 0,
    };
  } catch {
    return EMPTY;
  }
}

function writeStorage(state: StreakState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // private browsing
  }
}

// ─── Module-level store ──────────────────────────────────────────────────────

let currentState: StreakState = readStorage();
const subscribers = new Set<() => void>();

function notifySubscribers(): void {
  subscribers.forEach((fn) => fn());
}

function setState(next: StreakState): void {
  currentState = next;
  writeStorage(next);
  notifySubscribers();
}

function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

function getSnapshot(): StreakState {
  return currentState;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    currentState = readStorage();
    notifySubscribers();
  });
}

/**
 * Fold a new read event into an existing streak. Pure function so tests can
 * exercise the calendar math without mounting React.
 */
export function advanceStreak(
  prev: StreakState,
  readDateKey: string
): StreakState {
  // Already counted today — just bump total_chapters.
  if (prev.last_read_date === readDateKey) {
    return { ...prev, total_chapters: prev.total_chapters + 1 };
  }

  let nextCurrent: number;
  if (prev.last_read_date === null) {
    nextCurrent = 1;
  } else {
    const gap = daysBetween(prev.last_read_date, readDateKey);
    if (gap === 1) {
      // consecutive day
      nextCurrent = prev.current + 1;
    } else if (gap > 1) {
      // missed at least one day — restart
      nextCurrent = 1;
    } else {
      // readDateKey is earlier than last_read_date (clock skew / TZ weirdness).
      // Keep current streak, just bump total.
      return { ...prev, total_chapters: prev.total_chapters + 1 };
    }
  }

  return {
    current: nextCurrent,
    longest: Math.max(prev.longest, nextCurrent),
    last_read_date: readDateKey,
    total_chapters: prev.total_chapters + 1,
  };
}

/**
 * Classify the streak's health for the UI.
 *   - empty    : never read
 *   - alive    : last read was today
 *   - at-risk  : last read was yesterday
 *   - broken   : last read was >= 2 calendar days ago
 */
export function streakStatus(
  state: StreakState,
  today = localDateKey()
): StreakStatus {
  if (state.last_read_date === null) return "empty";
  const gap = daysBetween(state.last_read_date, today);
  if (gap <= 0) return "alive";
  if (gap === 1) return "at-risk";
  return "broken";
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useReadingStreak() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { history } = useReadingHistory();

  // Observe the most recent history entry. When it changes (i.e. a new read
  // was recorded), fold it into the streak. We dedupe via last_read_date so
  // re-mounting won't double-count.
  useEffect(() => {
    if (history.length === 0) return;
    const last = history[0];
    const readDateKey = localDateKey(last.visited_at);

    // If this is the exact same entry we already processed (same day, no
    // new reads), skip. We detect "no new read" by comparing the stored
    // counter vs a freshly computed one — but that's circular. Simplest:
    // only advance if the day changed OR the total is currently less than
    // the history length (which would mean we haven't processed all).
    if (
      currentState.last_read_date === readDateKey &&
      currentState.total_chapters >= history.length
    ) {
      return;
    }
    const next = advanceStreak(currentState, readDateKey);
    setState(next);
  }, [history]);

  const status = streakStatus(state);

  const reset = useCallback(() => {
    setState(EMPTY);
  }, []);

  return {
    state,
    status,
    reset,
  };
}
