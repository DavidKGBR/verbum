"""
🔍 Search Router
Full-text verse search with filters.
"""

from __future__ import annotations

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
    """Search verses by text content."""
    conn = get_db()
    try:
        params: list = [f"%{q}%", translation.lower()]
        book_filter = ""
        if book:
            book_filter = "AND book_id = ?"
            params.append(book.upper())

        params.append(limit)

        df = conn.execute(
            f"""
            SELECT verse_id, reference, text, book_id, chapter, verse,
                   word_count, sentiment_polarity, sentiment_label
            FROM verses
            WHERE text ILIKE ? AND translation_id = ? {book_filter}
            ORDER BY book_position, chapter, verse
            LIMIT ?
            """,
            params,
        ).fetchdf()

        return {
            "query": q,
            "translation": translation.lower(),
            "total_results": len(df),
            "results": df.to_dict(orient="records"),
        }
    finally:
        conn.close()
