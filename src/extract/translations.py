"""
🌍 Translation Registry
Maps Bible translations to their API sources and metadata.
"""

from __future__ import annotations

from src.models.schemas import Translation

# ─── Translation Registry ────────────────────────────────────────────────────

TRANSLATION_REGISTRY: dict[str, Translation] = {
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
    "rva": Translation(
        translation_id="rva",
        language="es",
        name="Reina-Valera Antigua",
        full_name="Reina-Valera Antigua",
        year=1602,
        license="Public Domain",
        source_api="bible-api.com",
    ),
    "nvi": Translation(
        translation_id="nvi",
        language="pt-br",
        name="Nova Versão Internacional",
        full_name="Nova Versão Internacional",
        year=1993,
        license="Biblica",
        source_api="abibliadigital.com.br",
    ),
    "ara": Translation(
        translation_id="ara",
        language="pt-br",
        name="Almeida Revista e Atualizada",
        full_name="Almeida Revista e Atualizada",
        year=1993,
        license="SBB",
        source_api="abibliadigital.com.br",
    ),
}

# ─── Source groupings ─────────────────────────────────────────────────────────

BIBLE_API_COM_TRANSLATIONS = {"kjv", "asv", "rva"}
ABIBLIA_DIGITAL_TRANSLATIONS = {"nvi", "ara"}


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
