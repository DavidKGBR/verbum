"""
🧬 Semantic Genealogy Router
Rastreia a jornada de conceitos-chave do hebraico ao grego através dos testamentos.

Endpoints:
    GET /genealogy/concepts              → catálogo de todos os conceitos
    GET /genealogy/concepts/{concept_id} → conceito completo + stats do DB
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# Load curated concept journeys once at import time — one file per locale.
# IDs/strongs_ids/key_verses/types/colors/icons are mirrored across locales;
# only text fields (concept, tagline, gloss, note, narrative) differ.
_STATIC_DIR = Path(__file__).resolve().parents[3] / "data" / "static"
_GENEALOGY_FILES = {
    "en": _STATIC_DIR / "semantic_genealogy.json",
    "pt": _STATIC_DIR / "semantic_genealogy_pt.json",
    "es": _STATIC_DIR / "semantic_genealogy_es.json",
}

_CONCEPTS_BY_LOCALE: dict[str, list[dict]] = {}
for _locale, _path in _GENEALOGY_FILES.items():
    if _path.exists():
        _CONCEPTS_BY_LOCALE[_locale] = json.loads(_path.read_text(encoding="utf-8"))
    else:
        _CONCEPTS_BY_LOCALE[_locale] = []

# Fallback to EN if a locale file is missing/empty
_DEFAULT_CONCEPTS = _CONCEPTS_BY_LOCALE.get("en", [])
_CONCEPT_INDEX_BY_LOCALE: dict[str, dict[str, dict]] = {
    locale: {c["id"]: c for c in concepts}
    for locale, concepts in _CONCEPTS_BY_LOCALE.items()
}


def _concepts_for(locale: str) -> list[dict]:
    """Return concept list for the locale, falling back to EN when unknown."""
    return _CONCEPTS_BY_LOCALE.get(locale) or _DEFAULT_CONCEPTS


def _concept_index_for(locale: str) -> dict[str, dict]:
    """Return id→concept index for the locale, falling back to EN."""
    return _CONCEPT_INDEX_BY_LOCALE.get(locale) or _CONCEPT_INDEX_BY_LOCALE.get("en", {})


def _enrich_node(node: dict, db: object) -> dict:
    """Add occurrence count and top books from the interlinear table."""
    strongs_id = node.get("strongs_id", "")
    enriched = dict(node)

    try:
        # Occurrence count in interlinear
        count_row = db.execute(  # type: ignore[attr-defined]
            "SELECT COUNT(*) FROM interlinear WHERE strongs_id = ?",
            [strongs_id],
        ).fetchone()
        enriched["occurrence_count"] = int(count_row[0]) if count_row else 0

        # Top 5 books by frequency
        top_rows = db.execute(  # type: ignore[attr-defined]
            """
            SELECT SPLIT_PART(verse_id, '.', 1) AS book_id, COUNT(*) AS cnt
            FROM   interlinear
            WHERE  strongs_id = ?
            GROUP  BY book_id
            ORDER  BY cnt DESC
            LIMIT  5
            """,
            [strongs_id],
        ).fetchall()
        enriched["top_books"] = [{"book_id": r[0], "count": int(r[1])} for r in top_rows]

        # Short definition from lexicon (if present)
        lex_row = db.execute(  # type: ignore[attr-defined]
            "SELECT short_definition, transliteration, original "
            "FROM strongs_lexicon WHERE strongs_id = ?",
            [strongs_id],
        ).fetchone()
        if lex_row:
            enriched["short_definition"] = lex_row[0]
            enriched["lexicon_transliteration"] = lex_row[1]
            enriched["original_script"] = lex_row[2]

    except Exception as exc:
        logger.warning("Failed to enrich node %s: %s", strongs_id, exc)

    return enriched


@router.get("/genealogy/concepts")
def list_concepts(
    lang: str = Query("en", description="Locale: en | pt | es (fallback to en)"),
) -> dict:
    """List all available concepts in the semantic genealogy, localized."""
    concepts = _concepts_for(lang)
    # Also grab the EN catalog so we can expose `concept_en` alongside the
    # localized concept (used by the UI to show English title as a subtitle).
    en_index = _CONCEPT_INDEX_BY_LOCALE.get("en", {})
    summary = [
        {
            "id": c["id"],
            "concept": c["concept"],
            "concept_en": en_index.get(c["id"], {}).get("concept", c["concept"]),
            "tagline": c["tagline"],
            "color": c["color"],
            "icon": c["icon"],
            "node_count": len(c.get("nodes", [])),
            "strongs_ids": [n["strongs_id"] for n in c.get("nodes", [])],
        }
        for c in concepts
    ]
    return {"total": len(summary), "concepts": summary}


@router.get("/genealogy/concepts/{concept_id}")
def get_concept(
    concept_id: str,
    lang: str = Query("en", description="Locale: en | pt | es (fallback to en)"),
) -> dict:
    """Return a full concept with occurrence stats from the DB, localized.

    For each word (node), adds:
    - occurrence_count: total occurrences in the interlinear table
    - top_books: top 5 books by frequency
    - short_definition: short Strong's lexicon definition
    """
    index = _concept_index_for(lang)
    concept = index.get(concept_id)
    if not concept:
        available = list(index.keys())
        raise HTTPException(
            status_code=404,
            detail=f"Concept '{concept_id}' not found. Available: {available}",
        )

    db = get_db()
    try:
        enriched_nodes = [_enrich_node(n, db) for n in concept.get("nodes", [])]
        return {
            **concept,
            "nodes": enriched_nodes,
        }
    finally:
        db.close()
