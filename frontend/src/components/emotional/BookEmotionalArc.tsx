import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBookArc, type BookArc } from "../../services/api";
import { useI18n } from "../../i18n/i18nContext";
import { localizeBookName } from "../../i18n/bookNames";

interface Props {
  bookId: string;
  translation: string;
}

const DIRECTION_ICONS: Record<BookArc["kpis"]["arc_direction"], string> = {
  ascending: "↗",
  descending: "↘",
  stable: "→",
  u_shape: "∪",
  inverted_u: "∩",
};

export default function BookEmotionalArc({ bookId, translation }: Props) {
  const { t, locale } = useI18n();
  const [arc, setArc] = useState<BookArc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchBookArc(bookId, translation)
      .then((d) => {
        if (alive) setArc(d);
      })
      .catch(() => {
        if (alive) setArc(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [bookId, translation]);

  const path = useMemo(() => {
    if (!arc || arc.series.length === 0) return "";
    const pts = arc.series.map((s, i) => {
      const x = arc.series.length === 1 ? 50 : (i / (arc.series.length - 1)) * 100;
      const y = 50 - s.avg_polarity * 45; // polarity [-1, 1] → y [95, 5]
      return { x, y };
    });
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    // Cubic bezier smoothing
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }, [arc]);

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-4 mb-6 opacity-60 text-xs">
        {t("common.loading")}
      </div>
    );
  }
  if (!arc) return null;

  const k = arc.kpis;
  const volLabel =
    k.volatility < 0.2
      ? t("arc.volatility.low")
      : k.volatility < 0.4
        ? t("arc.volatility.medium")
        : t("arc.volatility.high");
  const dominance =
    k.positive_pct >= k.negative_pct && k.positive_pct >= k.neutral_pct
      ? { label: t("emotional.label.positive"), pct: k.positive_pct, color: "rgb(34,197,94)" }
      : k.negative_pct >= k.neutral_pct
        ? { label: t("emotional.label.negative"), pct: k.negative_pct, color: "rgb(239,68,68)" }
        : { label: t("emotional.label.neutral"), pct: k.neutral_pct, color: "rgb(156,163,175)" };

  const bookTitle = localizeBookName(arc.book_id, locale, arc.book_id);
  const directionLabel = t(`arc.direction.${k.arc_direction}`);

  // Coordinate helpers for marker placement on SVG
  const xForChapter = (ch: number) => {
    if (arc.chapter_count <= 1) return 50;
    return ((ch - 1) / (arc.chapter_count - 1)) * 100;
  };
  const yForPolarity = (p: number) => 50 - p * 45;

  const peak = k.peak;
  const valley = k.valley;

  // Limit turn points to the 8 with largest |delta| to avoid visual clutter.
  const topTurnPoints = [...k.turn_points]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 8);

  return (
    <div className="rounded-lg border bg-white p-4 mb-8">
      <h3 className="text-sm font-display font-bold mb-3">
        {t("arc.title")} — {bookTitle}
      </h3>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        <div className="rounded-md border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider opacity-50">{t("arc.direction")}</div>
          <div className="text-sm font-bold flex items-center gap-1">
            <span className="text-lg">{DIRECTION_ICONS[k.arc_direction]}</span>
            <span className="capitalize">{directionLabel}</span>
          </div>
          <div className="text-[10px] opacity-50 tabular-nums">
            Δ {k.arc_delta > 0 ? "+" : ""}
            {k.arc_delta.toFixed(2)}
          </div>
        </div>
        {peak && (
          <Link
            to={`/reader?book=${arc.book_id}&chapter=${peak.chapter}&verse=${peak.verse}&translation=${translation}`}
            className="rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 hover:bg-green-500/10 transition"
            title={peak.text}
          >
            <div className="text-[10px] uppercase tracking-wider opacity-50">{t("arc.peak")}</div>
            <div className="text-sm font-bold truncate">
              {localizeBookName(arc.book_id, locale, arc.book_id)} {peak.chapter}:{peak.verse}
            </div>
            <div className="text-[11px] font-mono text-green-700 tabular-nums">
              +{peak.polarity.toFixed(2)}
            </div>
          </Link>
        )}
        {valley && (
          <Link
            to={`/reader?book=${arc.book_id}&chapter=${valley.chapter}&verse=${valley.verse}&translation=${translation}`}
            className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 hover:bg-red-500/10 transition"
            title={valley.text}
          >
            <div className="text-[10px] uppercase tracking-wider opacity-50">{t("arc.valley")}</div>
            <div className="text-sm font-bold truncate">
              {localizeBookName(arc.book_id, locale, arc.book_id)} {valley.chapter}:{valley.verse}
            </div>
            <div className="text-[11px] font-mono text-red-700 tabular-nums">
              {valley.polarity.toFixed(2)}
            </div>
          </Link>
        )}
        <div className="rounded-md border bg-black/2 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider opacity-50">{t("arc.volatility")}</div>
          <div className="text-sm font-bold tabular-nums">{k.volatility.toFixed(2)}</div>
          <div className="text-[10px] opacity-50">{volLabel}</div>
        </div>
        <div className="rounded-md border bg-black/2 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider opacity-50">{t("arc.dominance")}</div>
          <div className="text-sm font-bold" style={{ color: dominance.color }}>
            {dominance.label}
          </div>
          <div className="text-[10px] opacity-50 tabular-nums">{dominance.pct.toFixed(1)}%</div>
        </div>
      </div>

      {/* SVG curve with gradient (green top → gold mid → red bottom) */}
      <div className="flex gap-2">
        {/* Vertical color legend */}
        <div className="flex flex-col items-end justify-between h-40 shrink-0 text-[9px] opacity-60 tabular-nums">
          <span className="text-green-600 font-bold">+1</span>
          <span className="opacity-50">0</span>
          <span className="text-red-600 font-bold">−1</span>
        </div>
        <div
          className="w-1.5 h-40 shrink-0 rounded-full"
          style={{
            background:
              "linear-gradient(to bottom, rgb(34,197,94), rgb(34,197,94) 40%, var(--color-gold) 50%, rgb(239,68,68) 60%, rgb(239,68,68))",
            opacity: 0.7,
          }}
          aria-hidden="true"
        />
      <div className="flex-1 min-w-0">
        <div className="relative h-40">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-40 block"
          role="img"
          aria-label={t("arc.title")}
        >
          <defs>
            <linearGradient id="arcGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(34,197,94)" />
              <stop offset="45%" stopColor="rgb(34,197,94)" stopOpacity="0.7" />
              <stop offset="50%" stopColor="var(--color-gold)" stopOpacity="0.5" />
              <stop offset="55%" stopColor="rgb(239,68,68)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="rgb(239,68,68)" />
            </linearGradient>
            <linearGradient id="arcShadow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(34,197,94)" stopOpacity="0.18" />
              <stop offset="50%" stopColor="var(--color-gold)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="rgb(239,68,68)" stopOpacity="0.18" />
            </linearGradient>
          </defs>
          {/* Positive zone (subtle green wash above zero line) */}
          <rect x="0" y="0" width="100" height="50" fill="rgb(34,197,94)" opacity="0.04" />
          {/* Negative zone (subtle red wash below zero line) */}
          <rect x="0" y="50" width="100" height="50" fill="rgb(239,68,68)" opacity="0.04" />
          {/* Zero baseline */}
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke="currentColor"
            strokeWidth="0.2"
            className="opacity-30"
            strokeDasharray="1,1"
          />
          {/* Curve drop-shadow */}
          <path
            d={path}
            fill="none"
            stroke="url(#arcShadow)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(0,0.6)"
            vectorEffect="non-scaling-stroke"
          />
          {/* Main curve with green→gold→red gradient */}
          <path
            d={path}
            fill="none"
            stroke="url(#arcGradient)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Markers in HTML absolute layer (immune to SVG aspect-ratio stretch) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Turn points (top 8 by |delta|) */}
          {topTurnPoints.map((tp) => {
            const pt = arc.series.find((s) => s.chapter === tp.chapter);
            if (!pt) return null;
            const left = xForChapter(tp.chapter);
            const top = yForPolarity(pt.avg_polarity);
            return (
              <span
                key={`tp-${tp.chapter}`}
                className="absolute w-2 h-2 rounded-full bg-[var(--color-gold)] ring-1 ring-white shadow-sm pointer-events-auto -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${left}%`, top: `${top}%` }}
                title={`${t("arc.turnPoint")} — ${t("emotional.chapter").replace("{n}", String(tp.chapter))} (Δ${tp.delta > 0 ? "+" : ""}${tp.delta.toFixed(2)})`}
              />
            );
          })}
          {/* Peak (green) */}
          {peak && (
            <span
              className="absolute w-3 h-3 rounded-full bg-green-500 ring-2 ring-white shadow pointer-events-auto -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: `${xForChapter(peak.chapter)}%`,
                top: `${yForPolarity(peak.polarity)}%`,
              }}
              title={`${t("arc.peak")} — ${localizeBookName(arc.book_id, locale, arc.book_id)} ${peak.chapter}:${peak.verse} (${peak.polarity > 0 ? "+" : ""}${peak.polarity.toFixed(2)})`}
            />
          )}
          {/* Valley (red) */}
          {valley && (
            <span
              className="absolute w-3 h-3 rounded-full bg-red-500 ring-2 ring-white shadow pointer-events-auto -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: `${xForChapter(valley.chapter)}%`,
                top: `${yForPolarity(valley.polarity)}%`,
              }}
              title={`${t("arc.valley")} — ${localizeBookName(arc.book_id, locale, arc.book_id)} ${valley.chapter}:${valley.verse} (${valley.polarity.toFixed(2)})`}
            />
          )}
        </div>

        </div>
        <div className="flex justify-between text-[10px] opacity-40 mt-1">
          <span>{t("emotional.chapter").replace("{n}", "1")}</span>
          <span>{t("arc.chapters").replace("{n}", String(arc.chapter_count))}</span>
        </div>
      </div>
      </div>
    </div>
  );
}
