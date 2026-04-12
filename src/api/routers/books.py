"""
📖 Books & Verses Router
Endpoints for browsing books, chapters, and verses.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()


@router.get("/books")
def list_books(
    translation: str = Query("kjv", description="Translation ID"),
) -> list[dict]:
    """List all books with stats for a given translation."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT book_id, book_name, testament, category, book_position,
                   total_chapters, total_verses, total_words, avg_sentiment
            FROM book_stats
            WHERE translation_id = ?
            ORDER BY book_position
            """,
            [translation.lower()],
        ).fetchdf()
        return df.to_dict(orient="records")
    finally:
        conn.close()


@router.get("/books/{book_id}/chapters/{chapter}")
def get_chapter(
    book_id: str,
    chapter: int,
    translation: str = Query("kjv", description="Translation ID"),
) -> dict:
    """Get all verses from a specific chapter."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT verse_id, verse, text, reference, word_count,
                   sentiment_polarity, sentiment_label
            FROM verses
            WHERE book_id = ? AND chapter = ? AND translation_id = ?
            ORDER BY verse
            """,
            [book_id.upper(), chapter, translation.lower()],
        ).fetchdf()

        if df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data for {book_id.upper()} chapter {chapter} ({translation})",
            )

        return {
            "book_id": book_id.upper(),
            "chapter": chapter,
            "translation": translation.lower(),
            "verse_count": len(df),
            "verses": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/verses/{verse_id}")
def get_verse(
    verse_id: str,
    translations: str = Query("kjv", description="Comma-separated translation IDs"),
) -> dict:
    """Get a specific verse in one or more translations."""
    conn = get_db()
    try:
        translation_list = [t.strip().lower() for t in translations.split(",")]
        placeholders = ", ".join(["?" for _ in translation_list])
        df = conn.execute(
            f"""
            SELECT verse_id, translation_id, language, text, reference,
                   word_count, sentiment_polarity, sentiment_label
            FROM verses
            WHERE verse_id = ? AND translation_id IN ({placeholders})
            ORDER BY translation_id
            """,
            [verse_id.upper()] + translation_list,
        ).fetchdf()

        if df.empty:
            raise HTTPException(status_code=404, detail=f"Verse {verse_id} not found")

        return {
            "verse_id": verse_id.upper(),
            "translations": df.to_dict(orient="records"),
        }
    finally:
        conn.close()
