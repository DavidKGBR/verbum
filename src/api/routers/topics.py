"""
📚 Topics Router
Serves Nave's Topical Bible — search topics and get grouped verse references.
4,673 topics with 191,787 verse links.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


_ACCENT_FROM = "àáâãäåèéêëìíîïòóôõöùúûüñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÑÇ"
_ACCENT_TO = "aaaaaaeeeeiiiiooooouuuuncAAAAAAEEEEIIIIOOOOOUUUUNC"


@router.get("/topics")
def list_topics(
    q: str | None = Query(None, min_length=2, description="Search topics by name"),
    limit: int = Query(50, ge=1, le=500, description="Max results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    lang: str | None = Query(None, description="Language code (pt, es) for search"),
) -> dict:
    """List or search topics from Nave's Topical Bible.

    When `lang` is pt or es, search also hits the localized name column in
    `topics_multilang` so users can find topics by their translated name.
    Accent-insensitive: "moises" matches "MOISÉS", "oracao" matches "ORAÇÃO".
    """
    conn = get_db()
    try:
        params: list[object] = []
        search_where = ""
        if q:
            ql = f"%{q.lower()}%"
            # Accent-insensitive. When lang=pt/es, search ONLY the localized
            # name (topics_multilang has 100% coverage) to avoid false matches
            # from EN names that happen to contain the query substring
            # (e.g. "mois" matching EN "CHAMOIS" when user wants "MOISÉS").
            if lang in ("pt", "es"):
                search_where = f"""WHERE t.topic_id IN (
                    SELECT topic_id FROM topics_multilang
                    WHERE lang = ?
                      AND translate(LOWER(name), '{_ACCENT_FROM}', '{_ACCENT_TO}')
                          LIKE translate(?, '{_ACCENT_FROM}', '{_ACCENT_TO}')
                )"""
                params.extend([lang, ql])
            else:
                search_where = f"""WHERE translate(LOWER(t.name), '{_ACCENT_FROM}', '{_ACCENT_TO}')
                                       LIKE translate(?, '{_ACCENT_FROM}', '{_ACCENT_TO}')"""
                params.append(ql)

        count_row = conn.execute(
            f"SELECT COUNT(*) FROM topics t {search_where}", params
        ).fetchone()
        total = count_row[0] if count_row else 0

        params_page = [*params, limit, offset]
        df = conn.execute(
            f"""
            SELECT t.topic_id, t.name, t.slug, t.verse_count
            FROM topics t
            {search_where}
            ORDER BY t.verse_count DESC, t.name
            LIMIT ? OFFSET ?
            """,
            params_page,
        ).fetchdf()

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "results": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/topics/popular")
def popular_topics(
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    """Get the most-referenced topics."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT topic_id, name, slug, verse_count
            FROM topics
            ORDER BY verse_count DESC
            LIMIT ?
            """,
            [limit],
        ).fetchdf()
        return {"results": df.to_dict(orient="records")}
    finally:
        conn.close()


@router.get("/topics/{slug}")
def get_topic(
    slug: str,
    translation: str = Query("kjv", description="Translation for verse text"),
    limit: int = Query(50, ge=1, le=2000, description="Max verses to return"),
) -> dict:
    """Get a topic with its verse texts."""
    conn = get_db()
    try:
        # Get topic info
        topic_row = conn.execute(
            "SELECT topic_id, name, slug, verse_count FROM topics WHERE slug = ?",
            [slug],
        ).fetchone()

        if not topic_row:
            raise HTTPException(status_code=404, detail=f"Topic '{slug}' not found")

        topic = {
            "topic_id": topic_row[0],
            "name": topic_row[1],
            "slug": topic_row[2],
            "verse_count": topic_row[3],
        }

        # Get verse texts by joining topic_verses → verses
        df = conn.execute(
            """
            SELECT
                tv.verse_id,
                v.book_name,
                v.chapter,
                v.verse,
                v.text,
                v.reference,
                v.book_id
            FROM topic_verses tv
            LEFT JOIN verses v
              ON v.verse_id = tv.verse_id
              AND v.translation_id = ?
            WHERE tv.topic_id = ?
            ORDER BY tv.sort_order
            LIMIT ?
            """,
            [translation, topic["topic_id"], limit],
        ).fetchdf()

        verses = df.to_dict(orient="records")

        return {
            **topic,
            "translation": translation,
            "verses": verses,
        }
    finally:
        conn.close()


@router.get("/topics/{slug}/related")
def get_topic_related(
    slug: str,
    lang: str | None = Query(None, description="Language code (pt, es) for localized names"),
    min_shared: int = Query(5, ge=1, le=100, description="Min shared verses for relatedness"),
    limit: int = Query(8, ge=1, le=30, description="Max related topics to return"),
) -> dict:
    """Cross-links for a topic: matching person/place + topics with verse overlap."""
    conn = get_db()
    try:
        topic = conn.execute(
            "SELECT topic_id, name FROM topics WHERE slug = ?",
            [slug],
        ).fetchone()
        if not topic:
            raise HTTPException(status_code=404, detail=f"Topic '{slug}' not found")
        topic_id, topic_name = topic

        # Matching person by exact case-insensitive name match
        person = conn.execute(
            """
            SELECT slug, name FROM biblical_people
            WHERE LOWER(name) = LOWER(?)
            ORDER BY verse_count DESC NULLS LAST
            LIMIT 1
            """,
            [topic_name],
        ).fetchone()

        # Matching place
        place = conn.execute(
            """
            SELECT slug, name FROM biblical_places
            WHERE LOWER(name) = LOWER(?)
            ORDER BY verse_count DESC NULLS LAST
            LIMIT 1
            """,
            [topic_name],
        ).fetchone()

        # Related topics via shared verse overlap
        related_rows = conn.execute(
            """
            SELECT t2.slug, t2.name, COUNT(*) AS shared
            FROM topic_verses tv1
            JOIN topic_verses tv2
              ON tv2.verse_id = tv1.verse_id AND tv2.topic_id != tv1.topic_id
            JOIN topics t2 ON t2.topic_id = tv2.topic_id
            WHERE tv1.topic_id = ?
            GROUP BY t2.slug, t2.name
            HAVING COUNT(*) >= ?
            ORDER BY shared DESC
            LIMIT ?
            """,
            [topic_id, min_shared, limit],
        ).fetchall()

        related_topics = [
            {"slug": r[0], "name": r[1], "shared_verses": int(r[2])}
            for r in related_rows
        ]

        # Overlay localized topic names from topics_multilang when lang is set
        if lang in ("pt", "es") and related_topics:
            slugs = [rt["slug"] for rt in related_topics]
            placeholders = ",".join(["?"] * len(slugs))
            localized = conn.execute(
                f"""
                SELECT t.slug, m.name FROM topics t
                JOIN topics_multilang m ON m.topic_id = t.topic_id
                WHERE t.slug IN ({placeholders}) AND m.lang = ?
                """,
                [*slugs, lang],
            ).fetchall()
            name_map = {s: n for s, n in localized}
            for rt in related_topics:
                if rt["slug"] in name_map:
                    rt["name"] = name_map[rt["slug"]]

        return {
            "person": {"slug": person[0], "name": person[1]} if person else None,
            "place": {"slug": place[0], "name": place[1]} if place else None,
            "related_topics": related_topics,
        }
    finally:
        conn.close()


@router.get("/topics/for-verse/{verse_id}")
def topics_for_verse(verse_id: str) -> dict:
    """Find which topics reference a specific verse."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT t.topic_id, t.name, t.slug, t.verse_count
            FROM topic_verses tv
            JOIN topics t ON t.topic_id = tv.topic_id
            WHERE tv.verse_id = ?
            ORDER BY t.verse_count DESC
            """,
            [verse_id],
        ).fetchdf()

        return {
            "verse_id": verse_id,
            "topics": df.to_dict(orient="records"),
        }
    finally:
        conn.close()
