"""
🔗 Cross-References Router
Endpoints for cross-reference data and arc diagram visualization.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()


@router.get("/crossrefs/arcs")
def get_arcs(
    source_book: str | None = Query(None, description="Filter by source book ID"),
    min_connections: int = Query(1, ge=1, description="Minimum connections per book pair"),
    color_by: str = Query("distance", description="Color scheme: distance, testament, type"),
) -> dict:
    """Get aggregated cross-reference arcs for arc diagram visualization."""
    conn = get_db()
    try:
        params: list = []
        where_clause = ""
        having_clause = ""

        if source_book:
            where_clause = "WHERE source_book_id = ?"
            params.append(source_book.upper())

        if min_connections > 1:
            having_clause = f"HAVING COUNT(*) >= {min_connections}"

        df = conn.execute(
            f"""
            SELECT
                source_book_id, target_book_id,
                source_book_position, target_book_position,
                COUNT(*) AS connection_count,
                ROUND(AVG(arc_distance), 2) AS avg_distance,
                SUM(votes) AS total_votes
            FROM cross_references
            {where_clause}
            GROUP BY source_book_id, target_book_id,
                     source_book_position, target_book_position
            {having_clause}
            ORDER BY connection_count DESC
            """,
            params,
        ).fetchdf()

        total = conn.execute("SELECT COUNT(*) FROM cross_references").fetchone()[0]

        return {
            "arcs": df.to_dict(orient="records"),
            "metadata": {
                "total_crossrefs": total,
                "filtered_arcs": len(df),
                "color_scheme": color_by,
            },
        }
    finally:
        conn.close()


@router.get("/crossrefs/network")
def get_network(
    books: str | None = Query(None, description="Comma-separated book IDs to include"),
    min_weight: int = Query(5, ge=1, description="Minimum connections to include edge"),
) -> dict:
    """Get book-level network graph data (nodes = books, edges = cross-ref counts)."""
    conn = get_db()
    try:
        params: list = []
        where_clause = ""

        if books:
            book_list = [b.strip().upper() for b in books.split(",")]
            placeholders = ", ".join(["?" for _ in book_list])
            where_clause = (
                f"WHERE source_book_id IN ({placeholders}) AND target_book_id IN ({placeholders})"
            )
            params = book_list + book_list

        df = conn.execute(
            f"""
            SELECT
                source_book_id AS source,
                target_book_id AS target,
                COUNT(*) AS weight
            FROM cross_references
            {where_clause}
            GROUP BY source_book_id, target_book_id
            HAVING COUNT(*) >= ?
            ORDER BY weight DESC
            """,
            params + [min_weight],
        ).fetchdf()

        all_books = set(df["source"].tolist() + df["target"].tolist())

        return {
            "nodes": sorted(all_books),
            "edges": df.to_dict(orient="records"),
            "total_edges": len(df),
        }
    finally:
        conn.close()


@router.get("/crossrefs/{verse_id}")
def get_verse_crossrefs(verse_id: str) -> dict:
    """Get all cross-references for a specific verse."""
    conn = get_db()
    try:
        vid = verse_id.upper()

        outgoing = conn.execute(
            """
            SELECT target_verse_id, target_book_id, target_book_position,
                   votes, reference_type, arc_distance
            FROM cross_references
            WHERE source_verse_id = ?
            ORDER BY votes DESC
            """,
            [vid],
        ).fetchdf()

        incoming = conn.execute(
            """
            SELECT source_verse_id, source_book_id, source_book_position,
                   votes, reference_type, arc_distance
            FROM cross_references
            WHERE target_verse_id = ?
            ORDER BY votes DESC
            """,
            [vid],
        ).fetchdf()

        if outgoing.empty and incoming.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No cross-references found for {vid}",
            )

        return {
            "verse_id": vid,
            "outgoing": outgoing.to_dict(orient="records"),
            "incoming": incoming.to_dict(orient="records"),
            "total": len(outgoing) + len(incoming),
        }
    finally:
        conn.close()
