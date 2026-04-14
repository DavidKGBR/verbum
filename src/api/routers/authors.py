"""
✍️ Authors Router
Serves biblical author metadata with computed vocabulary stats.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# Load static author data once at import time
_AUTHORS_PATH = Path(__file__).resolve().parents[3] / "data" / "static" / "authors.json"
_AUTHORS: list[dict] = []
if _AUTHORS_PATH.exists():
    _AUTHORS = json.loads(_AUTHORS_PATH.read_text(encoding="utf-8"))


@router.get("/authors")
def list_authors(
    testament: str | None = Query(None, description="Filter by testament: OT or NT"),
) -> dict:
    """List all biblical authors with their books and metadata."""
    results = _AUTHORS
    if testament:
        t = testament.upper().strip()
        results = [a for a in results if a.get("testament") == t]

    return {
        "count": len(results),
        "authors": results,
    }


@router.get("/authors/{author_id}")
def get_author(author_id: str) -> dict:
    """Get a single author by ID with computed vocabulary stats."""
    author = next((a for a in _AUTHORS if a["author_id"] == author_id), None)
    if not author:
        raise HTTPException(status_code=404, detail=f"Author '{author_id}' not found")

    # Compute vocabulary stats from interlinear data
    books = author.get("books", [])
    stats: dict = {}
    if books:
        placeholders = ", ".join(["?" for _ in books])
        conn = get_db()
        try:
            # Total unique Strong's IDs used across the author's books
            row = conn.execute(
                f"""
                SELECT
                    COUNT(DISTINCT i.strongs_id) AS unique_strongs,
                    COUNT(*) AS total_words,
                    COUNT(DISTINCT i.verse_id) AS total_verses
                FROM interlinear i
                WHERE SPLIT_PART(i.verse_id, '.', 1) IN ({placeholders})
                  AND i.strongs_id IS NOT NULL
                """,
                books,
            ).fetchone()
            if row:
                stats["unique_strongs"] = row[0]
                stats["total_words"] = row[1]
                stats["total_verses"] = row[2]

            # Top 10 most used Strong's IDs
            top_words = conn.execute(
                f"""
                SELECT
                    i.strongs_id,
                    i.gloss,
                    COUNT(*) AS occurrences
                FROM interlinear i
                WHERE SPLIT_PART(i.verse_id, '.', 1) IN ({placeholders})
                  AND i.strongs_id IS NOT NULL
                  AND i.gloss IS NOT NULL
                GROUP BY i.strongs_id, i.gloss
                ORDER BY occurrences DESC
                LIMIT 10
                """,
                books,
            ).fetchdf()
            stats["top_words"] = top_words.to_dict(orient="records")

        except Exception as e:
            logger.warning("Could not compute vocab stats for %s: %s", author_id, e)
        finally:
            conn.close()

    return {
        **author,
        "stats": stats,
    }


@router.get("/authors/{author_id}/books")
def get_author_books(author_id: str) -> dict:
    """Get book-level stats for an author's books."""
    author = next((a for a in _AUTHORS if a["author_id"] == author_id), None)
    if not author:
        raise HTTPException(status_code=404, detail=f"Author '{author_id}' not found")

    books = author.get("books", [])
    if not books:
        return {"author_id": author_id, "books": []}

    placeholders = ", ".join(["?" for _ in books])
    conn = get_db()
    try:
        df = conn.execute(
            f"""
            SELECT
                book_id, book_name, testament, category,
                total_chapters, total_verses, total_words,
                avg_words_per_verse, avg_sentiment
            FROM book_stats
            WHERE book_id IN ({placeholders})
              AND translation_id = 'kjv'
            ORDER BY book_position
            """,
            books,
        ).fetchdf()
        return {
            "author_id": author_id,
            "books": df.to_dict(orient="records"),
        }
    finally:
        conn.close()
