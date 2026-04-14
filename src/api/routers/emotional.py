"""
Emotional Landscape Router
Per-verse sentiment series, emotional peaks, and book-level profiles.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()


@router.get("/emotional/landscape")
def get_emotional_landscape(
    book: str = Query(..., description="Book ID (e.g. PSA, JHN)"),
    translation: str = Query("kjv", description="Translation ID"),
) -> dict:
    """Get per-verse sentiment polarity for the entire book — for area/line charts."""
    conn = get_db()
    try:
        book_upper = book.upper()
        df = conn.execute(
            """
            SELECT
                verse_id,
                chapter,
                verse,
                ROUND(sentiment_polarity, 4) AS polarity,
                sentiment_label AS label
            FROM verses
            WHERE book_id = ? AND translation_id = ?
            ORDER BY chapter, verse
            """,
            [book_upper, translation],
        ).fetchdf()

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {book_upper}/{translation}")

        return {
            "book_id": book_upper,
            "translation": translation,
            "total_verses": len(df),
            "series": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/emotional/peaks")
def get_emotional_peaks(
    book: str = Query(..., description="Book ID"),
    emotion: str = Query("positive", description="Filter: positive, negative, or neutral"),
    translation: str = Query("kjv", description="Translation ID"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
) -> dict:
    """Get the most emotionally intense verses in a book."""
    conn = get_db()
    try:
        book_upper = book.upper()
        order = "DESC" if emotion == "positive" else "ASC"
        where_label = ""
        if emotion in ("positive", "negative", "neutral"):
            where_label = "AND sentiment_label = ?"

        params: list[object] = [book_upper, translation]
        if where_label:
            params.append(emotion)
        params.append(limit)

        df = conn.execute(
            f"""
            SELECT
                verse_id,
                reference,
                chapter,
                verse,
                text,
                ROUND(sentiment_polarity, 4) AS polarity,
                sentiment_label AS label
            FROM verses
            WHERE book_id = ? AND translation_id = ?
            {where_label}
            ORDER BY sentiment_polarity {order}
            LIMIT ?
            """,
            params,
        ).fetchdf()

        return {
            "book_id": book_upper,
            "emotion": emotion,
            "translation": translation,
            "results": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/emotional/book-profiles")
def get_book_profiles(
    translation: str = Query("kjv", description="Translation ID"),
) -> dict:
    """Get emotional profile for every book — avg, min, max polarity + label counts."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT
                book_id,
                ANY_VALUE(book_name) AS book_name,
                ANY_VALUE(testament) AS testament,
                ANY_VALUE(category) AS category,
                COUNT(*) AS verse_count,
                ROUND(AVG(sentiment_polarity), 4) AS avg_polarity,
                ROUND(MIN(sentiment_polarity), 4) AS min_polarity,
                ROUND(MAX(sentiment_polarity), 4) AS max_polarity,
                SUM(CASE WHEN sentiment_label = 'positive' THEN 1 ELSE 0 END) AS positive,
                SUM(CASE WHEN sentiment_label = 'negative' THEN 1 ELSE 0 END) AS negative,
                SUM(CASE WHEN sentiment_label = 'neutral' THEN 1 ELSE 0 END) AS neutral
            FROM verses
            WHERE translation_id = ?
            GROUP BY book_id
            ORDER BY MIN(book_position)
            """,
            [translation],
        ).fetchdf()

        return {
            "translation": translation,
            "total_books": len(df),
            "profiles": df.to_dict(orient="records"),
        }
    finally:
        conn.close()
