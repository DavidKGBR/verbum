"""
Open Questions Router
Curated catalog of unresolved scholarly questions about the Bible.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()
logger = logging.getLogger(__name__)

# Load static questions once at import time
_QUESTIONS_PATH = Path(__file__).resolve().parents[3] / "data" / "static" / "open_questions.json"
_QUESTIONS: list[dict] = []
if _QUESTIONS_PATH.exists():
    _QUESTIONS = json.loads(_QUESTIONS_PATH.read_text(encoding="utf-8"))

# Build index for verse lookup
_VERSE_INDEX: dict[str, list[str]] = {}
for _q in _QUESTIONS:
    for _vref in _q.get("verse_refs", []):
        _VERSE_INDEX.setdefault(_vref, []).append(_q["id"])


@router.get("/open-questions")
def list_questions(
    category: str | None = Query(None, description="Filter by category"),
    limit: int = Query(50, ge=1, le=200, description="Max results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
) -> dict:
    """List curated open questions, optionally filtered by category."""
    filtered = _QUESTIONS
    if category:
        cat_lower = category.lower()
        filtered = [q for q in filtered if q.get("category", "").lower() == cat_lower]

    total = len(filtered)
    page = filtered[offset : offset + limit]

    categories = sorted({q.get("category", "") for q in _QUESTIONS if q.get("category")})

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "categories": categories,
        "results": [
            {
                "id": q["id"],
                "title": q["title"],
                "category": q.get("category", ""),
                "difficulty": q.get("difficulty", ""),
                "verse_refs": q.get("verse_refs", []),
            }
            for q in page
        ],
    }


@router.get("/open-questions/{question_id}")
def get_question(question_id: str) -> dict:
    """Get a specific open question with full detail."""
    question = next((q for q in _QUESTIONS if q["id"] == question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail=f"Question '{question_id}' not found")
    return question


@router.get("/open-questions/for-verse/{verse_id}")
def get_questions_for_verse(verse_id: str) -> dict:
    """Find open questions related to a specific verse."""
    vid = verse_id.upper()
    question_ids = _VERSE_INDEX.get(vid, [])
    questions = [q for q in _QUESTIONS if q["id"] in question_ids]

    return {
        "verse_id": vid,
        "count": len(questions),
        "questions": [
            {
                "id": q["id"],
                "title": q["title"],
                "category": q.get("category", ""),
            }
            for q in questions
        ],
    }
