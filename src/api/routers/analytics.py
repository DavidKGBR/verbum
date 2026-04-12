"""
📊 Analytics Router
Sentiment analysis, word counts, and statistical endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from src.api.dependencies import get_db

router = APIRouter()


@router.get("/analytics/sentiment")
def sentiment_stats(
    group_by: str = Query("book", description="Group by: book, chapter, testament, category"),
    translation: str = Query("kjv", description="Translation ID"),
    testament: str | None = Query(None, description="Filter: 'Old Testament' or 'New Testament'"),
) -> dict:
    """Get sentiment statistics grouped by various dimensions."""
    conn = get_db()
    try:
        group_map = {
            "book": "book_id, book_name, testament, book_position",
            "chapter": "book_id, book_name, chapter, book_position",
            "testament": "testament",
            "category": "category, testament",
        }

        if group_by not in group_map:
            group_by = "book"

        group_cols = group_map[group_by]
        testament_filter = ""
        params: list = [translation.lower()]

        if testament:
            testament_filter = "AND testament = ?"
            params.append(testament)

        df = conn.execute(
            f"""
            SELECT {group_cols},
                   COUNT(*) AS verses,
                   ROUND(AVG(sentiment_polarity), 4) AS avg_sentiment,
                   ROUND(MIN(sentiment_polarity), 4) AS min_sentiment,
                   ROUND(MAX(sentiment_polarity), 4) AS max_sentiment,
                   SUM(CASE WHEN sentiment_label = 'positive' THEN 1 ELSE 0 END) AS positive,
                   SUM(CASE WHEN sentiment_label = 'negative' THEN 1 ELSE 0 END) AS negative,
                   SUM(CASE WHEN sentiment_label = 'neutral' THEN 1 ELSE 0 END) AS neutral
            FROM verses
            WHERE translation_id = ? {testament_filter}
            GROUP BY {group_cols}
            ORDER BY {group_cols.split(",")[0]}
            """,
            params,
        ).fetchdf()

        return {
            "group_by": group_by,
            "translation": translation.lower(),
            "total_groups": len(df),
            "data": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/analytics/heatmap")
def sentiment_heatmap(
    translation: str = Query("kjv", description="Translation ID"),
) -> dict:
    """Get chapter-level sentiment data for heatmap visualization."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT book_id, book_name, chapter, book_position,
                   ROUND(AVG(sentiment_polarity), 4) AS avg_sentiment,
                   COUNT(*) AS verses
            FROM verses
            WHERE translation_id = ?
            GROUP BY book_id, book_name, chapter, book_position
            ORDER BY book_position, chapter
            """,
            [translation.lower()],
        ).fetchdf()

        return {
            "translation": translation.lower(),
            "total_chapters": len(df),
            "data": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/analytics/translations")
def translation_stats() -> dict:
    """Get statistics per loaded translation."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT translation_id, language,
                   COUNT(DISTINCT book_id) AS books,
                   COUNT(*) AS verses,
                   SUM(word_count) AS total_words,
                   ROUND(AVG(sentiment_polarity), 4) AS avg_sentiment
            FROM verses
            GROUP BY translation_id, language
            ORDER BY translation_id
            """
        ).fetchdf()

        return {"translations": df.to_dict(orient="records")}
    finally:
        conn.close()
