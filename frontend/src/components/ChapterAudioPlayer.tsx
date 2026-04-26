import { useRef, useState, useEffect, useCallback } from "react";
import { kjvChapterUrl } from "../data/kjvAudioMap";

interface Props {
  bookId: string;
  chapter: number;
}

function fmt(s: number): string {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function ChapterAudioPlayer({ bookId, chapter }: Props) {
  const url = kjvChapterUrl(bookId, chapter);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  // Reset on chapter/book change
  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setLoading(false);
    setUnavailable(false);
  }, [bookId, chapter]);

  const toggle = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      setLoading(true);
      try {
        await a.play();
        setPlaying(true);
      } catch {
        setUnavailable(true);
      } finally {
        setLoading(false);
      }
    }
  }, [playing]);

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const t = (Number(e.target.value) / 1000) * duration;
    a.currentTime = t;
    setCurrent(t);
  };

  const rewind = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, a.currentTime - 15);
  };

  const forward = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.min(duration, a.currentTime + 30);
  };

  if (!url || unavailable) return null;

  const progress = duration > 0 ? (current / duration) * 1000 : 0;

  return (
    <div className="flex items-center gap-2 py-2 px-3 mb-5 rounded-lg
                    bg-[var(--color-ink)]/5 border border-[var(--color-ink)]/10
                    text-[var(--color-ink)] select-none">

      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onTimeUpdate={(e) => setCurrent((e.target as HTMLAudioElement).currentTime)}
        onDurationChange={(e) => setDuration((e.target as HTMLAudioElement).duration)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
        onError={() => setUnavailable(true)}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
      />

      {/* Rewind 15s */}
      <button
        onClick={rewind}
        title="Back 15 s"
        className="opacity-50 hover:opacity-100 transition p-1 rounded"
        aria-label="Rewind 15 seconds"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          <text x="8.5" y="15.5" fontSize="5" fontFamily="sans-serif" fontWeight="bold">15</text>
        </svg>
      </button>

      {/* Play / Pause */}
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={playing ? "Pause" : "Play chapter audio"}
        className="w-8 h-8 flex items-center justify-center rounded-full
                   bg-[var(--color-ink)] text-[var(--color-parchment)]
                   hover:bg-[var(--color-gold)] hover:text-[var(--color-ink)]
                   disabled:opacity-40 transition shrink-0"
      >
        {loading ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M12 3a9 9 0 0 1 9 9" />
          </svg>
        ) : playing ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h4v14H6zM14 5h4v14h-4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      {/* Progress bar + time */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress)}
          onChange={seek}
          aria-label="Seek audio"
          className="w-full h-1 appearance-none rounded cursor-pointer
                     accent-[var(--color-gold)] bg-[var(--color-ink)]/20"
        />
        <div className="flex justify-between text-[10px] opacity-40 tabular-nums">
          <span>{fmt(current)}</span>
          <span>{duration > 0 ? fmt(duration) : "KJV · LibriVox"}</span>
        </div>
      </div>

      {/* Forward 30s */}
      <button
        onClick={forward}
        title="Forward 30 s"
        className="opacity-50 hover:opacity-100 transition p-1 rounded"
        aria-label="Forward 30 seconds"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
          <text x="8.5" y="15.5" fontSize="5" fontFamily="sans-serif" fontWeight="bold">30</text>
        </svg>
      </button>
    </div>
  );
}
