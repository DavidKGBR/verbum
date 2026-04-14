"""
🕸️ Semantic Graph Router
Co-occurrence graph of Strong's words for the Semantic Graph visualisation.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()


@router.get("/semantic/graph")
def get_semantic_graph(
    center: str = Query(..., description="Center Strong's ID (e.g., G25, H2617)"),
    min_shared: int = Query(5, ge=1, le=200, description="Minimum shared verses to include"),
    limit: int = Query(30, ge=5, le=100, description="Max neighbor nodes"),
    exclude_common: bool = Query(
        True, description="Exclude top-30 most frequent words (articles, conjunctions)"
    ),
) -> dict:
    """Build a star-shaped co-occurrence graph centered on a Strong's word.

    Returns the center node plus its top N co-occurring words (by shared
    verse count), enriched with transliterations and glosses from the
    Strong's lexicon. Designed to feed a D3 force-directed graph on the
    frontend.
    """
    conn = get_db()
    try:
        sid = center.upper()

        # ── Validate center exists
        center_row = conn.execute(
            "SELECT strongs_id, transliteration, short_definition, language "
            "FROM strongs_lexicon WHERE strongs_id = ?",
            [sid],
        ).fetchone()
        if not center_row:
            raise HTTPException(status_code=404, detail=f"Strong's ID {sid} not found")

        center_node = {
            "id": center_row[0],
            "label": center_row[1] or sid,
            "gloss": center_row[2] or "",
            "language": center_row[3] or "",
        }

        # ── Optionally get high-frequency words to exclude
        exclude_ids: list[str] = []
        if exclude_common:
            hfw = conn.execute(
                "SELECT strongs_id FROM interlinear "
                "WHERE strongs_id IS NOT NULL "
                "GROUP BY strongs_id ORDER BY COUNT(*) DESC LIMIT 30"
            ).fetchall()
            exclude_ids = [r[0] for r in hfw]

        # Build exclusion clause
        excl_clause = ""
        params: list = [sid, sid, min_shared, limit]
        if exclude_ids:
            placeholders = ",".join(["?"] * len(exclude_ids))
            excl_clause = f"AND i2.strongs_id NOT IN ({placeholders})"
            # Insert exclude params before the HAVING/LIMIT params
            params = [sid, sid] + exclude_ids + [min_shared, limit]

        query = f"""
            SELECT
                i2.strongs_id,
                COUNT(DISTINCT i1.verse_id) AS shared
            FROM interlinear i1
            JOIN interlinear i2
                ON i1.verse_id = i2.verse_id
                AND i2.strongs_id != i1.strongs_id
            WHERE i1.strongs_id = ?
                AND i2.strongs_id IS NOT NULL
                AND i2.strongs_id != ?
                {excl_clause}
            GROUP BY i2.strongs_id
            HAVING shared >= ?
            ORDER BY shared DESC
            LIMIT ?
        """

        df = conn.execute(query, params).fetchdf()

        if df.empty:
            return {
                "center": center_node,
                "nodes": [],
                "edges": [],
            }

        # ── Enrich with lexicon data
        neighbor_ids = df["strongs_id"].tolist()
        if neighbor_ids:
            placeholders = ",".join(["?"] * len(neighbor_ids))
            lex_df = conn.execute(
                f"SELECT strongs_id, transliteration, short_definition, language "
                f"FROM strongs_lexicon WHERE strongs_id IN ({placeholders})",
                neighbor_ids,
            ).fetchdf()
            lex_map = {r["strongs_id"]: r for _, r in lex_df.iterrows()}
        else:
            lex_map = {}

        nodes = []
        edges = []
        for _, row in df.iterrows():
            nid = row["strongs_id"]
            shared = int(row["shared"])
            lex = lex_map.get(nid, {})
            nodes.append(
                {
                    "id": nid,
                    "label": lex.get("transliteration", nid) or nid,
                    "gloss": lex.get("short_definition", "") or "",
                    "language": lex.get("language", "") or "",
                    "shared": shared,
                }
            )
            edges.append(
                {
                    "source": sid,
                    "target": nid,
                    "weight": shared,
                }
            )

        return {
            "center": center_node,
            "nodes": nodes,
            "edges": edges,
        }
    finally:
        conn.close()
