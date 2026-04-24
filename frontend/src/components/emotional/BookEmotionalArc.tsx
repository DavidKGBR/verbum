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

      {/* SVG curve */}
      <div className="relative">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-40 block"
          role="img"
          aria-label={t("arc.title")}
        >
          {/* Zero baseline */}
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke="currentColor"
            strokeWidth="0.2"
            className="opacity-20"
            strokeDasharray="1,1"
          />
          {/* Curve drop-shadow */}
          <path
            d={path}
            fill="none"
            stroke="var(--color-gold)"
            strokeOpacity="0.25"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(0,0.6)"
          />
          <path
            d={path}
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* Turn point markers */}
          {k.turn_points.map((tp) => {
            const pt = arc.series.find((s) => s.chapter === tp.chapter);
            if (!pt) return null;
            return (
              <circle
                key={`tp-${tp.chapter}`}
                cx={xForChapter(tp.chapter)}
                cy={yForPolarity(pt.avg_polarity)}
                r="1.2"
                fill="var(--color-gold)"
                stroke="white"
                strokeWidth="0.3"
              >
                <title>
                  {t("arc.turnPoint")} — {t("emotional.chapter").replace("{n}", String(tp.chapter))} (Δ
                  {tp.delta > 0 ? "+" : ""}
                  {tp.delta.toFixed(2)})
                </title>
              </circle>
            );
          })}
          {/* Peak marker */}
          {peak && (
            <g>
              <circle
                cx={xForChapter(peak.chapter)}
                cy={yForPolarity(peak.polarity)}
                r="1.8"
                fill="rgb(34,197,94)"
                stroke="white"
                strokeWidth="0.4"
              >
                <title>
                  {t("arc.peak")} — {peak.reference} ({peak.polarity > 0 ? "+" : ""}
                  {peak.polarity.toFixed(2)})
                </title>
              </circle>
            </g>
          )}
          {/* Valley marker */}
          {valley && (
            <g>
              <circle
                cx={xForChapter(valley.chapter)}
                cy={yForPolarity(valley.polarity)}
                r="1.8"
                fill="rgb(239,68,68)"
                stroke="white"
                strokeWidth="0.4"
              >
                <title>
                  {t("arc.valley")} — {valley.reference} ({valley.polarity.toFixed(2)})
                </title>
              </circle>
            </g>
          )}
        </svg>
        <div className="flex justify-between text-[10px] opacity-40 mt-1">
          <span>{t("emotional.chapter").replace("{n}", "1")}</span>
          <span>{t("arc.chapters").replace("{n}", String(arc.chapter_count))}</span>
        </div>
      </div>
    </div>
  );
}
