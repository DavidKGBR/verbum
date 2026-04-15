"""
✝️ Special Passages Router
Passagens curadas com múltiplas camadas de língua simultâneas.
Aramaico (Peshitta) + Grego (SBLGNT) + Português + Inglês.

Endpoints:
    GET /special-passages/catalog
    GET /special-passages/{passage_id}?translation=nvi&translation_en=kjv
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from src.api.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

_STATIC = Path(__file__).resolve().parents[3] / "data" / "static"

# Catalog loaded once at import time
_CATALOG_PATH = _STATIC / "special_passages_catalog.json"
_CATALOG: dict = {"passages": []}
if _CATALOG_PATH.exists():
    _CATALOG = json.loads(_CATALOG_PATH.read_text(encoding="utf-8"))

# Passage verse refs — kept here for lookup (expand as new passages added)
_PASSAGE_VERSES: dict[str, dict[str, object]] = {
    "lords_prayer": {
        "book_id": "MAT",
        "chapter": 6,
        "verse_start": 9,
        "verse_end": 13,
    }
}

# Translation fallback map: if requested translation is unavailable, use this
_PT_TRANSLATIONS = {"nvi", "ra", "acf"}
_EN_TRANSLATIONS = {"kjv", "bbe", "asv", "web", "darby"}


def _pick_translation(requested: str, available: set[str], fallback: str) -> str:
    return requested if requested in available else fallback


@router.get("/special-passages/catalog")
def get_catalog() -> dict:
    """Lista todas as passagens especiais disponíveis."""
    return _CATALOG


@router.get("/special-passages/{passage_id}")
def get_special_passage(
    passage_id: str,
    translation: str = Query("nvi", description="Tradução portuguesa (nvi, ra, acf)"),
    translation_en: str = Query("kjv", description="Tradução inglesa (kjv, bbe, asv, web, darby)"),
) -> dict:
    """
    Retorna uma passagem especial com todas as camadas de língua.

    Camadas:
    - aramaic: texto Peshitta palavra por palavra (da tabela aramaic_verses)
    - greek:   texto SBLGNT palavra por palavra (da tabela interlinear)
    - portuguese: texto de tradução portuguesa verso a verso
    - english: texto de tradução inglesa verso a verso
    """
    if passage_id not in _PASSAGE_VERSES:
        raise HTTPException(status_code=404, detail=f"Passagem '{passage_id}' não encontrada")

    meta_list = [p for p in _CATALOG.get("passages", []) if p["id"] == passage_id]
    meta = meta_list[0] if meta_list else {}

    info = _PASSAGE_VERSES[passage_id]
    book_id: str = info["book_id"]  # type: ignore[assignment]
    chapter: int = info["chapter"]  # type: ignore[assignment]
    v_start: int = info["verse_start"]  # type: ignore[assignment]
    v_end: int = info["verse_end"]  # type: ignore[assignment]

    pt_trans = _pick_translation(translation, _PT_TRANSLATIONS, "nvi")
    en_trans = _pick_translation(translation_en, _EN_TRANSLATIONS, "kjv")

    db = get_db()

    # ── Camada Aramaica (Peshitta, palavra por palavra) ───────────────────────
    aramaic_rows = db.execute(
        """
        SELECT verse_ref, verse_number, word_position, script,
               transliteration, gloss, audio_url
        FROM   aramaic_verses
        WHERE  passage_id = ?
        ORDER  BY verse_number, word_position
        """,
        [passage_id],
    ).fetchall()

    aramaic_verses: dict[str, dict] = {}
    for row in aramaic_rows:
        vref, vnum, wpos, script, translit, gloss, audio_url = row
        if vref not in aramaic_verses:
            aramaic_verses[vref] = {"verse_ref": vref, "verse_number": vnum, "words": []}
        aramaic_verses[vref]["words"].append({
            "word_position": wpos,
            "script": script,
            "transliteration": translit,
            "gloss": gloss,
            "audio_url": audio_url,
            "strongs_id": None,
        })

    # ── Camada Grega (SBLGNT, palavra por palavra via interlinear) ────────────
    verse_ids = [f"{book_id}.{chapter}.{v}" for v in range(v_start, v_end + 1)]
    placeholders = ", ".join(["?" for _ in verse_ids])
    greek_rows = db.execute(
        f"""
        SELECT verse_id, word_position, original_word, transliteration,
               gloss, strongs_id
        FROM   interlinear
        WHERE  verse_id IN ({placeholders})
          AND  language = 'greek'
        ORDER  BY verse_id, word_position
        """,
        verse_ids,
    ).fetchall()

    greek_verses: dict[str, dict] = {}
    for row in greek_rows:
        vref, wpos, script, translit, gloss, strongs_id = row
        vnum = int(vref.split(".")[-1])
        if vref not in greek_verses:
            greek_verses[vref] = {"verse_ref": vref, "verse_number": vnum, "words": []}
        greek_verses[vref]["words"].append({
            "word_position": wpos,
            "script": script,
            "transliteration": translit,
            "gloss": gloss,
            "audio_url": None,   # AudioButton will resolve via /strongs endpoint
            "strongs_id": strongs_id,
        })

    # ── Camada Moderna: Português e Inglês (verso a verso) ───────────────────
    modern_rows = db.execute(
        """
        SELECT translation_id, verse, text
        FROM   verses
        WHERE  book_id       = ?
          AND  chapter       = ?
          AND  verse BETWEEN ? AND ?
          AND  translation_id IN (?, ?)
        ORDER  BY translation_id, verse
        """,
        [book_id, chapter, v_start, v_end, pt_trans, en_trans],
    ).fetchall()

    pt_verses: list[dict] = []
    en_verses: list[dict] = []
    for row in modern_rows:
        trans_id, vnum, text = row
        vref = f"{book_id}.{chapter}.{vnum}"
        entry = {"verse_ref": vref, "verse_number": vnum, "full_text": text}
        if trans_id == pt_trans:
            pt_verses.append(entry)
        else:
            en_verses.append(entry)

    db.close()

    # ── Monta a response ───────────────────────────────────────────────────────
    layer_notes = meta.get("layer_notes", {})

    # Sort verses by verse_number (not by verse_id string, which is lexicographic)
    aramaic_sorted = sorted(aramaic_verses.values(), key=lambda v: v["verse_number"])
    greek_sorted = sorted(greek_verses.values(), key=lambda v: v["verse_number"])
    pt_sorted = sorted(pt_verses, key=lambda v: v["verse_number"])
    en_sorted = sorted(en_verses, key=lambda v: v["verse_number"])

    return {
        "id": passage_id,
        "title": meta.get("title", passage_id),
        "title_en": meta.get("title_en", ""),
        "reference": meta.get("reference", ""),
        "translation": pt_trans,
        "translation_en": en_trans,
        "layers": {
            "aramaic": {
                "label": "Aramaico (Peshitta)",
                "language_code": "arc",
                "direction": "rtl",
                "source": "Peshitta",
                "audio_note": "Áudio em desenvolvimento — Camada 2",
                "verse_count": len(aramaic_sorted),
                "verses": aramaic_sorted,
            },
            "greek": {
                "label": "Grego Koiné (SBLGNT)",
                "language_code": "el",
                "direction": "ltr",
                "source": "SBLGNT",
                "audio_note": None,
                "verse_count": len(greek_sorted),
                "verses": greek_sorted,
            },
            "portuguese": {
                "label": f"Português ({pt_trans.upper()})",
                "language_code": "pt",
                "direction": "ltr",
                "source": pt_trans,
                "audio_note": None,
                "verse_count": len(pt_sorted),
                "verses": pt_sorted,
            },
            "english": {
                "label": f"English ({en_trans.upper()})",
                "language_code": "en",
                "direction": "ltr",
                "source": en_trans,
                "audio_note": None,
                "verse_count": len(en_sorted),
                "verses": en_sorted,
            },
        },
    }
