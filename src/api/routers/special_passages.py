"""
✝️ Special Passages Router
Passagens curadas com múltiplas camadas de língua simultâneas.

Camadas disponíveis:
  - aramaic:    Peshitta palavra a palavra (da tabela aramaic_verses)
  - hebrew:     WLC palavra a palavra (da tabela interlinear, language='hebrew')
  - greek:      SBLGNT palavra a palavra (da tabela interlinear, language='greek')
  - portuguese: tradução portuguesa verso a verso (da tabela verses)
  - english:    tradução inglesa verso a verso (da tabela verses)

Cada passagem declara quais camadas possui em _PASSAGE_VERSES.
O catálogo é servido diretamente do JSON estático.

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

# ── Passage registry ──────────────────────────────────────────────────────────
# Each entry declares:
#   book_id, chapter, verse_start, verse_end
#   original_language: "greek" | "hebrew"   → which interlinear layer to pull
#   has_aramaic: bool                         → whether aramaic_verses has data
_PASSAGE_VERSES: dict[str, dict[str, object]] = {
    "lords_prayer": {
        "book_id": "MAT",
        "chapter": 6,
        "verse_start": 9,
        "verse_end": 13,
        "original_language": "greek",
        "has_aramaic": True,
    },
    "john_1": {
        "book_id": "JHN",
        "chapter": 1,
        "verse_start": 1,
        "verse_end": 5,
        "original_language": "greek",
        "has_aramaic": True,
    },
    "genesis_1": {
        "book_id": "GEN",
        "chapter": 1,
        "verse_start": 1,
        "verse_end": 5,
        "original_language": "hebrew",
        "has_aramaic": False,
    },
    "psalm_23": {
        "book_id": "PSA",
        "chapter": 23,
        "verse_start": 1,
        "verse_end": 6,
        "original_language": "hebrew",
        "has_aramaic": False,
    },
    "isaiah_53": {
        "book_id": "ISA",
        "chapter": 53,
        "verse_start": 1,
        "verse_end": 6,
        "original_language": "hebrew",
        "has_aramaic": False,
    },
    "romans_8": {
        "book_id": "ROM",
        "chapter": 8,
        "verse_start": 35,
        "verse_end": 39,
        "original_language": "greek",
        "has_aramaic": False,
    },
    "corinthians_13": {
        "book_id": "1CO",
        "chapter": 13,
        "verse_start": 1,
        "verse_end": 13,
        "original_language": "greek",
        "has_aramaic": False,
    },
    "revelation_1": {
        "book_id": "REV",
        "chapter": 1,
        "verse_start": 4,
        "verse_end": 8,
        "original_language": "greek",
        "has_aramaic": False,
    },
    "proverbs_8": {
        "book_id": "PRO",
        "chapter": 8,
        "verse_start": 22,
        "verse_end": 31,
        "original_language": "hebrew",
        "has_aramaic": False,
    },
    "beatitudes": {
        "book_id": "MAT",
        "chapter": 5,
        "verse_start": 3,
        "verse_end": 12,
        "original_language": "greek",
        "has_aramaic": False,
    },
}

# Translation sets — vernacular slot accepts both Portuguese and Spanish.
# When Spanish is selected the layer label reflects it ("Español (RVR)").
_PT_TRANSLATIONS = {"nvi", "ra", "acf"}
_ES_TRANSLATIONS = {"rvr"}
_VERNACULAR_TRANSLATIONS = _PT_TRANSLATIONS | _ES_TRANSLATIONS
_EN_TRANSLATIONS = {"kjv", "bbe", "asv", "web", "darby"}


def _pick_translation(requested: str, available: set[str], fallback: str) -> str:
    return requested if requested in available else fallback


def _audio_url_for(strongs_id: str | None, language: str) -> str | None:
    """Return the pre-recorded Chirp3-HD MP3 URL for a given Strong's ID.

    Files live at  data/audio/{language}/{strongs_id}.mp3
    and are served by FastAPI's StaticFiles mount at  /audio/...
    """
    if not strongs_id:
        return None
    folder = "hebrew" if language == "hebrew" else "greek"
    return f"/audio/{folder}/{strongs_id}.mp3"


def _clean_script(text: str | None) -> str | None:
    """Remove STEPBible morpheme separators (/) from interlinear script text.

    STEPBible WLC / SBLGNT encode morpheme boundaries with forward-slash, e.g.
    "בְּ/רֵאשִׁית" or "δια/κονος".  Stripping the slash yields the correct
    continuous script as it appears in the manuscript, which is what we want
    to display in the word-tile UI.
    """
    if not text:
        return text
    return text.replace("/", "")


# ── Layer metadata by language ─────────────────────────────────────────────────
_LAYER_META: dict[str, dict[str, str | None]] = {
    "aramaic": {
        "label": "Aramaico (Peshitta)",
        "language_code": "arc",
        "direction": "rtl",
        "source": "Peshitta",
        "audio_note": None,
    },
    "hebrew": {
        "label": "Hebraico (WLC)",
        "language_code": "he",
        "direction": "rtl",
        "source": "WLC",
        "audio_note": None,
    },
    "greek": {
        "label": "Grego Koiné (SBLGNT)",
        "language_code": "el",
        "direction": "ltr",
        "source": "SBLGNT",
        "audio_note": None,
    },
}


@router.get("/special-passages/catalog")
def get_catalog() -> dict:
    """Lista todas as passagens especiais disponíveis."""
    return _CATALOG


@router.get("/special-passages/{passage_id}")
def get_special_passage(
    passage_id: str,
    translation: str = Query("nvi", description="Tradução moderna (nvi, ra, acf, rvr)"),
    translation_en: str = Query("kjv", description="Tradução inglesa (kjv, bbe, asv, web, darby)"),
) -> dict:
    """
    Retorna uma passagem especial com as camadas de língua disponíveis.

    NT (lords_prayer, john_1):  aramaic + greek + portuguese + english
    AT (genesis_1, psalm_23):   hebrew + portuguese + english
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
    orig_lang: str = info["original_language"]  # type: ignore[assignment]
    has_aramaic: bool = info["has_aramaic"]  # type: ignore[assignment]

    pt_trans = _pick_translation(translation, _VERNACULAR_TRANSLATIONS, "nvi")
    pt_is_spanish = pt_trans in _ES_TRANSLATIONS
    en_trans = _pick_translation(translation_en, _EN_TRANSLATIONS, "kjv")

    db = get_db()
    layers: dict[str, dict] = {}

    # ── Camada Aramaica (Peshitta, opcional) ─────────────────────────────────
    if has_aramaic:
        aramaic_rows = db.execute(
            """
            SELECT verse_ref, verse_number, word_position, script,
                   transliteration, gloss, gloss_pt, gloss_es, audio_url
            FROM   aramaic_verses
            WHERE  passage_id = ?
            ORDER  BY verse_number, word_position
            """,
            [passage_id],
        ).fetchall()

        aramaic_verses: dict[str, dict] = {}
        for row in aramaic_rows:
            vref, vnum, wpos, script, translit, gloss, gloss_pt, gloss_es, audio_url = row
            if vref not in aramaic_verses:
                aramaic_verses[vref] = {"verse_ref": vref, "verse_number": vnum, "words": []}
            aramaic_verses[vref]["words"].append(
                {
                    "word_position": wpos,
                    "script": script,
                    "transliteration": translit,
                    "gloss": gloss,
                    "gloss_pt": gloss_pt,
                    "gloss_es": gloss_es,
                    "audio_url": audio_url,
                    "strongs_id": None,
                }
            )

        aramaic_sorted = sorted(aramaic_verses.values(), key=lambda v: v["verse_number"])
        m = _LAYER_META["aramaic"]
        layers["aramaic"] = {
            "label": m["label"],
            "language_code": m["language_code"],
            "direction": m["direction"],
            "source": m["source"],
            "audio_note": m["audio_note"],
            "verse_count": len(aramaic_sorted),
            "verses": aramaic_sorted,
        }

    # ── Camada Original (Grego ou Hebraico, via interlinear) ─────────────────
    verse_ids = [f"{book_id}.{chapter}.{v}" for v in range(v_start, v_end + 1)]
    placeholders = ", ".join(["?" for _ in verse_ids])
    orig_rows = db.execute(
        f"""
        SELECT verse_id, word_position, original_word, transliteration,
               gloss, strongs_id
        FROM   interlinear
        WHERE  verse_id IN ({placeholders})
          AND  language = ?
        ORDER  BY verse_id, word_position
        """,
        verse_ids + [orig_lang],
    ).fetchall()

    orig_verses: dict[str, dict] = {}
    for row in orig_rows:
        vref, wpos, script, translit, gloss, strongs_id = row
        vnum = int(vref.split(".")[-1])
        if vref not in orig_verses:
            orig_verses[vref] = {"verse_ref": vref, "verse_number": vnum, "words": []}
        orig_verses[vref]["words"].append(
            {
                "word_position": wpos,
                "script": _clean_script(script),
                "transliteration": translit,
                "gloss": gloss,
                "audio_url": _audio_url_for(strongs_id, orig_lang),
                "strongs_id": strongs_id,
            }
        )

    orig_sorted = sorted(orig_verses.values(), key=lambda v: v["verse_number"])
    m = _LAYER_META[orig_lang]
    layers[orig_lang] = {
        "label": m["label"],
        "language_code": m["language_code"],
        "direction": m["direction"],
        "source": m["source"],
        "audio_note": m["audio_note"],
        "verse_count": len(orig_sorted),
        "verses": orig_sorted,
    }

    # ── Camadas Modernas: Português e Inglês ──────────────────────────────────
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

    pt_sorted = sorted(pt_verses, key=lambda v: v["verse_number"])
    en_sorted = sorted(en_verses, key=lambda v: v["verse_number"])

    layers["portuguese"] = {
        "label": (
            f"Español ({pt_trans.upper()})"
            if pt_is_spanish
            else f"Português ({pt_trans.upper()})"
        ),
        "language_code": "es" if pt_is_spanish else "pt",
        "direction": "ltr",
        "source": pt_trans,
        "audio_note": None,
        "verse_count": len(pt_sorted),
        "verses": pt_sorted,
    }
    layers["english"] = {
        "label": f"English ({en_trans.upper()})",
        "language_code": "en",
        "direction": "ltr",
        "source": en_trans,
        "audio_note": None,
        "verse_count": len(en_sorted),
        "verses": en_sorted,
    }

    db.close()

    # Spread meta so the frontend gets all i18n fields (title_pt/title_es,
    # description_pt/description_es, reference_pt/reference_es, layer_notes_*).
    # Keep explicit keys below for anything meta doesn't provide or needs overriding.
    return {
        **meta,
        "id": passage_id,
        "translation": pt_trans,
        "translation_en": en_trans,
        "layers": layers,
    }
