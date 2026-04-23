"""
Emotional Landscape Router
Per-verse sentiment series, emotional peaks, and book-level profiles.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()

TRANSLATION_LANG = {
    "nvi": "pt", "ra": "pt", "acf": "pt",
    "rvr": "es", "apee": "es",
}


@router.get("/emotional/landscape")
def get_emotional_landscape(
    book: str = Query(..., description="Book ID (e.g. PSA, JHN)"),
    translation: str = Query("kjv", description="Translation ID"),
) -> dict:
    """Get per-verse sentiment polarity for the entire book — for area/line charts."""
    conn = get_db()
    try:
        book_upper = book.upper()
        lang = TRANSLATION_LANG.get(translation)

        if lang:
            df = conn.execute(
                """
                SELECT
                    v.verse_id,
                    v.chapter,
                    v.verse,
                    ROUND(COALESCE(m.polarity, v.sentiment_polarity), 4) AS polarity,
                    COALESCE(m.label, v.sentiment_label) AS label
                FROM verses v
                LEFT JOIN verses_sentiment_multilang m
                    ON m.verse_id = v.verse_id AND m.lang = ?
                WHERE v.book_id = ? AND v.translation_id = ?
                ORDER BY v.chapter, v.verse
                """,
                [lang, book_upper, translation],
            ).fetchdf()
        else:
            df = conn.execute(
                """
                SELECT
                    verse_id, chapter, verse,
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
        lang = TRANSLATION_LANG.get(translation)

        where_label = ""
        if emotion in ("positive", "negative", "neutral"):
            where_label = f"AND {'COALESCE(m.label, v.sentiment_label)' if lang else 'sentiment_label'} = ?"

        params: list[object] = []
        if lang:
            params.append(lang)
        params.extend([book_upper, translation])
        if where_label:
            params.append(emotion)
        params.append(limit)

        if lang:
            polarity_col = "COALESCE(m.polarity, v.sentiment_polarity)"
            df = conn.execute(
                f"""
                SELECT
                    v.verse_id,
                    v.reference,
                    v.chapter,
                    v.verse,
                    v.text,
                    ROUND({polarity_col}, 4) AS polarity,
                    COALESCE(m.label, v.sentiment_label) AS label
                FROM verses v
                LEFT JOIN verses_sentiment_multilang m
                    ON m.verse_id = v.verse_id AND m.lang = ?
                WHERE v.book_id = ? AND v.translation_id = ?
                {where_label}
                ORDER BY {polarity_col} {order}
                LIMIT ?
                """,
                params,
            ).fetchdf()
        else:
            df = conn.execute(
                f"""
                SELECT
                    verse_id, reference, chapter, verse, text,
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
    """Aggregated sentiment stats per book."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT
                book_id,
                book_name,
                testament,
                ROUND(AVG(sentiment_polarity), 4) AS avg_polarity,
                ROUND(MIN(sentiment_polarity), 4) AS min_polarity,
                ROUND(MAX(sentiment_polarity), 4) AS max_polarity,
                SUM(CASE WHEN sentiment_label = 'positive' THEN 1 ELSE 0 END) AS positive,
                SUM(CASE WHEN sentiment_label = 'negative' THEN 1 ELSE 0 END) AS negative,
                SUM(CASE WHEN sentiment_label = 'neutral' THEN 1 ELSE 0 END) AS neutral,
                COUNT(*) AS verse_count
            FROM verses
            WHERE translation_id = ?
            GROUP BY book_id, book_name, testament
            ORDER BY MIN(book_position)
            """,
            [translation],
        ).fetchdf()

        return {"profiles": df.to_dict(orient="records")}
    finally:
        conn.close()
