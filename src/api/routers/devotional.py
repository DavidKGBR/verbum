"""
🙏 Devotional Router
Serves thematic devotional plans with daily readings and reflections.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# Load devotional plans per locale — same pattern as Semantic Genealogy.
# IDs/passages/days are mirrored across locales; only text fields (title,
# description, reading titles, reflections, original_term.meaning) differ.
_STATIC_DIR = Path(__file__).resolve().parents[3] / "data" / "static"
_PLAN_FILES = {
    "en": _STATIC_DIR / "devotional_plans.json",
    "pt": _STATIC_DIR / "devotional_plans_pt.json",
    "es": _STATIC_DIR / "devotional_plans_es.json",
}

_PLANS_BY_LOCALE: dict[str, list[dict]] = {}
for _locale, _path in _PLAN_FILES.items():
    if _path.exists():
        _PLANS_BY_LOCALE[_locale] = json.loads(_path.read_text(encoding="utf-8"))
    else:
        _PLANS_BY_LOCALE[_locale] = []

_DEFAULT_PLANS = _PLANS_BY_LOCALE.get("en", [])


def _plans_for(locale: str) -> list[dict]:
    """Return devotional plans for the locale, falling back to EN when unknown."""
    return _PLANS_BY_LOCALE.get(locale) or _DEFAULT_PLANS


def _parse_range(range_str: str) -> tuple[str, int, int, int, int] | None:
    """Parse 'PSA.23.1-PSA.23.6' → (book_id, ch_start, vs_start, ch_end, vs_end)."""
    parts = range_str.split("-")
    if len(parts) != 2:
        return None
    try:
        s = parts[0].split(".")
        e = parts[1].split(".")
        if len(s) != 3 or len(e) != 3:
            return None
        return (s[0], int(s[1]), int(s[2]), int(e[1]), int(e[2]))
    except (ValueError, IndexError):
        return None


@router.get("/devotional/plans")
def list_plans(
    lang: str = Query("en", description="Locale: en | pt | es (fallback to en)"),
) -> dict:
    """List all available devotional plans, localized."""
    plans = _plans_for(lang)
    return {
        "count": len(plans),
        "plans": [
            {
                "id": p["id"],
                "title": p["title"],
                "description": p["description"],
                "days": p["days"],
            }
            for p in plans
        ],
    }


@router.get("/devotional/plans/{plan_id}")
def get_plan(
    plan_id: str,
    lang: str = Query("en", description="Locale: en | pt | es (fallback to en)"),
) -> dict:
    """Get a devotional plan with all daily readings (no verse text), localized."""
    plans = _plans_for(lang)
    plan = next((p for p in plans if p["id"] == plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan '{plan_id}' not found")
    return plan


@router.get("/devotional/plans/{plan_id}/day/{day}")
def get_day_reading(
    plan_id: str,
    day: int,
    translation: str = Query("kjv", description="Translation ID"),
    lang: str = Query("en", description="Locale: en | pt | es (fallback to en)"),
) -> dict:
    """Get a specific day's reading with full verse texts, localized."""
    plans = _plans_for(lang)
    plan = next((p for p in plans if p["id"] == plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan '{plan_id}' not found")

    reading = next((r for r in plan["readings"] if r["day"] == day), None)
    if not reading:
        raise HTTPException(
            status_code=404,
            detail=f"Day {day} not found in plan '{plan_id}'",
        )

    # Fetch verse texts. Single-chapter ranges need separate query —
    # the 3-branch OR returns the entire chapter when ch_start == ch_end.
    parsed = _parse_range(reading["passage"])
    verses: list[dict] = []
    if parsed:
        book_id, ch_start, vs_start, ch_end, vs_end = parsed
        conn = get_db()
        try:
            if ch_start == ch_end:
                df = conn.execute(
                    """
                    SELECT verse_id, book_name, chapter, verse, text, reference
                    FROM verses
                    WHERE book_id = ?
                      AND translation_id = ?
                      AND chapter = ?
                      AND verse >= ?
                      AND verse <= ?
                    ORDER BY verse
                    """,
                    [book_id, translation, ch_start, vs_start, vs_end],
                ).fetchdf()
            else:
                df = conn.execute(
                    """
                    SELECT verse_id, book_name, chapter, verse, text, reference
                    FROM verses
                    WHERE book_id = ?
                      AND translation_id = ?
                      AND (
                        (chapter = ? AND verse >= ?)
                        OR (chapter > ? AND chapter < ?)
                        OR (chapter = ? AND verse <= ?)
                      )
                    ORDER BY chapter, verse
                    """,
                    [
                        book_id,
                        translation,
                        ch_start,
                        vs_start,
                        ch_start,
                        ch_end,
                        ch_end,
                        vs_end,
                    ],
                ).fetchdf()
            verses = df.to_dict(orient="records")
        finally:
            conn.close()

    return {
        "plan_id": plan_id,
        "plan_title": plan["title"],
        "translation": translation,
        **reading,
        "verses": verses,
    }
