"""
📖 Passage Explainer
Uses Gemini to explain Bible passages and compare translations.
"""

from __future__ import annotations

import logging
from pathlib import Path

from src.ai.gemini_client import GeminiClient

logger = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).parent / "prompts"


def _load_prompt(name: str) -> str:
    """Load a prompt template from disk."""
    path = _PROMPTS_DIR / name
    return path.read_text(encoding="utf-8")


class PassageExplainer:
    """Explains Bible passages using Gemini AI."""

    def __init__(self, client: GeminiClient) -> None:
        self.client = client
        self._explain_template = _load_prompt("explain_passage.txt")
        self._compare_template = _load_prompt("compare_translations.txt")

    def explain(
        self,
        verse_id: str,
        text: str,
        reference: str,
        book_name: str = "",
        testament: str = "",
        category: str = "",
        translation: str = "kjv",
        language: str = "en",
        style: str = "simple",
    ) -> dict:
        """Explain a Bible passage.

        Args:
            verse_id: e.g. "GEN.1.1"
            text: The verse text.
            reference: e.g. "Genesis 1:1"
            book_name: e.g. "Genesis"
            testament: e.g. "Old Testament"
            category: e.g. "Law"
            translation: Translation ID.
            language: Response language ("en", "pt-br", "es").
            style: Explanation style ("simple", "academic", "devotional").

        Returns:
            Dict with explanation, context, key_words, application.
        """
        prompt = self._explain_template.format(
            text=text,
            reference=reference,
            book_name=book_name,
            testament=testament,
            category=category,
            translation=translation.upper(),
            language=language,
            style=style,
        )

        cache_key = self.client._cache_key("explain", verse_id, translation, language, style)

        result = self.client.generate_json(prompt, cache_key=cache_key)
        result["verse_id"] = verse_id
        result["translation"] = translation
        result["language"] = language
        result["style"] = style
        return result

    def compare_translations(
        self,
        verse_id: str,
        translations: dict[str, str],
        reference: str = "",
        language: str = "en",
    ) -> dict:
        """Compare a verse across multiple translations.

        Args:
            verse_id: e.g. "GEN.1.1"
            translations: Dict of translation_id → text (e.g. {"kjv": "In the...", "nvi": "No..."})
            reference: Human-readable reference.
            language: Response language.

        Returns:
            Dict with differences, nuances, original, recommendation.
        """
        formatted = "\n".join(f'- {tid.upper()}: "{text}"' for tid, text in translations.items())

        # Determine original language from testament
        original_language = (
            "Hebrew (Old Testament)"
            if verse_id.split(".")[0]
            in {
                "GEN",
                "EXO",
                "LEV",
                "NUM",
                "DEU",
                "JOS",
                "JDG",
                "RUT",
                "1SA",
                "2SA",
                "1KI",
                "2KI",
                "1CH",
                "2CH",
                "EZR",
                "NEH",
                "EST",
                "JOB",
                "PSA",
                "PRO",
                "ECC",
                "SNG",
                "ISA",
                "JER",
                "LAM",
                "EZK",
                "DAN",
                "HOS",
                "JOL",
                "AMO",
                "OBA",
                "JON",
                "MIC",
                "NAM",
                "HAB",
                "ZEP",
                "HAG",
                "ZEC",
                "MAL",
            }
            else "Greek (New Testament)"
        )

        prompt = self._compare_template.format(
            reference=reference or verse_id,
            translations_formatted=formatted,
            original_language=original_language,
            language=language,
        )

        translation_ids = sorted(translations.keys())
        cache_key = self.client._cache_key("compare", verse_id, *translation_ids, language)

        result = self.client.generate_json(prompt, cache_key=cache_key)
        result["verse_id"] = verse_id
        result["translations_compared"] = translation_ids
        return result
