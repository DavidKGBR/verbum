"""
📖 Reader Router
Endpoints optimized for the Bible Reader UI — chapter reading and parallel view.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db
from src.transform.kjv_annotations import strip_kjv_annotations

router = APIRouter()


def _clean_for(translation: str, text: str) -> str:
    """Return reader-friendly text — strips KJV braces, no-op for others."""
    if translation == "kjv":
        return strip_kjv_annotations(text)
    return text


@router.get("/reader/page")
def reader_page(
    book: str = Query("GEN", description="Book ID (e.g., GEN, PSA, JHN)"),
    chapter: int = Query(1, ge=1, description="Chapter number"),
    translation: str = Query("kjv", description="Translation ID"),
) -> dict:
    """Get a chapter page for the Bible Reader UI."""
    conn = get_db()
    try:
        book_upper = book.upper()
        translation_lower = translation.lower()

        # Get verses for this chapter
        verses_df = conn.execute(
            """
            SELECT verse, text, reference, verse_id,
                   word_count, sentiment_polarity, sentiment_label
            FROM verses
            WHERE book_id = ? AND chapter = ? AND translation_id = ?
            ORDER BY verse
            """,
            [book_upper, chapter, translation_lower],
        ).fetchdf()

        if verses_df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data for {book_upper} chapter {chapter} ({translation})",
            )

        # Get book metadata
        book_row = conn.execute(
            """
            SELECT book_name, testament, category, book_position,
                   total_chapters
            FROM book_stats
            WHERE book_id = ? AND translation_id = ?
            LIMIT 1
            """,
            [book_upper, translation_lower],
        ).fetchdf()

        book_name = book_row.iloc[0]["book_name"] if not book_row.empty else book_upper
        testament = book_row.iloc[0]["testament"] if not book_row.empty else ""
        category = book_row.iloc[0]["category"] if not book_row.empty else ""
        total_chapters = int(book_row.iloc[0]["total_chapters"]) if not book_row.empty else 1

        verses = verses_df.to_dict(orient="records")
        for v in verses:
            v["text_clean"] = _clean_for(translation_lower, v["text"])

        return {
            "book_id": book_upper,
            "book_name": book_name,
            "chapter": chapter,
            "translation": translation_lower,
            "testament": testament,
            "category": category,
            "total_chapters": total_chapters,
            "verse_count": len(verses_df),
            "has_previous": chapter > 1,
            "has_next": chapter < total_chapters,
            "verses": verses,
        }
    finally:
        conn.close()


@router.get("/reader/parallel")
def reader_parallel(
    book: str = Query("GEN", description="Book ID"),
    chapter: int = Query(1, ge=1, description="Chapter number"),
    left: str = Query("kjv", description="Left translation ID"),
    right: str = Query("nvi", description="Right translation ID"),
) -> dict:
    """Get a chapter in two translations for parallel reading."""
    conn = get_db()
    try:
        book_upper = book.upper()

        left_df = conn.execute(
            """
            SELECT verse, text, sentiment_polarity, sentiment_label
            FROM verses
            WHERE book_id = ? AND chapter = ? AND translation_id = ?
            ORDER BY verse
            """,
            [book_upper, chapter, left.lower()],
        ).fetchdf()

        right_df = conn.execute(
            """
            SELECT verse, text, sentiment_polarity, sentiment_label
            FROM verses
            WHERE book_id = ? AND chapter = ? AND translation_id = ?
            ORDER BY verse
            """,
            [book_upper, chapter, right.lower()],
        ).fetchdf()

        if left_df.empty and right_df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data for {book_upper} chapter {chapter}",
            )

        # Get book name + total chapters
        book_row = conn.execute(
            """
            SELECT book_name, total_chapters
            FROM book_stats
            WHERE book_id = ? AND translation_id = ?
            LIMIT 1
            """,
            [book_upper, left.lower()],
        ).fetchdf()
        if book_row.empty:
            book_row = conn.execute(
                "SELECT DISTINCT book_name FROM verses WHERE book_id = ? LIMIT 1",
                [book_upper],
            ).fetchdf()
        book_name = book_row.iloc[0]["book_name"] if not book_row.empty else book_upper
        has_tc = not book_row.empty and "total_chapters" in book_row.columns
        total_chapters = int(book_row.iloc[0]["total_chapters"]) if has_tc else 150

        # Align by verse number
        all_verses = sorted(set(left_df["verse"].tolist() + right_df["verse"].tolist()))

        left_map = {r["verse"]: r for _, r in left_df.iterrows()}
        right_map = {r["verse"]: r for _, r in right_df.iterrows()}

        left_key = left.lower()
        right_key = right.lower()
        aligned = []
        for v in all_verses:
            l_row = left_map.get(v)
            r_row = right_map.get(v)
            l_text = l_row["text"] if l_row is not None else None
            r_text = r_row["text"] if r_row is not None else None
            aligned.append(
                {
                    "verse": v,
                    "left_text": l_text,
                    "right_text": r_text,
                    "left_text_clean": (
                        _clean_for(left_key, l_text) if l_text is not None else None
                    ),
                    "right_text_clean": (
                        _clean_for(right_key, r_text) if r_text is not None else None
                    ),
                    "left_sentiment": l_row["sentiment_label"] if l_row is not None else None,
                    "right_sentiment": r_row["sentiment_label"] if r_row is not None else None,
                }
            )

        return {
            "book_id": book_upper,
            "book_name": book_name,
            "chapter": chapter,
            "total_chapters": total_chapters,
            "left_translation": left.lower(),
            "right_translation": right.lower(),
            "verse_count": len(aligned),
            "has_previous": chapter > 1,
            "has_next": chapter < total_chapters,
            "verses": aligned,
        }
    finally:
        conn.close()
