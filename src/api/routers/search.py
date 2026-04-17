"""
🔍 Search Router
Full-text verse search with filters + relevance ranking.
"""

from __future__ import annotations

import re

from fastapi import APIRouter, Query

from src.api.dependencies import get_db

router = APIRouter()


@router.get("/verses/search")
def search_verses(
    q: str = Query(..., min_length=2, description="Search text"),
    translation: str = Query("kjv", description="Translation ID"),
    book: str | None = Query(None, description="Filter by book ID (e.g., GEN, PSA)"),
    limit: int = Query(50, ge=1, le=200, description="Max results"),
) -> dict:
    """Search verses by text content.

    Relevance ranking (ORDER BY match_rank):
      0 = whole-word match       ("Ester" in "Ester era rainha")
      1 = word-start match       ("Ester" in "Estera", "Esterno")
      2 = plain substring match  ("Ester" in "Beesterá", "esterco")

    Within each rank, results stay in canonical reading order
    (book_position, chapter, verse) — so the user sees the most
    relevant hit first without losing narrative flow inside each tier.
    """
    conn = get_db()
    try:
        # Escape any regex metachars the user might have typed ("." is common
        # in biblical references like "1.1"). This turns the raw query into a
        # safe literal pattern.
        safe_q = re.escape(q).lower()
        pattern_whole = rf"\b{safe_q}\b"
        pattern_start = rf"\b{safe_q}"

        params: list = [
            f"%{q}%",           # ILIKE filter
            translation.lower(),
            pattern_whole,      # match_rank = 0 branch
            pattern_start,      # match_rank = 1 branch
        ]
        book_filter = ""
        if book:
            book_filter = "AND book_id = ?"
            params.append(book.upper())

        params.append(limit)

        # DuckDB binds `?` in source-code order. The query uses them in this
        # sequence: whole-regex, start-regex, ILIKE, translation, [book], limit.
        query_params = [
            params[2],           # whole-word regex  (SELECT CASE ?)
            params[3],           # word-start regex  (SELECT CASE ?)
            params[0],           # ILIKE pattern     (WHERE text ILIKE ?)
            params[1],           # translation       (WHERE translation_id = ?)
            *(params[4:]),       # book (if filter enabled), then limit
        ]

        df = conn.execute(
            f"""
            SELECT verse_id, reference, text, book_id, chapter, verse,
                   word_count, sentiment_polarity, sentiment_label,
                   CASE
                     WHEN regexp_matches(LOWER(text), ?) THEN 0
                     WHEN regexp_matches(LOWER(text), ?) THEN 1
                     ELSE 2
                   END AS match_rank
            FROM verses
            WHERE text ILIKE ? AND translation_id = ? {book_filter}
            ORDER BY match_rank ASC, book_position, chapter, verse
            LIMIT ?
            """,
            query_params,
        ).fetchdf()

        # match_rank is an implementation detail — don't leak it in the JSON.
        df = df.drop(columns=["match_rank"])

        return {
            "query": q,
            "translation": translation.lower(),
            "total_results": len(df),
            "results": df.to_dict(orient="records"),
        }
    finally:
        conn.close()
