"""
Deep Analytics Router
Hapax legomena, author fingerprints, vocabulary density, and richness comparisons.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()

# Book-position order for consistent sorting
_BOOK_ORDER_SQL = """
    (SELECT MIN(book_position) FROM book_stats bs
     WHERE bs.book_id = sub.book_id AND bs.translation_id = 'kjv')
"""


@router.get("/analytics/hapax")
def get_hapax(
    book: str | None = Query(None, description="Filter by book ID (e.g. PSA, JHN)"),
    language: str | None = Query(None, description="Filter by language (hebrew, greek)"),
    limit: int = Query(100, ge=1, le=500, description="Max results"),
) -> dict:
    """Find hapax legomena — words appearing exactly once in the entire Bible."""
    conn = get_db()
    try:
        # Find Strong's IDs that appear exactly once across all interlinear data
        where_clauses: list[str] = []
        params: list[object] = []

        base_query = """
            WITH hapax AS (
                SELECT strongs_id, COUNT(*) AS total
                FROM interlinear
                WHERE strongs_id IS NOT NULL
                GROUP BY strongs_id
                HAVING COUNT(*) = 1
            )
            SELECT
                i.strongs_id,
                i.original_word,
                i.transliteration,
                i.gloss,
                i.lemma,
                i.language,
                i.verse_id,
                v.reference,
                v.text AS verse_text,
                v.book_id
            FROM hapax h
            JOIN interlinear i ON i.strongs_id = h.strongs_id
            LEFT JOIN verses v ON i.verse_id = v.verse_id AND v.translation_id = 'kjv'
        """

        if book:
            where_clauses.append("i.verse_id LIKE ?")
            params.append(f"{book.upper()}.%")
        if language:
            where_clauses.append("i.language = ?")
            params.append(language.lower())

        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)

        base_query += " ORDER BY v.book_position, v.chapter, v.verse"
        base_query += " LIMIT ?"
        params.append(limit)

        df = conn.execute(base_query, params).fetchdf()

        return {
            "total": len(df),
            "filters": {"book": book, "language": language},
            "results": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/analytics/fingerprint/{author_id}")
def get_author_fingerprint(
    author_id: str,
    top_n: int = Query(20, ge=5, le=100, description="Number of top words"),
) -> dict:
    """Get a lexical fingerprint for an author — top Strong's words, vocab stats."""
    conn = get_db()
    try:
        # Map author_id to their books via the static authors JSON
        from src.api.routers.authors import _AUTHORS

        author = next((a for a in _AUTHORS if a["author_id"] == author_id), None)
        if not author:
            raise HTTPException(status_code=404, detail=f"Author '{author_id}' not found")

        books = author["books"]
        if not books:
            return {
                "author_id": author_id,
                "author_name": author["name"],
                "books": [],
                "stats": {},
                "top_words": [],
            }

        book_ids = [b.upper() for b in books]

        # Get verse prefix patterns for these books
        like_clauses = " OR ".join("i.verse_id LIKE ?" for _ in book_ids)
        like_params = [f"{b}.%" for b in book_ids]

        # Vocabulary stats
        stats_df = conn.execute(
            f"""
            SELECT
                COUNT(DISTINCT i.strongs_id) AS unique_words,
                COUNT(*) AS total_words,
                COUNT(DISTINCT i.verse_id) AS total_verses,
                COUNT(DISTINCT SPLIT_PART(i.verse_id, '.', 1)) AS total_books
            FROM interlinear i
            WHERE i.strongs_id IS NOT NULL AND ({like_clauses})
            """,
            like_params,
        ).fetchdf()

        stats = stats_df.to_dict(orient="records")[0] if not stats_df.empty else {}

        # Top words by frequency
        top_df = conn.execute(
            f"""
            SELECT
                i.strongs_id,
                ANY_VALUE(i.original_word) AS original_word,
                ANY_VALUE(i.transliteration) AS transliteration,
                ANY_VALUE(i.gloss) AS gloss,
                ANY_VALUE(i.language) AS language,
                COUNT(*) AS frequency
            FROM interlinear i
            WHERE i.strongs_id IS NOT NULL AND ({like_clauses})
            GROUP BY i.strongs_id
            ORDER BY frequency DESC
            LIMIT ?
            """,
            [*like_params, top_n],
        ).fetchdf()

        # Hapax count for this author
        hapax_df = conn.execute(
            f"""
            SELECT COUNT(*) AS hapax_count
            FROM (
                SELECT i.strongs_id
                FROM interlinear i
                WHERE i.strongs_id IS NOT NULL AND ({like_clauses})
                GROUP BY i.strongs_id
                HAVING COUNT(*) = 1
            ) sub
            """,
            like_params,
        ).fetchdf()

        hapax_count = int(hapax_df.iloc[0]["hapax_count"]) if not hapax_df.empty else 0

        return {
            "author_id": author_id,
            "author_name": author["name"],
            "books": books,
            "stats": {
                **stats,
                "hapax_count": hapax_count,
                "vocab_richness": (
                    round(stats.get("unique_words", 0) / max(stats.get("total_words", 1), 1), 4)
                    if stats
                    else 0
                ),
            },
            "top_words": top_df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/analytics/density")
def get_vocabulary_density(
    book: str = Query(..., description="Book ID (e.g. PSA, JHN)"),
) -> dict:
    """Get vocabulary density per chapter — unique Strong's IDs per verse."""
    conn = get_db()
    try:
        book_upper = book.upper()
        df = conn.execute(
            """
            SELECT
                CAST(SPLIT_PART(verse_id, '.', 2) AS INTEGER) AS chapter,
                COUNT(DISTINCT strongs_id) AS unique_words,
                COUNT(*) AS total_words,
                COUNT(DISTINCT verse_id) AS verse_count,
                ROUND(COUNT(DISTINCT strongs_id)::DOUBLE / NULLIF(COUNT(DISTINCT verse_id), 0), 2)
                    AS density
            FROM interlinear
            WHERE verse_id LIKE ? AND strongs_id IS NOT NULL
            GROUP BY chapter
            ORDER BY chapter
            """,
            [f"{book_upper}.%"],
        ).fetchdf()

        if df.empty:
            raise HTTPException(status_code=404, detail=f"No interlinear data for {book_upper}")

        return {
            "book_id": book_upper,
            "chapters": df.to_dict(orient="records"),
        }
    finally:
        conn.close()


@router.get("/analytics/vocabulary-richness")
def get_vocabulary_richness(
    limit: int = Query(66, ge=1, le=66, description="Max books to return"),
) -> dict:
    """Compare vocabulary richness across Bible books (unique words / total words)."""
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT
                sub.book_id,
                ANY_VALUE(bs.book_name) AS book_name,
                ANY_VALUE(bs.testament) AS testament,
                ANY_VALUE(sub.unique_words) AS unique_words,
                ANY_VALUE(sub.total_words) AS total_words,
                ANY_VALUE(sub.verse_count) AS verse_count,
                ROUND(ANY_VALUE(sub.unique_words)::DOUBLE
                      / NULLIF(ANY_VALUE(sub.total_words), 0), 4) AS richness
            FROM (
                SELECT
                    SPLIT_PART(verse_id, '.', 1) AS book_id,
                    COUNT(DISTINCT strongs_id) AS unique_words,
                    COUNT(*) AS total_words,
                    COUNT(DISTINCT verse_id) AS verse_count
                FROM interlinear
                WHERE strongs_id IS NOT NULL
                GROUP BY 1
            ) sub
            LEFT JOIN book_stats bs
                ON sub.book_id = bs.book_id AND bs.translation_id = 'kjv'
            GROUP BY sub.book_id
            ORDER BY richness DESC
            LIMIT ?
            """,
            [limit],
        ).fetchdf()

        return {
            "total": len(df),
            "books": df.to_dict(orient="records"),
        }
    finally:
        conn.close()
