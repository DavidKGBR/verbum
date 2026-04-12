import { useRef, useState, useMemo } from "react";
import type { Book, Arc } from "../../services/api";
import {
  computeBookPositions,
  arcPath,
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
const LABEL_HEIGHT = 50;
const BASELINE_Y_OFFSET = 30;

export default function ArcDiagram({
  books,
  arcs,
  colorBy,
  width = 1200,
  height = 500,
  onArcClick,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredBook, setHoveredBook] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const baseline = height - BOOK_BAR_HEIGHT - LABEL_HEIGHT - BASELINE_Y_OFFSET;

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
    () => Math.max(1, ...arcs.map((a) => Math.abs(a.target_book_position - a.source_book_position))),
    [arcs]
  );

  const distColor = useMemo(() => distanceColorScale(maxDistance), [maxDistance]);

  // Get arc color based on colorBy mode
  function getArcColor(arc: Arc): string {
    if (colorBy === "testament") return testamentArcColor(arc, posMap);
    if (colorBy === "category") {
      const source = posMap.get(arc.source_book_id);
      return source ? categoryColor(source.book.category) : "#999";
    }
    const dist = Math.abs(arc.target_book_position - arc.source_book_position);
    return distColor(dist);
  }

  // Is arc connected to hovered book?
  function isConnected(arc: Arc): boolean {
    if (!hoveredBook) return true;
    return (
      arc.source_book_id === hoveredBook || arc.target_book_id === hoveredBook
    );
  }

  // OT/NT divider position
  const otNtDivider = useMemo(() => {
    const lastOT = positions.find(
      (p) => p.book.book_position === 39
    ); // Malachi
    const firstNT = positions.find(
      (p) => p.book.book_position === 40
    ); // Matthew
    if (lastOT && firstNT) return (lastOT.x + lastOT.width + firstNT.x) / 2;
    return null;
  }, [positions]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-[var(--color-parchment)]"
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

        {/* Arcs */}
        {arcs.map((arc, i) => {
          const source = posMap.get(arc.source_book_id);
          const target = posMap.get(arc.target_book_id);
          if (!source || !target) return null;

          const x1 = source.x + source.width / 2;
          const x2 = target.x + target.width / 2;
          const connected = isConnected(arc);

          return (
            <path
              key={i}
              d={arcPath(x1, x2, baseline)}
              fill="none"
              stroke={getArcColor(arc)}
              strokeWidth={Math.max(0.5, Math.min(3, arc.connection_count / 20))}
              opacity={
                connected
                  ? opacityScale(arc.connection_count, maxWeight)
                  : 0.03
              }
              className="transition-opacity duration-200 cursor-pointer"
              onMouseEnter={(e) =>
                setTooltip({
                  x: e.clientX,
                  y: e.clientY,
                  text: `${arc.source_book_id} → ${arc.target_book_id}: ${arc.connection_count} refs (click for details)`,
                })
              }
              onMouseLeave={() => setTooltip(null)}
              onClick={() =>
                onArcClick?.(arc.source_book_id, arc.target_book_id, arc.connection_count)
              }
            />
          );
        })}

        {/* Book bars */}
        {positions.map((pos) => (
          <g key={pos.book.book_id}>
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
            />
            {/* Book labels (only show if wide enough) */}
            {pos.width > 12 && (
              <text
                x={pos.x + pos.width / 2}
                y={baseline + BOOK_BAR_HEIGHT + 14}
                textAnchor="middle"
                fontSize={pos.width > 20 ? 8 : 6}
                fill="var(--color-ink)"
                opacity={0.7}
                className="select-none"
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
