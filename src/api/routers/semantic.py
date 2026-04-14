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


@router.get("/semantic/divergence")
def get_translation_divergence(
    strongs_id: str = Query(..., description="Strong's ID (e.g., H2617, G25)"),
    translations: str = Query(
        "kjv,nvi,rvr",
        description="Comma-separated translation IDs to compare",
    ),
    limit: int = Query(20, ge=1, le=100, description="Max verses to return"),
) -> dict:
    """Compare how different translations render the same Strong's word.

    For each verse containing the target Strong's, returns the verse text
    in each requested translation — enabling side-by-side comparison of
    how translators chose to render the same Hebrew/Greek term.
    """
    conn = get_db()
    try:
        sid = strongs_id.upper()
        trans_list = [t.strip().lower() for t in translations.split(",") if t.strip()]
        if not trans_list:
            raise HTTPException(status_code=400, detail="No translations specified")

        # Get gloss for the header
        lex_row = conn.execute(
            "SELECT transliteration, short_definition FROM strongs_lexicon WHERE strongs_id = ?",
            [sid],
        ).fetchone()
        gloss = ""
        if lex_row:
            gloss = f"{lex_row[0]} / {lex_row[1]}" if lex_row[0] else (lex_row[1] or "")

        # Get distinct verse_ids containing this Strong's, limited
        verse_ids_df = conn.execute(
            """
            SELECT DISTINCT verse_id
            FROM interlinear
            WHERE strongs_id = ?
            ORDER BY verse_id
            LIMIT ?
            """,
            [sid, limit],
        ).fetchdf()

        if verse_ids_df.empty:
            return {
                "strongs_id": sid,
                "gloss": gloss,
                "translations_shown": trans_list,
                "total_verses": 0,
                "verses": [],
            }

        verse_id_list = verse_ids_df["verse_id"].tolist()

        # Fetch verse texts for all requested translations
        vid_placeholders = ",".join(["?"] * len(verse_id_list))
        tid_placeholders = ",".join(["?"] * len(trans_list))
        params = verse_id_list + trans_list

        texts_df = conn.execute(
            f"""
            SELECT verse_id, translation_id, text, reference
            FROM verses
            WHERE verse_id IN ({vid_placeholders})
              AND translation_id IN ({tid_placeholders})
            ORDER BY verse_id, translation_id
            """,
            params,
        ).fetchdf()

        # Pivot: group by verse_id
        from collections import defaultdict

        grouped: dict[str, dict] = defaultdict(lambda: {"texts": {}, "reference": ""})
        for _, row in texts_df.iterrows():
            vid = row["verse_id"]
            grouped[vid]["texts"][row["translation_id"]] = row["text"]
            if not grouped[vid]["reference"]:
                grouped[vid]["reference"] = row["reference"]

        # Total from interlinear (not limited)
        total_row = conn.execute(
            "SELECT COUNT(DISTINCT verse_id) FROM interlinear WHERE strongs_id = ?",
            [sid],
        ).fetchone()
        total = total_row[0] if total_row else 0

        verses_out = []
        for vid in verse_id_list:
            if vid in grouped:
                verses_out.append(
                    {
                        "verse_id": vid,
                        "reference": grouped[vid]["reference"],
                        "texts": grouped[vid]["texts"],
                    }
                )

        return {
            "strongs_id": sid,
            "gloss": gloss,
            "translations_shown": trans_list,
            "total_verses": total,
            "verses": verses_out,
        }
    finally:
        conn.close()
