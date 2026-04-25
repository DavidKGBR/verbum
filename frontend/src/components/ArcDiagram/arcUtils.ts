import * as d3 from "d3";
import type { Book, Arc } from "../../services/api";

// Category colors from the roadmap palette
const CATEGORY_COLORS: Record<string, string> = {
  Law: "#2e5090",
  History: "#8b6914",
  Poetry: "#9b2335",
  "Major Prophets": "#5c4033",
  "Minor Prophets": "#5c4033",
  Gospels: "#c5a55a",
  Acts: "#c5a55a",
  "Pauline Epistles": "#4682b4",
  "General Epistles": "#4682b4",
  Apocalyptic: "#8b0000",
};

const TESTAMENT_COLORS = {
  "Old Testament": "#4a7c59",
  "New Testament": "#6b4c9a",
};

export interface BookPosition {
  book: Book;
  x: number;
  width: number;
}

/** Map books to x-positions proportional to verse count.
 *  Two-pass algorithm: first assigns minimum widths to small books,
 *  then distributes remaining space proportionally to the rest.
 *  Guarantees all books fit within totalWidth. */
export function computeBookPositions(
  books: Book[],
  totalWidth: number,
  padding = 2
): BookPosition[] {
  const totalVerses = books.reduce((s, b) => s + b.total_verses, 0);
  if (totalVerses === 0 || books.length === 0) return [];

  const MIN_BOOK_WIDTH = 4;
  const totalPadding = padding * books.length;
  const usableWidth = totalWidth - totalPadding;

  // Pass 1: find which books need the minimum width
  // and how many verses remain for proportional distribution
  let minWidthCount = 0;
  let minWidthVerses = 0;
  for (const book of books) {
    const proportional = (book.total_verses / totalVerses) * usableWidth;
    if (proportional < MIN_BOOK_WIDTH) {
      minWidthCount++;
      minWidthVerses += book.total_verses;
    }
  }

  // Pass 2: distribute remaining space proportionally
  const reservedForMin = minWidthCount * MIN_BOOK_WIDTH;
  const remainingWidth = usableWidth - reservedForMin;
  const remainingVerses = totalVerses - minWidthVerses;

  let x = 0;
  return books.map((book) => {
    const proportional = (book.total_verses / totalVerses) * usableWidth;
    const width =
      proportional < MIN_BOOK_WIDTH
        ? MIN_BOOK_WIDTH
        : remainingVerses > 0
          ? (book.total_verses / remainingVerses) * remainingWidth
          : proportional;
    const pos = { book, x: x + padding / 2, width };
    x += width + padding;
    return pos;
  });
}

/** Generate an SVG arc path between two x-positions. */
export function arcPath(x1: number, x2: number, baseline: number): string {
  const radius = Math.abs(x2 - x1) / 2;
  // Flip direction so arcs go upward
  const sweep = x1 < x2 ? 1 : 0;
  return `M ${x1},${baseline} A ${radius},${radius} 0 0,${sweep} ${x2},${baseline}`;
}

/** Get color for a book bar based on its category. */
export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "#666";
}

/** Color scale for arcs by distance. */
export function distanceColorScale(maxDistance: number) {
  return d3.scaleSequential(d3.interpolateViridis).domain([0, maxDistance]);
}

/** Color for an arc by testament crossing. */
export function testamentArcColor(arc: Arc, positions: Map<string, BookPosition>): string {
  const source = positions.get(arc.source_book_id);
  const target = positions.get(arc.target_book_id);
  if (!source || !target) return "#999";

  const sT = source.book.testament;
  const tT = target.book.testament;
  if (sT !== tT) return "#b8860b"; // gold for cross-testament
  return TESTAMENT_COLORS[sT as keyof typeof TESTAMENT_COLORS] || "#999";
}

/** Opacity scale based on connection weight. */
export function opacityScale(weight: number, maxWeight: number): number {
  return Math.max(0.08, Math.min(0.8, weight / maxWeight));
}
