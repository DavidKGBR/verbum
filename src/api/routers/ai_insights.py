"""
🤖 AI Insights Router
Gemini-powered endpoints for passage explanation and translation comparison.
"""

from __future__ import annotations

import logging
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.api.dependencies import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


class ExplainRequest(BaseModel):
    verse_id: str = Field(..., description="Verse ID (e.g., 'GEN.1.1')")
    language: str = Field("en", description="Response language (en, pt-br, es)")
    style: str = Field("simple", description="Style: simple, academic, devotional")
    translation: str = Field("kjv", description="Translation ID for verse text")


class CompareRequest(BaseModel):
    verse_id: str = Field(..., description="Verse ID (e.g., 'GEN.1.1')")
    translations: list[str] = Field(..., description="Translation IDs to compare")
    language: str = Field("en", description="Response language")


def _get_explainer():  # type: ignore[no-untyped-def]
    """Lazy-load the explainer (requires GEMINI_API_KEY)."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Set GEMINI_API_KEY env var.",
        )

    from src.ai.gemini_client import GeminiClient
    from src.ai.passage_explainer import PassageExplainer
    from src.config import DATA_DIR

    cache_dir = DATA_DIR / "ai_cache"
    client = GeminiClient(api_key=api_key, cache_dir=cache_dir)
    return PassageExplainer(client)


@router.post("/ai/explain")
def explain_passage(req: ExplainRequest) -> dict:
    """Explain a Bible passage using Gemini AI (cache-first)."""
    explainer = _get_explainer()

    # Fetch verse text from DB
    conn = get_db()
    try:
        df = conn.execute(
            """
            SELECT text, reference, book_name, testament, category
            FROM verses
            WHERE verse_id = ? AND translation_id = ?
            LIMIT 1
            """,
            [req.verse_id.upper(), req.translation.lower()],
        ).fetchdf()
    finally:
        conn.close()

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Verse {req.verse_id} not found in {req.translation}",
        )

    row = df.iloc[0]
    return explainer.explain(
        verse_id=req.verse_id.upper(),
        text=row["text"],
        reference=row["reference"],
        book_name=row["book_name"],
        testament=row["testament"],
        category=row["category"],
        translation=req.translation,
        language=req.language,
        style=req.style,
    )


@router.post("/ai/compare")
def compare_translations(req: CompareRequest) -> dict:
    """Compare a verse across translations using Gemini AI (cache-first)."""
    explainer = _get_explainer()

    conn = get_db()
    try:
        placeholders = ", ".join(["?" for _ in req.translations])
        df = conn.execute(
            f"""
            SELECT translation_id, text, reference
            FROM verses
            WHERE verse_id = ? AND translation_id IN ({placeholders})
            """,
            [req.verse_id.upper()] + [t.lower() for t in req.translations],
        ).fetchdf()
    finally:
        conn.close()

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Verse {req.verse_id} not found",
        )

    translations_map = dict(zip(df["translation_id"], df["text"]))
    reference = df.iloc[0]["reference"]

    return explainer.compare_translations(
        verse_id=req.verse_id.upper(),
        translations=translations_map,
        reference=reference,
        language=req.language,
    )
