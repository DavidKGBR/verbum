import { useRef, useState, useMemo, useEffect, useLayoutEffect, useCallback } from "react";
import type { Book, Arc } from "../../services/api";
import {
  computeBookPositions,
  categoryColor,
  distanceColorScale,
  testamentArcColor,
  opacityScale,
  type BookPosition,
} from "./arcUtils";

interface Props {
  books: Book[];
  arcs: Arc[];
  colorBy: "distance" | "testament" | "category";
  width?: number;
  height?: number;
  onArcClick?: (sourceBook: string, targetBook: string, count: number) => void;
}

const BOOK_BAR_HEIGHT = 20;
const LABEL_HEIGHT = 34;
const BASELINE_Y_OFFSET = 8;
const ARC_TOP_PADDING = 8; // keep arc peaks off the absolute top edge
const HIT_TOLERANCE = 4; // px from arc ring
const MIN_WIDTH = 720;   // below this, container scrolls horizontally

export default function ArcDiagram({
  books,
  arcs,
  colorBy,
  width: widthProp,
  height = 500,
  onArcClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // `null` until we have the real container size. Gating the canvas draw on
  // this avoids the "perfect arc → reshape" flash that happens if we paint
  // once with default dims and again after the observer fires.
  const [measured, setMeasured] = useState<{ w: number; h: number } | null>(
    widthProp ? { w: widthProp, h: height } : null
  );
  const [hoveredBook, setHoveredBook] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  // Observe container size — fill available space. Use `useLayoutEffect` so
  // the re-render triggered by the first measurement is flushed into the same
  // paint; the user never sees the default-dimensions frame.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = widthProp ?? Math.max(MIN_WIDTH, el.clientWidth);
      const h = el.clientHeight;
      if (h <= 100) return; // transient zero-height layout; wait for a real one
      setMeasured((prev) =>
        prev && prev.w === w && prev.h === h ? prev : { w, h }
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthProp]);

  const width = measured?.w ?? (widthProp ?? MIN_WIDTH);
  const effectiveHeight = measured?.h ?? height;
  const baseline = effectiveHeight - BOOK_BAR_HEIGHT - LABEL_HEIGHT - BASELINE_Y_OFFSET;

  const positions = useMemo(
    () => computeBookPositions(books, width),
    [books, width]
  );

  const posMap = useMemo(() => {
    const m = new Map<string, BookPosition>();
    positions.forEach((p) => m.set(p.book.book_id, p));
    return m;
  }, [positions]);

  const maxWeight = useMemo(
    () => Math.max(1, ...arcs.map((a) => a.connection_count)),
    [arcs]
  );

  const maxDistance = useMemo(
    () =>
      Math.max(
        1,
        ...arcs.map((a) =>
          Math.abs(a.target_book_position - a.source_book_position)
        )
      ),
    [arcs]
  );

  const distColor = useMemo(() => distanceColorScale(maxDistance), [maxDistance]);

  // Color selector
  const getArcColor = useCallback(
    (arc: Arc): string => {
      if (colorBy === "testament") return testamentArcColor(arc, posMap);
      if (colorBy === "category") {
        const source = posMap.get(arc.source_book_id);
        return source ? categoryColor(source.book.category) : "#999";
      }
      const dist = Math.abs(
        arc.target_book_position - arc.source_book_position
      );
      return distColor(dist);
    },
    [colorBy, posMap, distColor]
  );

  // Precompute arc geometry once per render
  interface ArcGeom {
    arc: Arc;
    cx: number;
    rx: number;
    ry: number; // may be less than rx when the arc would exceed vertical space
    color: string;
    baseOpacity: number;
    lineWidth: number;
  }

  const maxArcHeight = effectiveHeight - BOOK_BAR_HEIGHT - LABEL_HEIGHT - BASELINE_Y_OFFSET - ARC_TOP_PADDING;

  const geoms = useMemo<ArcGeom[]>(() => {
    const out: ArcGeom[] = [];
    for (const arc of arcs) {
      const s = posMap.get(arc.source_book_id);
      const t = posMap.get(arc.target_book_id);
      if (!s || !t) continue;
      const x1 = s.x + s.width / 2;
      const x2 = t.x + t.width / 2;
      const rx = Math.abs(x2 - x1) / 2;
      out.push({
        arc,
        cx: (x1 + x2) / 2,
        rx,
        ry: Math.min(rx, maxArcHeight),
        color: getArcColor(arc),
        baseOpacity: opacityScale(arc.connection_count, maxWeight),
        lineWidth: Math.max(0.5, Math.min(3, arc.connection_count / 20)),
      });
    }
    // Sort by connection_count asc so heavy arcs paint last (on top)
    out.sort((a, b) => a.arc.connection_count - b.arc.connection_count);
    return out;
  }, [arcs, posMap, getArcColor, maxWeight, maxArcHeight]);

  // Canvas drawing — internal coordinate system uses `width`;
  // the canvas element stretches to fit its container via CSS (w-full/h-full).
  useEffect(() => {
    // Hold off until the container has been measured — otherwise we paint a
    // stretched 500×720 frame that gets replaced once the observer fires.
    if (!measured) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // Backing store sized to (width * dpr) so coords stay crisp;
    // CSS stretches canvas to parent width regardless.
    canvas.width = width * dpr;
    canvas.height = effectiveHeight * dpr;

    const raf = requestAnimationFrame(() => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, effectiveHeight);

      for (const g of geoms) {
        const connected =
          !hoveredBook ||
          g.arc.source_book_id === hoveredBook ||
          g.arc.target_book_id === hoveredBook;
        ctx.beginPath();
        ctx.strokeStyle = g.color;
        ctx.globalAlpha = connected ? g.baseOpacity : 0.03;
        ctx.lineWidth = g.lineWidth;
        // Elliptical upper-half arc: flattens to fit vertical space while preserving width
        ctx.ellipse(g.cx, baseline, g.rx, g.ry, 0, Math.PI, 0);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });

    return () => cancelAnimationFrame(raf);
  }, [measured, geoms, hoveredBook, baseline, width, effectiveHeight]);

  // Hit-testing: return topmost arc at (x, y) in canvas coords.
  // An ellipse centered at (cx, baseline) with radii (rx, ry) satisfies
  // ((x-cx)/rx)² + ((y-baseline)/ry)² = 1.
  // Approximate "near the ellipse" by converting the normalised distance back
  // to pixel units via the local gradient scale.
  const hitTest = useCallback(
    (x: number, y: number): ArcGeom | null => {
      const dy = y - baseline;
      if (dy > HIT_TOLERANCE) return null; // below baseline
      for (let i = geoms.length - 1; i >= 0; i--) {
        const g = geoms[i];
        const nx = (x - g.cx) / g.rx;
        const ny = dy / g.ry;
        const normDist = Math.sqrt(nx * nx + ny * ny);
        // Scale normalised residual back to pixels using the smaller radius
        // (so tolerance stays tight even for flattened arcs).
        const pixelResidual = Math.abs(normDist - 1) * Math.min(g.rx, g.ry);
        if (pixelResidual < HIT_TOLERANCE && dy <= HIT_TOLERANCE) {
          return g;
        }
      }
      return null;
    },
    [geoms, baseline]
  );

  function toInternalCoords(
    e: React.MouseEvent<HTMLCanvasElement>
  ): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = rect.width > 0 ? width / rect.width : 1;
    const scaleY = rect.height > 0 ? effectiveHeight / rect.height : 1;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handleCanvasMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = toInternalCoords(e);
    const hit = hitTest(x, y);
    if (hit) {
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        text: `${hit.arc.source_book_id} → ${hit.arc.target_book_id}: ${hit.arc.connection_count} refs (click for details)`,
      });
      e.currentTarget.style.cursor = "pointer";
    } else {
      setTooltip(null);
      e.currentTarget.style.cursor = "default";
    }
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = toInternalCoords(e);
    const hit = hitTest(x, y);
    if (hit && onArcClick) {
      onArcClick(
        hit.arc.source_book_id,
        hit.arc.target_book_id,
        hit.arc.connection_count
      );
    }
  }

  // OT/NT divider position
  const otNtDivider = useMemo(() => {
    const lastOT = positions.find((p) => p.book.book_position === 39);
    const firstNT = positions.find((p) => p.book.book_position === 40);
    if (lastOT && firstNT) return (lastOT.x + lastOT.width + firstNT.x) / 2;
    return null;
  }, [positions]);

  return (
    <div
      ref={containerRef}
      className="relative bg-[var(--color-parchment)] w-full h-full"
      style={{ minWidth: MIN_WIDTH }}
    >
      {/* Canvas layer: arcs only — stretches to container via CSS */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleCanvasMove}
        onMouseLeave={() => setTooltip(null)}
        onClick={handleCanvasClick}
        className="absolute inset-0 w-full h-full block"
      />

      {/* SVG overlay: book bars, labels, divider — uses viewBox so coords align with canvas */}
      <svg
        viewBox={`0 0 ${width} ${effectiveHeight}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {/* Testament divider */}
        {otNtDivider && (
          <line
            x1={otNtDivider}
            y1={20}
            x2={otNtDivider}
            y2={baseline + BOOK_BAR_HEIGHT + 5}
            stroke="var(--color-ink)"
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.3}
          />
        )}

        {/* Book bars (clickable for hover state) */}
        {positions.map((pos) => (
          <g key={pos.book.book_id} className="pointer-events-auto">
            <rect
              x={pos.x}
              y={baseline}
              width={pos.width}
              height={BOOK_BAR_HEIGHT}
              fill={categoryColor(pos.book.category)}
              opacity={
                hoveredBook
                  ? pos.book.book_id === hoveredBook
                    ? 1
                    : 0.3
                  : 0.8
              }
              rx={1}
              className="cursor-pointer transition-opacity duration-200"
              onMouseEnter={() => setHoveredBook(pos.book.book_id)}
              onMouseLeave={() => setHoveredBook(null)}
            >
              <title>{pos.book.book_name}</title>
            </rect>
            {pos.width > 12 && (
              <text
                x={pos.x + pos.width / 2}
                y={baseline + BOOK_BAR_HEIGHT + 14}
                textAnchor="middle"
                fontSize={pos.width > 20 ? 8 : 6}
                fill="var(--color-ink)"
                opacity={0.7}
                className="select-none pointer-events-none"
              >
                {pos.book.book_id}
              </text>
            )}
          </g>
        ))}

        {/* Testament labels */}
        {otNtDivider && (
          <>
            <text
              x={otNtDivider / 2}
              y={baseline + BOOK_BAR_HEIGHT + 35}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-old-testament)"
              fontWeight="bold"
            >
              Old Testament
            </text>
            <text
              x={otNtDivider + (width - otNtDivider) / 2}
              y={baseline + BOOK_BAR_HEIGHT + 35}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-new-testament)"
              fontWeight="bold"
            >
              New Testament
            </text>
          </>
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed bg-[var(--color-ink)] text-[var(--color-parchment)] text-xs px-3 py-1.5 rounded shadow-lg pointer-events-none z-50"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
