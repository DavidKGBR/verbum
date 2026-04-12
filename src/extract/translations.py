"""
🌍 Translation Registry
Maps Bible translations to their API sources and metadata.
"""

from __future__ import annotations

from src.models.schemas import Translation

# ─── Translation Registry ────────────────────────────────────────────────────
# Only includes translations verified to exist on their respective APIs.
# bible-api.com translations: https://bible-api.com/

TRANSLATION_REGISTRY: dict[str, Translation] = {
    # ── bible-api.com (English) ───────────────────────────────────────────
    "kjv": Translation(
        translation_id="kjv",
        language="en",
        name="King James Version",
        full_name="Authorized King James Version",
        year=1611,
        license="Public Domain",
        source_api="bible-api.com",
    ),
    "asv": Translation(
        translation_id="asv",
        language="en",
        name="American Standard Version",
        full_name="American Standard Version",
        year=1901,
        license="Public Domain",
        source_api="bible-api.com",
    ),
    "bbe": Translation(
        translation_id="bbe",
        language="en",
        name="Bible in Basic English",
        full_name="Bible in Basic English",
        year=1965,
        license="Public Domain",
        source_api="bible-api.com",
    ),
    "web": Translation(
        translation_id="web",
        language="en",
        name="World English Bible",
        full_name="World English Bible",
        year=2000,
        license="Public Domain",
        source_api="bible-api.com",
    ),
    "darby": Translation(
        translation_id="darby",
        language="en",
        name="Darby Bible",
        full_name="Darby Bible",
        year=1890,
        license="Public Domain",
        source_api="bible-api.com",
    ),
    # ── bible-api.com (Portuguese) ────────────────────────────────────────
    "almeida": Translation(
        translation_id="almeida",
        language="pt",
        name="João Ferreira de Almeida",
        full_name="João Ferreira de Almeida",
        year=1819,
        license="Public Domain",
        source_api="bible-api.com",
    ),
    # ── bible-api.com (Latin) ─────────────────────────────────────────────
    "clementine": Translation(
        translation_id="clementine",
        language="la",
        name="Clementine Vulgate",
        full_name="Clementine Latin Vulgate",
        year=1592,
        license="Public Domain",
        source_api="bible-api.com",
    ),
    # ── abibliadigital.com.br (PT-BR) ────────────────────────────────────
    "nvi": Translation(
        translation_id="nvi",
        language="pt-br",
        name="Nova Versão Internacional",
        full_name="Nova Versão Internacional",
        year=1993,
        license="Biblica",
        source_api="abibliadigital.com.br",
    ),
    "ra": Translation(
        translation_id="ra",
        language="pt-br",
        name="Almeida Revista e Atualizada",
        full_name="Almeida Revista e Atualizada",
        year=1993,
        license="SBB",
        source_api="abibliadigital.com.br",
    ),
    "acf": Translation(
        translation_id="acf",
        language="pt-br",
        name="Almeida Corrigida Fiel",
        full_name="Almeida Corrigida e Revisada Fiel",
        year=1994,
        license="SBTB",
        source_api="abibliadigital.com.br",
    ),
    "rvr": Translation(
        translation_id="rvr",
        language="es",
        name="Reina-Valera",
        full_name="Reina-Valera",
        year=1960,
        license="Public Domain",
        source_api="abibliadigital.com.br",
    ),
}

# ─── Source groupings ─────────────────────────────────────────────────────────

BIBLE_API_COM_TRANSLATIONS = {"kjv", "asv", "bbe", "web", "darby", "almeida", "clementine"}
ABIBLIA_DIGITAL_TRANSLATIONS = {"nvi", "ra", "acf", "rvr"}


# ─── Helpers ──────────────────────────────────────────────────────────────────


def get_translation(translation_id: str) -> Translation:
    """Get a translation by its ID. Raises ValueError if unknown."""
    tid = translation_id.lower()
    if tid not in TRANSLATION_REGISTRY:
        available = ", ".join(sorted(TRANSLATION_REGISTRY.keys()))
        raise ValueError(f"Unknown translation '{translation_id}'. Available: {available}")
    return TRANSLATION_REGISTRY[tid]


def get_translations_by_language(language: str) -> list[Translation]:
    """Get all translations for a given language code."""
    return [t for t in TRANSLATION_REGISTRY.values() if t.language == language]


def get_available_translations() -> list[Translation]:
    """Get all registered translations."""
    return list(TRANSLATION_REGISTRY.values())


def get_source_type(translation_id: str) -> str:
    """Get the API source type for a translation ID."""
    return get_translation(translation_id).source_api
