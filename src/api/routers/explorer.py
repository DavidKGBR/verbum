"""
Semantic Explorer Router
Unified concept search and multi-layer graph expansion for the Explorer feature.
Bridges Strong's lexicon, Nave's topics, biblical people, and places into a
single navigable knowledge graph.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

_INTERLINEAR_JUNK_RE = re.compile(r"[\[»@]")

from src.api.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

PRESETS_PATH = Path("data/static/explorer_presets.json")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_high_frequency_strongs(conn: object, top_n: int = 30) -> list[str]:
    """Return the top-N most frequent Strong's IDs (articles, conjunctions, etc.)."""
    rows = conn.execute(  # type: ignore[attr-defined]
        "SELECT strongs_id FROM interlinear "
        "WHERE strongs_id IS NOT NULL "
        "GROUP BY strongs_id ORDER BY COUNT(*) DESC LIMIT ?",
        [top_n],
    ).fetchall()
    return [r[0] for r in rows]


def _exclude_clause(exclude_ids: list[str], alias: str = "i2") -> tuple[str, list[str]]:
    """Build a SQL NOT IN clause for high-frequency words."""
    if not exclude_ids:
        return "", []
    placeholders = ",".join(["?"] * len(exclude_ids))
    return f"AND {alias}.strongs_id NOT IN ({placeholders})", exclude_ids


def _enrich_strongs(
    conn: object, strongs_ids: list[str], lang: str | None = None
) -> dict[str, dict]:
    """Look up lexicon data for a list of Strong's IDs.

    When *lang* is ``"pt"`` or ``"es"``, overlays ``short_definition``
    from ``strongs_lexicon_multilang``.
    """
    if not strongs_ids:
        return {}
    placeholders = ",".join(["?"] * len(strongs_ids))
    rows = conn.execute(  # type: ignore[attr-defined]
        f"SELECT strongs_id, transliteration, short_definition, language "
        f"FROM strongs_lexicon WHERE strongs_id IN ({placeholders})",
        strongs_ids,
    ).fetchall()
    base = {
        r[0]: {
            "strongs_id": r[0],
            "transliteration": r[1] or "",
            "short_definition": r[2] or "",
            "language": r[3] or "",
        }
        for r in rows
    }
    if lang and lang.lower() in ("pt", "es") and base:
        ml_rows = conn.execute(  # type: ignore[attr-defined]
            f"SELECT strongs_id, short_definition "
            f"FROM strongs_lexicon_multilang "
            f"WHERE strongs_id IN ({placeholders}) AND lang = ? "
            f"AND short_definition IS NOT NULL",
            strongs_ids + [lang.lower()],
        ).fetchall()
        for sid, sd in ml_rows:
            if sid in base:
                base[sid]["short_definition"] = sd
    return base


# ---------------------------------------------------------------------------
# 1. GET /explorer/search — Unified concept search
# ---------------------------------------------------------------------------


@router.get("/explorer/search")
def explorer_search(
    q: str = Query(..., min_length=2, description="Search query (min 2 chars)"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
    lang: str | None = Query(None, description="Locale (pt, es) for localized labels"),
) -> dict:
    """Unified concept search across Strong's lexicon, topics, people, and places.

    Ranks results by match quality: exact match first, then starts-with, then
    contains. Within each rank band, results are ordered by relevance metrics
    (verse_count for topics, frequency for Strong's words).
    """
    conn = get_db()
    try:
        pattern = f"%{q}%"
        starts = f"{q}%"
        # We run a UNION ALL across the four entity tables.
        # Each sub-query returns a uniform shape plus a computed rank.
        query = """
            SELECT * FROM (
                -- Strong's lexicon
                SELECT
                    'strongs' AS type,
                    strongs_id AS id,
                    COALESCE(transliteration, strongs_id) AS label,
                    short_definition AS secondary_label,
                    CASE
                        WHEN LOWER(transliteration) = LOWER(?) OR LOWER(original) = LOWER(?) THEN 1
                        WHEN LOWER(transliteration) LIKE LOWER(?)
                            OR LOWER(original) LIKE LOWER(?) THEN 2
                        ELSE 3
                    END AS rank,
                    language AS meta_language,
                    NULL AS meta_verse_count,
                    NULL AS meta_slug,
                    NULL AS meta_gender,
                    NULL AS meta_place_type
                FROM strongs_lexicon
                WHERE short_definition ILIKE ?
                   OR transliteration ILIKE ?
                   OR original ILIKE ?

                UNION ALL

                -- Topics (EN name + multilang name)
                SELECT
                    'topic' AS type,
                    CAST(t.topic_id AS VARCHAR) AS id,
                    COALESCE(m.name, t.name) AS label,
                    NULL AS secondary_label,
                    CASE
                        WHEN LOWER(t.name) = LOWER(?) OR LOWER(m.name) = LOWER(?) THEN 1
                        WHEN LOWER(t.name) LIKE LOWER(?)
                            OR LOWER(m.name) LIKE LOWER(?) THEN 2
                        ELSE 3
                    END AS rank,
                    NULL AS meta_language,
                    t.verse_count AS meta_verse_count,
                    t.slug AS meta_slug,
                    NULL AS meta_gender,
                    NULL AS meta_place_type
                FROM topics t
                LEFT JOIN topics_multilang m
                    ON t.topic_id = m.topic_id AND m.lang = ?
                WHERE t.name ILIKE ? OR m.name ILIKE ?

                UNION ALL

                -- People
                SELECT
                    'person' AS type,
                    CAST(person_id AS VARCHAR) AS id,
                    name AS label,
                    description AS secondary_label,
                    CASE
                        WHEN LOWER(name) = LOWER(?) THEN 1
                        WHEN LOWER(name) LIKE LOWER(?) THEN 2
                        ELSE 3
                    END AS rank,
                    NULL AS meta_language,
                    NULL AS meta_verse_count,
                    slug AS meta_slug,
                    gender AS meta_gender,
                    NULL AS meta_place_type
                FROM biblical_people
                WHERE name ILIKE ?

                UNION ALL

                -- Places
                SELECT
                    'place' AS type,
                    CAST(place_id AS VARCHAR) AS id,
                    name AS label,
                    description AS secondary_label,
                    CASE
                        WHEN LOWER(name) = LOWER(?) THEN 1
                        WHEN LOWER(name) LIKE LOWER(?) THEN 2
                        ELSE 3
                    END AS rank,
                    NULL AS meta_language,
                    NULL AS meta_verse_count,
                    slug AS meta_slug,
                    NULL AS meta_gender,
                    place_type AS meta_place_type
                FROM biblical_places
                WHERE name ILIKE ?
            ) sub
            ORDER BY rank,
                     COALESCE(meta_verse_count, 0) DESC,
                     label
            LIMIT ?
        """

        target_lang = lang.lower() if lang and lang.lower() in ("pt", "es") else "en"
        # Parameter order must match the placeholders above exactly.
        params: list[object] = [
            # strongs CASE: exact (transliteration, original)
            q,
            q,
            # strongs CASE: starts-with (transliteration, original)
            starts,
            starts,
            # strongs WHERE: ILIKE for definition, transliteration, original
            pattern,
            pattern,
            pattern,
            # topics CASE: exact (EN name, multilang name)
            q,
            q,
            # topics CASE: starts-with (EN name, multilang name)
            starts,
            starts,
            # topics LEFT JOIN lang
            target_lang,
            # topics WHERE (EN name, multilang name)
            pattern,
            pattern,
            # people CASE: exact, starts-with
            q,
            starts,
            # people WHERE
            pattern,
            # places CASE: exact, starts-with
            q,
            starts,
            # places WHERE
            pattern,
            # LIMIT
            limit,
        ]

        rows = conn.execute(query, params).fetchall()

        results = []
        for r in rows:
            meta: dict[str, object] = {}
            if r[5]:  # meta_language
                meta["language"] = r[5]
            if r[6] is not None:  # meta_verse_count
                meta["verse_count"] = r[6]
            if r[7]:  # meta_slug
                meta["slug"] = r[7]
            if r[8]:  # meta_gender
                meta["gender"] = r[8]
            if r[9]:  # meta_place_type
                meta["place_type"] = r[9]

            sec = r[3]
            if sec and r[0] == "strongs" and _INTERLINEAR_JUNK_RE.search(sec):
                parts = re.split(r"[,;]", sec)
                parts = [p.strip() for p in parts if p.strip() and not _INTERLINEAR_JUNK_RE.search(p)]
                sec = parts[0] if parts else None

            results.append(
                {
                    "type": r[0],
                    "id": r[1],
                    "label": r[2],
                    "secondary_label": sec,
                    "meta": meta,
                }
            )

        return {"results": results}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# 2. GET /explorer/expand — Multi-layer node expansion
# ---------------------------------------------------------------------------


@router.get("/explorer/expand")
def explorer_expand(
    node_type: str = Query(..., description="Node type: strongs, topic, person, or place"),
    node_id: str = Query(..., description="Node identifier"),
    layers: str = Query(
        "lexical,topics",
        description="Comma-separated layers (lexical,topics,threads,crossrefs,people)",
    ),
    limit: int = Query(30, ge=1, le=100, description="Max total neighbor nodes"),
    lang: str | None = Query(
        None,
        description="Target language for localized definitions: 'pt' or 'es'.",
    ),
) -> dict:
    """Expand a concept node into its multi-layer neighborhood.

    Given a center node (a Strong's word, topic, person, or place), returns
    related nodes across the requested layers. Each layer runs an independent
    sub-query with balanced limits. Edges encode co-occurrence counts or
    topic-link weights so the frontend can size/color them.
    """
    conn = get_db()
    try:
        active_layers = [x.strip().lower() for x in layers.split(",") if x.strip()]
        nodes: list[dict] = []
        edges: list[dict] = []

        target_lang = lang.lower() if lang and lang.lower() in ("pt", "es") else None

        # ── Build center node info
        center = _build_center_node(conn, node_type, node_id, target_lang)

        # ── High-frequency exclusion list (shared across layers)
        exclude_ids = _get_high_frequency_strongs(conn)

        # ── Dispatch per layer
        per_layer_limit = max(6, limit // max(len(active_layers), 1))

        if "lexical" in active_layers and node_type == "strongs":
            _expand_lexical(
                conn,
                node_id.upper(),
                exclude_ids,
                per_layer_limit,
                nodes,
                edges,
                target_lang,
            )

        if "topics" in active_layers:
            if node_type == "strongs":
                _expand_topics_for_strongs(
                    conn,
                    node_id.upper(),
                    per_layer_limit,
                    nodes,
                    edges,
                    lang=target_lang,
                )
            elif node_type == "topic":
                _expand_strongs_for_topic(
                    conn,
                    center["id"],
                    exclude_ids,
                    per_layer_limit,
                    nodes,
                    edges,
                    target_lang,
                )

        # Trim to overall limit
        nodes = nodes[:limit]

        return {
            "center": center,
            "nodes": nodes,
            "edges": edges,
        }
    finally:
        conn.close()


def _build_center_node(
    conn: object, node_type: str, node_id: str, lang: str | None = None
) -> dict:
    """Look up the center node in its source table."""
    if node_type == "strongs":
        row = conn.execute(  # type: ignore[attr-defined]
            "SELECT strongs_id, transliteration, short_definition, language "
            "FROM strongs_lexicon WHERE strongs_id = ?",
            [node_id.upper()],
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Strong's ID {node_id} not found")
        gloss = row[2] or ""
        if lang and lang in ("pt", "es"):
            ml = conn.execute(  # type: ignore[attr-defined]
                "SELECT short_definition FROM strongs_lexicon_multilang "
                "WHERE strongs_id = ? AND lang = ? AND short_definition IS NOT NULL",
                [node_id.upper(), lang],
            ).fetchone()
            if ml:
                gloss = ml[0]
        return {
            "type": "strongs",
            "id": row[0],
            "label": row[1] or row[0],
            "gloss": gloss,
            "language": row[3] or "",
        }

    if node_type == "topic":
        row = conn.execute(  # type: ignore[attr-defined]
            "SELECT topic_id, name, slug, verse_count FROM topics WHERE topic_id = ?",
            [node_id],
        ).fetchone()
        if row is None:
            row = conn.execute(  # type: ignore[attr-defined]
                "SELECT topic_id, name, slug, verse_count FROM topics WHERE slug = ?",
                [node_id],
            ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Topic {node_id} not found")
        label = row[1]
        if lang and lang in ("pt", "es"):
            ml = conn.execute(  # type: ignore[attr-defined]
                "SELECT name FROM topics_multilang "
                "WHERE topic_id = ? AND lang = ?",
                [str(row[0]), lang],
            ).fetchone()
            if ml and ml[0]:
                label = ml[0]
        return {
            "type": "topic",
            "id": str(row[0]),
            "label": label,
            "slug": row[2],
            "verse_count": row[3],
        }

    if node_type == "person":
        row = conn.execute(  # type: ignore[attr-defined]
            "SELECT person_id, name, slug FROM biblical_people WHERE person_id = ?",
            [node_id],
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Person {node_id} not found")
        return {"type": "person", "id": str(row[0]), "label": row[1], "slug": row[2]}

    if node_type == "place":
        row = conn.execute(  # type: ignore[attr-defined]
            "SELECT place_id, name, slug FROM biblical_places WHERE place_id = ?",
            [node_id],
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Place {node_id} not found")
        return {"type": "place", "id": str(row[0]), "label": row[1], "slug": row[2]}

    raise HTTPException(status_code=400, detail=f"Unknown node_type: {node_type}")


def _expand_lexical(
    conn: object,
    sid: str,
    exclude_ids: list[str],
    limit: int,
    nodes: list[dict],
    edges: list[dict],
    lang: str | None = None,
) -> None:
    """Lexical layer: co-occurring Strong's words (self-join on interlinear)."""
    excl_clause, excl_params = _exclude_clause(exclude_ids)
    params: list[object] = [sid, sid] + excl_params + [5, limit]

    query = f"""
        SELECT i2.strongs_id, COUNT(DISTINCT i1.verse_id) AS shared
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
    rows = conn.execute(query, params).fetchall()  # type: ignore[attr-defined]

    neighbor_ids = [r[0] for r in rows]
    lex_map = _enrich_strongs(conn, neighbor_ids, lang)

    for r in rows:
        nid = r[0]
        shared = int(r[1])
        lex = lex_map.get(nid, {})
        nodes.append(
            {
                "type": "strongs",
                "id": nid,
                "label": lex.get("transliteration", nid) or nid,
                "gloss": lex.get("short_definition", "") or "",
                "language": lex.get("language", "") or "",
                "shared": shared,
            }
        )
        edges.append(
            {
                "source": f"strongs:{sid}",
                "target": f"strongs:{nid}",
                "edge_type": "co-occurrence",
                "weight": shared,
            }
        )


def _expand_topics_for_strongs(
    conn: object,
    sid: str,
    limit: int,
    nodes: list[dict],
    edges: list[dict],
    lang: str | None = None,
) -> None:
    """Topics layer for a Strong's node: Nave's topics sharing verses with this word.

    Since interlinear and topic_verses both use the same verse_id format
    (e.g. GEN.1.1), a direct JOIN is possible.
    """
    query = """
        SELECT DISTINCT t.topic_id, t.name, t.slug, t.verse_count,
               COUNT(DISTINCT tv.verse_id) AS shared
        FROM interlinear i
        JOIN topic_verses tv ON i.verse_id = tv.verse_id
        JOIN topics t ON tv.topic_id = t.topic_id
        WHERE i.strongs_id = ?
        GROUP BY t.topic_id, t.name, t.slug, t.verse_count
        ORDER BY shared DESC
        LIMIT ?
    """
    rows = conn.execute(query, [sid, limit]).fetchall()  # type: ignore[attr-defined]

    ml_map: dict[str, str] = {}
    if lang and lang in ("pt", "es") and rows:
        tids = [str(r[0]) for r in rows]
        ph = ",".join(["?"] * len(tids))
        ml_rows = conn.execute(  # type: ignore[attr-defined]
            f"SELECT topic_id, name FROM topics_multilang "
            f"WHERE topic_id IN ({ph}) AND lang = ?",
            tids + [lang],
        ).fetchall()
        ml_map = {str(r[0]): r[1] for r in ml_rows if r[1]}

    for r in rows:
        tid = str(r[0])
        shared = int(r[4])
        nodes.append(
            {
                "type": "topic",
                "id": tid,
                "label": ml_map.get(tid, r[1]),
                "slug": r[2],
                "verse_count": r[3],
                "shared": shared,
            }
        )
        edges.append(
            {
                "source": f"strongs:{sid}",
                "target": f"topic:{tid}",
                "edge_type": "topic_link",
                "weight": shared,
            }
        )


def _expand_strongs_for_topic(
    conn: object,
    topic_id: str,
    exclude_ids: list[str],
    limit: int,
    nodes: list[dict],
    edges: list[dict],
    lang: str | None = None,
) -> None:
    """Topics layer for a topic node: Strong's words in this topic's verses.

    Joins topic_verses to interlinear via shared verse_id, then enriches
    with lexicon data.
    """
    excl_clause, excl_params = _exclude_clause(exclude_ids, alias="i")
    params: list[object] = [topic_id] + excl_params + [limit]

    query = f"""
        SELECT i.strongs_id, COUNT(DISTINCT i.verse_id) AS shared
        FROM topic_verses tv
        JOIN interlinear i ON tv.verse_id = i.verse_id
        WHERE tv.topic_id = ?
            AND i.strongs_id IS NOT NULL
            {excl_clause}
        GROUP BY i.strongs_id
        ORDER BY shared DESC
        LIMIT ?
    """
    rows = conn.execute(query, params).fetchall()  # type: ignore[attr-defined]

    neighbor_ids = [r[0] for r in rows]
    lex_map = _enrich_strongs(conn, neighbor_ids, lang)

    for r in rows:
        nid = r[0]
        shared = int(r[1])
        lex = lex_map.get(nid, {})
        nodes.append(
            {
                "type": "strongs",
                "id": nid,
                "label": lex.get("transliteration", nid) or nid,
                "gloss": lex.get("short_definition", "") or "",
                "language": lex.get("language", "") or "",
                "shared": shared,
            }
        )
        edges.append(
            {
                "source": f"topic:{topic_id}",
                "target": f"strongs:{nid}",
                "edge_type": "topic_link",
                "weight": shared,
            }
        )


# ---------------------------------------------------------------------------
# 3. GET /explorer/edge-evidence — Verse evidence for a connection
# ---------------------------------------------------------------------------


@router.get("/explorer/edge-evidence")
def explorer_edge_evidence(
    source_type: str = Query(..., description="Source node type (strongs, topic)"),
    source_id: str = Query(..., description="Source node identifier"),
    target_type: str = Query(..., description="Target node type (strongs, topic)"),
    target_id: str = Query(..., description="Target node identifier"),
    edge_type: str = Query(..., description="Edge type: co-occurrence or topic_link"),
    translation: str = Query("kjv", description="Translation for verse text"),
    limit: int = Query(10, ge=1, le=50, description="Max verses to return"),
) -> dict:
    """Return verse-level evidence for a graph edge.

    For co-occurrence edges (both strongs), finds verses containing both
    Strong's words. For topic_link edges (strongs + topic), finds verses
    in the topic that also contain the Strong's word.
    """
    conn = get_db()
    try:
        verses: list[dict] = []
        total_shared = 0

        if edge_type == "co-occurrence":
            sid1 = source_id.upper()
            sid2 = target_id.upper()

            # Count total shared
            count_row = conn.execute(
                """
                SELECT COUNT(DISTINCT i1.verse_id)
                FROM interlinear i1
                JOIN interlinear i2 ON i1.verse_id = i2.verse_id
                WHERE i1.strongs_id = ? AND i2.strongs_id = ?
                """,
                [sid1, sid2],
            ).fetchone()
            total_shared = count_row[0] if count_row else 0

            rows = conn.execute(
                """
                SELECT DISTINCT v.verse_id, v.reference, v.text,
                       v.book_name, v.chapter, v.verse
                FROM interlinear i1
                JOIN interlinear i2 ON i1.verse_id = i2.verse_id
                JOIN verses v ON i1.verse_id = v.verse_id
                    AND v.translation_id = ?
                WHERE i1.strongs_id = ? AND i2.strongs_id = ?
                ORDER BY v.book_name, v.chapter, v.verse
                LIMIT ?
                """,
                [translation, sid1, sid2, limit],
            ).fetchall()

            verses = [
                {
                    "verse_id": r[0],
                    "reference": r[1],
                    "text": r[2],
                    "book_name": r[3],
                    "chapter": r[4],
                    "verse": r[5],
                }
                for r in rows
            ]

        elif edge_type == "topic_link":
            # Determine which is the topic and which is the strongs
            if source_type == "topic":
                tid, sid = source_id, target_id.upper()
            elif target_type == "topic":
                tid, sid = target_id, source_id.upper()
            else:
                raise HTTPException(
                    status_code=400,
                    detail="topic_link edge requires one topic node",
                )

            # Count total shared
            count_row = conn.execute(
                """
                SELECT COUNT(DISTINCT tv.verse_id)
                FROM topic_verses tv
                JOIN interlinear i ON tv.verse_id = i.verse_id
                WHERE tv.topic_id = ? AND i.strongs_id = ?
                """,
                [tid, sid],
            ).fetchone()
            total_shared = count_row[0] if count_row else 0

            rows = conn.execute(
                """
                SELECT DISTINCT v.verse_id, v.reference, v.text,
                       v.book_name, v.chapter, v.verse
                FROM topic_verses tv
                JOIN interlinear i ON tv.verse_id = i.verse_id
                JOIN verses v ON tv.verse_id = v.verse_id
                    AND v.translation_id = ?
                WHERE tv.topic_id = ? AND i.strongs_id = ?
                ORDER BY v.book_name, v.chapter, v.verse
                LIMIT ?
                """,
                [translation, tid, sid, limit],
            ).fetchall()

            verses = [
                {
                    "verse_id": r[0],
                    "reference": r[1],
                    "text": r[2],
                    "book_name": r[3],
                    "chapter": r[4],
                    "verse": r[5],
                }
                for r in rows
            ]
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown edge_type: {edge_type}. Use 'co-occurrence' or 'topic_link'.",
            )

        return {
            "source": {"type": source_type, "id": source_id},
            "target": {"type": target_type, "id": target_id},
            "edge_type": edge_type,
            "total_shared": total_shared,
            "verses": verses,
        }
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# 4. GET /explorer/presets — Static preset configurations
# ---------------------------------------------------------------------------


@router.get("/explorer/presets")
def explorer_presets() -> dict:
    """Load explorer preset configurations from a static JSON file.

    Presets define curated starting points for the Explorer graph
    (e.g. "Covenant vocabulary", "Messianic prophecy network").
    Returns an empty list if the file doesn't exist yet.
    """
    if not PRESETS_PATH.exists():
        return {"presets": []}
    try:
        data = json.loads(PRESETS_PATH.read_text(encoding="utf-8"))
        return data
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Failed to read explorer presets: %s", exc)
        return {"presets": []}
