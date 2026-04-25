"""
Semantic Threads Router — The Crown Jewel
Discovers hidden thematic threads that span distant books by analyzing
shared semantic tags in the interlinear data.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()


@router.get("/threads")
def list_threads(
    min_books: int = Query(3, ge=2, le=20, description="Minimum books a thread spans"),
    min_verses: int = Query(5, ge=2, le=100, description="Minimum verses in thread"),
    limit: int = Query(50, ge=1, le=200, description="Max threads to return"),
) -> dict:
    """Discover semantic threads — groups of verses sharing rare semantic tags across books."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            WITH tag_stats AS (
                SELECT
                    semantic_tag,
                    COUNT(DISTINCT verse_id) AS verse_count,
                    COUNT(DISTINCT SPLIT_PART(verse_id, '.', 1)) AS book_count,
                    COUNT(*) AS word_count
                FROM interlinear
                WHERE semantic_tag IS NOT NULL AND semantic_tag != ''
                GROUP BY semantic_tag
                HAVING
                    COUNT(DISTINCT SPLIT_PART(verse_id, '.', 1)) >= ?
                    AND COUNT(DISTINCT verse_id) >= ?
            )
            SELECT
                ts.semantic_tag,
                ts.verse_count,
                ts.book_count,
                ts.word_count,
                ROUND(
                    ts.book_count::DOUBLE / NULLIF(LN(ts.word_count + 1), 0),
                    4
                ) AS strength_score
            FROM tag_stats ts
            ORDER BY strength_score DESC, book_count DESC
            LIMIT ?
            """,
            [min_books, min_verses, limit],
        ).fetchdf()

        threads = []
        for _, row in df.iterrows():
            tag = row["semantic_tag"]
            threads.append(
                {
                    "id": tag.lower().replace(" ", "-").replace("/", "-"),
                    "semantic_tag": tag,
                    "verse_count": int(row["verse_count"]),
                    "book_count": int(row["book_count"]),
                    "word_count": int(row["word_count"]),
                    "strength_score": float(row["strength_score"]),
                }
            )

        return {
            "total": len(threads),
            "filters": {"min_books": min_books, "min_verses": min_verses},
            "threads": threads,
        }
    finally:
        conn.close()


# Static path MUST come before /{thread_id} dynamic
@router.get("/threads/discover")
def discover_thread(
    tag: str = Query(..., description="Semantic tag to search for"),
    min_books: int = Query(2, ge=1, le=20, description="Minimum books"),
) -> dict:
    """Discover a specific thread by semantic tag search."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT
                semantic_tag,
                COUNT(DISTINCT verse_id) AS verse_count,
                COUNT(DISTINCT SPLIT_PART(verse_id, '.', 1)) AS book_count,
                COUNT(*) AS word_count
            FROM interlinear
            WHERE semantic_tag ILIKE ?
              AND semantic_tag IS NOT NULL
            GROUP BY semantic_tag
            HAVING COUNT(DISTINCT SPLIT_PART(verse_id, '.', 1)) >= ?
            ORDER BY book_count DESC, verse_count DESC
            LIMIT 20
            """,
            [f"%{tag}%", min_books],
        ).fetchdf()

        return {
            "query": tag,
            "total": len(df),
            "threads": [
                {
                    "id": row["semantic_tag"].lower().replace(" ", "-").replace("/", "-"),
                    "semantic_tag": row["semantic_tag"],
                    "verse_count": int(row["verse_count"]),
                    "book_count": int(row["book_count"]),
                    "word_count": int(row["word_count"]),
                }
                for _, row in df.iterrows()
            ],
        }
    finally:
        conn.close()


@router.get("/threads/{thread_id}")
def get_thread(
    thread_id: str,
    translation: str = Query("kjv", description="Translation for verse preview"),
    limit: int = Query(100, ge=1, le=500, description="Max verses to return"),
) -> dict:
    """Get full verse chain for a semantic thread."""
    conn = get_db()
    try:
        tag_pattern = thread_id.replace("-", " ")

        df = conn.execute(
            """
            SELECT DISTINCT
                i.verse_id,
                i.semantic_tag,
                i.original_word,
                i.transliteration,
                i.gloss,
                i.strongs_id,
                SPLIT_PART(i.verse_id, '.', 1) AS book_id,
                v.reference,
                v.text AS verse_text,
                v.book_name,
                v.chapter,
                v.verse,
                v.book_position
            FROM interlinear i
            LEFT JOIN verses v ON i.verse_id = v.verse_id AND v.translation_id = ?
            WHERE i.semantic_tag ILIKE ?
            ORDER BY v.book_position, v.chapter, v.verse
            LIMIT ?
            """,
            [translation, f"%{tag_pattern}%", limit],
        ).fetchdf()

        if df.empty:
            raise HTTPException(status_code=404, detail=f"Thread '{thread_id}' not found")

        # Group by book for a nice summary
        books: dict[str, int] = {}
        for _, row in df.iterrows():
            bid = row["book_id"]
            books[bid] = books.get(bid, 0) + 1

        return {
            "id": thread_id,
            "semantic_tag": df.iloc[0]["semantic_tag"],
            "total_verses": len(df),
            "book_count": len(books),
            "books": [
                {"book_id": bid, "count": count}
                for bid, count in sorted(books.items(), key=lambda x: -x[1])
            ],
            "verses": df.to_dict(orient="records"),
        }
    finally:
        conn.close()
