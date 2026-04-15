import { useCallback, useMemo, useSyncExternalStore } from "react";
import { daysBetween, localDateKey } from "../utils/dateFormat";
import type { Book } from "../services/api";
import {
  getPlanById,
  type DayReading,
  type PlanDefinition,
  type PlanId,
} from "../components/plans/plansData";

const STORAGE_KEY = "verbum-plans";

export interface PlanProgress {
  plan_id: PlanId;
  /** ms timestamp of day 1 (midnight local). */
  started_at: number;
  /** chapter_ids like "GEN.1" that the user has completed, in any order. */
  completed: string[];
  /** When true, `currentDay()` stops advancing for this plan. */
  paused?: boolean;
  paused_at?: number;
}

type PlansMap = Partial<Record<PlanId, PlanProgress>>;

function readStorage(): PlansMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as PlansMap)
      : {};
  } catch {
    return {};
  }
}

function writeStorage(map: PlansMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // private browsing
  }
}

// ─── Module-level store ──────────────────────────────────────────────────────

let currentMap: PlansMap = readStorage();
const subscribers = new Set<() => void>();

function notifySubscribers(): void {
  subscribers.forEach((fn) => fn());
}

function setMap(updater: (prev: PlansMap) => PlansMap): void {
  const next = updater(currentMap);
  if (next === currentMap) return;
  currentMap = next;
  writeStorage(next);
  notifySubscribers();
}

function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

function getSnapshot(): PlansMap {
  return currentMap;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    currentMap = readStorage();
    notifySubscribers();
  });
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

/** Midnight of `ts` in the local timezone, as a ms timestamp. */
function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Which day of the plan are we on? Counts calendar days elapsed since
 * `started_at` (inclusive). Day 1 is the day the user pressed Start.
 */
function computeCurrentDay(progress: PlanProgress, total_days: number): number {
  const startKey = localDateKey(progress.started_at);
  const todayKey = localDateKey();
  const elapsed = Math.max(0, daysBetween(startKey, todayKey));
  return Math.min(total_days, elapsed + 1);
}

/**
 * Module-level "mark chapter complete" — used both by the hook API and by
 * `recordPlanAutoMark()` which BibleReader calls implicitly when a chapter
 * is opened.
 */
function markChapter(planId: PlanId, chapter_id: string): void {
  setMap((prev) => {
    const existing = prev[planId];
    if (!existing) return prev;
    if (existing.completed.includes(chapter_id)) return prev;
    return {
      ...prev,
      [planId]: { ...existing, completed: [...existing.completed, chapter_id] },
    };
  });
}

/**
 * Imperative hook for BibleReader: when a chapter is opened, mark it in the
 * currently active plan IF the plan contains that chapter. No hook needed.
 * Reads from module state directly.
 */
export function recordPlanAutoMark(chapter_id: string, books: Book[]): void {
  const active = Object.values(currentMap).find((p) => p && !p.paused);
  if (!active) return;
  const plan = getPlanById(active.plan_id);
  if (!plan) return;
  // Does the plan include this chapter at all?
  const schedule = plan.buildSchedule(books);
  const exists = schedule.some((d) =>
    d.chapters.some((c) => c.chapter_id === chapter_id)
  );
  if (!exists) return;
  markChapter(active.plan_id, chapter_id);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseReadingPlansResult {
  progress: PlansMap;
  active: PlanProgress | undefined;
  start(planId: PlanId): void;
  pause(planId: PlanId): void;
  resume(planId: PlanId): void;
  reset(planId: PlanId): void;
  remove(planId: PlanId): void;
  markChapter(planId: PlanId, chapter_id: string): void;
  unmarkChapter(planId: PlanId, chapter_id: string): void;
  isCompleted(planId: PlanId, chapter_id: string): boolean;
  currentDay(plan: PlanDefinition): number;
  todayReading(plan: PlanDefinition, books: Book[]): DayReading | null;
  /**
   * Count completed chapters that belong to the schedule (not every item in
   * `completed`, since stale plans might have extras if the plan changed —
   * currently impossible but future-proof).
   */
  scheduleProgress(
    plan: PlanDefinition,
    books: Book[]
  ): { done: number; total: number };
}

export function useReadingPlans(): UseReadingPlansResult {
  const progress = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const active = useMemo(() => {
    const entries = Object.values(progress).filter((p): p is PlanProgress =>
      Boolean(p)
    );
    return entries.find((p) => !p.paused);
  }, [progress]);

  const start = useCallback((planId: PlanId) => {
    setMap((prev) => {
      const next: PlansMap = { ...prev };
      // Pause any currently-active plan
      for (const id of Object.keys(next) as PlanId[]) {
        const p = next[id];
        if (p && !p.paused && id !== planId) {
          next[id] = { ...p, paused: true, paused_at: Date.now() };
        }
      }
      // Start or resume the target
      const target = next[planId];
      if (target) {
        next[planId] = { ...target, paused: false, paused_at: undefined };
      } else {
        next[planId] = {
          plan_id: planId,
          started_at: startOfDay(Date.now()),
          completed: [],
          paused: false,
        };
      }
      return next;
    });
  }, []);

  const pause = useCallback((planId: PlanId) => {
    setMap((prev) => {
      const p = prev[planId];
      if (!p || p.paused) return prev;
      return { ...prev, [planId]: { ...p, paused: true, paused_at: Date.now() } };
    });
  }, []);

  const resume = useCallback((planId: PlanId) => {
    // Resume = start (which also pauses siblings)
    start(planId);
  }, [start]);

  const reset = useCallback((planId: PlanId) => {
    setMap((prev) => {
      if (!(planId in prev)) return prev;
      const next = { ...prev };
      delete next[planId];
      return next;
    });
  }, []);

  const remove = useCallback((planId: PlanId) => {
    setMap((prev) => {
      if (!(planId in prev)) return prev;
      const next = { ...prev };
      delete next[planId];
      return next;
    });
  }, []);

  const markChapterCb = useCallback((planId: PlanId, chapter_id: string) => {
    markChapter(planId, chapter_id);
  }, []);

  const unmarkChapter = useCallback((planId: PlanId, chapter_id: string) => {
    setMap((prev) => {
      const p = prev[planId];
      if (!p) return prev;
      const idx = p.completed.indexOf(chapter_id);
      if (idx < 0) return prev;
      const next = [...p.completed];
      next.splice(idx, 1);
      return { ...prev, [planId]: { ...p, completed: next } };
    });
  }, []);

  const isCompleted = useCallback(
    (planId: PlanId, chapter_id: string) =>
      progress[planId]?.completed.includes(chapter_id) ?? false,
    [progress]
  );

  const currentDay = useCallback(
    (plan: PlanDefinition) => {
      const p = progress[plan.id];
      if (!p) return 0;
      return computeCurrentDay(p, plan.total_days);
    },
    [progress]
  );

  const todayReading = useCallback(
    (plan: PlanDefinition, books: Book[]) => {
      const p = progress[plan.id];
      if (!p || !books || books.length === 0) return null;
      const day = computeCurrentDay(p, plan.total_days);
      const schedule = plan.buildSchedule(books);
      return schedule[day - 1] ?? null;
    },
    [progress]
  );

  const scheduleProgress = useCallback(
    (plan: PlanDefinition, books: Book[]) => {
      const p = progress[plan.id];
      if (!p || !books || books.length === 0) return { done: 0, total: 0 };
      const schedule = plan.buildSchedule(books);
      const total = schedule.reduce((s, d) => s + d.chapters.length, 0);
      const planChapterIds = new Set(
        schedule.flatMap((d) => d.chapters.map((c) => c.chapter_id))
      );
      const done = p.completed.filter((id) => planChapterIds.has(id)).length;
      return { done, total };
    },
    [progress]
  );

  return {
    progress,
    active,
    start,
    pause,
    resume,
    reset,
    remove,
    markChapter: markChapterCb,
    unmarkChapter,
    isCompleted,
    currentDay,
    todayReading,
    scheduleProgress,
  };
}
