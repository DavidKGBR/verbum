"""
🌍 Translation Registry
Maps Bible translations to their API sources and metadata.

Primary source: abibliadigital.com.br (7 translations, all complete)
Fallback: bible-api.com (for translations not on abibliadigital)
"""

from __future__ import annotations

from src.models.schemas import Translation

# ─── Translation Registry ────────────────────────────────────────────────────

TRANSLATION_REGISTRY: dict[str, Translation] = {
    # ── abibliadigital.com.br — English ──────────────────────────────────
    "kjv": Translation(
        translation_id="kjv",
        language="en",
        name="King James Version",
        full_name="Authorized King James Version",
        year=1611,
        license="Public Domain",
        source_api="abibliadigital.com.br",
    ),
    "bbe": Translation(
        translation_id="bbe",
        language="en",
        name="Bible in Basic English",
        full_name="Bible in Basic English",
        year=1965,
        license="Public Domain",
        source_api="abibliadigital.com.br",
    ),
    # ── abibliadigital.com.br — Portuguese ───────────────────────────────
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
    # ── abibliadigital.com.br — Spanish ──────────────────────────────────
    "rvr": Translation(
        translation_id="rvr",
        language="es",
        name="Reina-Valera",
        full_name="Reina-Valera",
        year=1960,
        license="Public Domain",
        source_api="abibliadigital.com.br",
    ),
    # ── abibliadigital.com.br — French ───────────────────────────────────
    "apee": Translation(
        translation_id="apee",
        language="fr",
        name="A Peshitta em Francês",
        full_name="A Peshitta em Francês",
        year=None,
        license="Public Domain",
        source_api="abibliadigital.com.br",
    ),
    # ── Zefania XML — German ────────────────────────────────────────────
    "neue": Translation(
        translation_id="neue",
        language="de",
        name="Neue evangelistische Übersetzung",
        full_name="Neue evangelistische Übersetzung (NeÜ)",
        year=2024,
        license="Karl-Heinz Vanheiden",
        source_api="zefania-xml",
    ),
    # ── bible-api.com (fallback for translations not on abibliadigital) ──
    "asv": Translation(
        translation_id="asv",
        language="en",
        name="American Standard Version",
        full_name="American Standard Version",
        year=1901,
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
    # ── eBible.org USFX — Arabic ─────────────────────────────────────────
    "arb-vd": Translation(
        translation_id="arb-vd",
        language="ar",
        name="Smith & Van Dyke",
        full_name="Smith & Van Dyke Arabic Bible (1865)",
        year=1865,
        license="Public Domain",
        source_api="usfx",
    ),
    # ── eBible.org USFX — Chinese ────────────────────────────────────────
    "cmn-cu89t": Translation(
        translation_id="cmn-cu89t",
        language="zh",
        name="Chinese Union Version (Traditional)",
        full_name="Chinese Union Version — Traditional Script (1919)",
        year=1919,
        license="Public Domain",
        source_api="usfx",
    ),
    "cmn-cu89s": Translation(
        translation_id="cmn-cu89s",
        language="zh",
        name="Chinese Union Version (Simplified)",
        full_name="Chinese Union Version — Simplified Script (1919)",
        year=1919,
        license="Public Domain",
        source_api="usfx",
    ),
    # ── Pre-cached (extracted via removed BibleSuperSearch API) ──────────
    "luther": Translation(
        translation_id="luther",
        language="de",
        name="Luther 1912",
        full_name="Martin Luther Übersetzung (1912)",
        year=1912,
        license="Public Domain",
        source_api="pre-cached",
    ),
}

# ─── Source groupings ─────────────────────────────────────────────────────────

BIBLE_API_COM_TRANSLATIONS = {"asv", "web", "darby"}
ABIBLIA_DIGITAL_TRANSLATIONS = {"kjv", "bbe", "nvi", "ra", "acf", "rvr", "apee"}
ZEFANIA_XML_TRANSLATIONS = {"neue"}
USFX_TRANSLATIONS = {"arb-vd", "cmn-cu89t", "cmn-cu89s"}
PRE_CACHED_TRANSLATIONS = {"luther"}


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
