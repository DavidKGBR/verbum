"""
🧪 Tests — Multi-Language Support
"""

import pandas as pd
import pytest

from src.extract.bible_sources import (
    ABibliaDigitalSource,
    BibleApiComSource,
    create_source,
)
from src.extract.translations import (
    ABIBLIA_DIGITAL_TRANSLATIONS,
    BIBLE_API_COM_TRANSLATIONS,
    TRANSLATION_REGISTRY,
    get_available_translations,
    get_source_type,
    get_translation,
    get_translations_by_language,
)
from src.models.schemas import RawVerse, Translation
from src.transform.cleaning import remove_duplicates
from src.transform.multilang_aligner import (
    align_verses,
    compute_coverage_report,
    find_missing_verses,
)

# ─── Translation Registry Tests ──────────────────────────────────────────────


class TestTranslationRegistry:
    def test_registry_has_expected_translations(self):
        assert "kjv" in TRANSLATION_REGISTRY
        assert "asv" in TRANSLATION_REGISTRY
        assert "bbe" in TRANSLATION_REGISTRY
        assert "nvi" in TRANSLATION_REGISTRY
        assert "ra" in TRANSLATION_REGISTRY

    def test_get_translation_known(self):
        t = get_translation("kjv")
        assert isinstance(t, Translation)
        assert t.translation_id == "kjv"
        assert t.language == "en"

    def test_get_translation_case_insensitive(self):
        t = get_translation("KJV")
        assert t.translation_id == "kjv"

    def test_get_translation_unknown_raises(self):
        with pytest.raises(ValueError, match="Unknown translation"):
            get_translation("xyz")

    def test_get_translations_by_language(self):
        en = get_translations_by_language("en")
        assert len(en) >= 2  # KJV, ASV
        assert all(t.language == "en" for t in en)

        ptbr = get_translations_by_language("pt-br")
        assert len(ptbr) >= 2  # NVI, ARA
        assert all(t.language == "pt-br" for t in ptbr)

    def test_get_available_translations(self):
        available = get_available_translations()
        assert len(available) == len(TRANSLATION_REGISTRY)

    def test_get_source_type(self):
        assert get_source_type("kjv") == "bible-api.com"
        assert get_source_type("nvi") == "abibliadigital.com.br"

    def test_source_groupings_cover_all(self):
        all_ids = BIBLE_API_COM_TRANSLATIONS | ABIBLIA_DIGITAL_TRANSLATIONS
        assert all_ids == set(TRANSLATION_REGISTRY.keys())


# ─── Bible Source Factory Tests ───────────────────────────────────────────────


class TestBibleSourceFactory:
    def test_create_source_kjv(self):
        source = create_source("kjv")
        assert isinstance(source, BibleApiComSource)
        source.close()

    def test_create_source_asv(self):
        source = create_source("asv")
        assert isinstance(source, BibleApiComSource)
        source.close()

    def test_create_source_nvi(self):
        source = create_source("nvi")
        assert isinstance(source, ABibliaDigitalSource)
        source.close()

    def test_create_source_unknown_raises(self):
        with pytest.raises(ValueError, match="Unknown translation"):
            create_source("xyz")


# ─── RawVerse Multi-Translation Tests ────────────────────────────────────────


class TestRawVerseMultiLang:
    def test_default_translation_is_kjv(self):
        v = RawVerse(book_id="GEN", book_name="Genesis", chapter=1, verse=1, text="Test")
        assert v.translation_id == "kjv"
        assert v.language == "en"

    def test_custom_translation(self):
        v = RawVerse(
            book_id="GEN",
            book_name="Genesis",
            chapter=1,
            verse=1,
            text="Teste",
            translation_id="nvi",
            language="pt-br",
        )
        assert v.translation_id == "nvi"
        assert v.language == "pt-br"

    def test_verse_id_computed(self):
        v = RawVerse(book_id="GEN", book_name="Genesis", chapter=1, verse=1, text="Test")
        assert v.verse_id == "GEN.1.1"

    def test_verse_id_format(self):
        v = RawVerse(book_id="PSA", book_name="Psalms", chapter=23, verse=4, text="Test")
        assert v.verse_id == "PSA.23.4"


# ─── Deduplication Multi-Translation Tests ───────────────────────────────────


class TestDeduplicationMultiLang:
    def test_same_verse_different_translations_kept(self):
        """Same verse in KJV and NVI should NOT be deduped."""
        verses = [
            RawVerse(
                book_id="GEN",
                book_name="Genesis",
                chapter=1,
                verse=1,
                text="In the beginning",
                translation_id="kjv",
                language="en",
            ),
            RawVerse(
                book_id="GEN",
                book_name="Genesis",
                chapter=1,
                verse=1,
                text="No principio",
                translation_id="nvi",
                language="pt-br",
            ),
        ]
        result = remove_duplicates(verses)
        assert len(result) == 2

    def test_same_verse_same_translation_deduped(self):
        """Same verse twice in KJV SHOULD be deduped."""
        verses = [
            RawVerse(
                book_id="GEN",
                book_name="Genesis",
                chapter=1,
                verse=1,
                text="In the beginning",
                translation_id="kjv",
            ),
            RawVerse(
                book_id="GEN",
                book_name="Genesis",
                chapter=1,
                verse=1,
                text="In the beginning",
                translation_id="kjv",
            ),
        ]
        result = remove_duplicates(verses)
        assert len(result) == 1


# ─── Multi-Language Aligner Tests ─────────────────────────────────────────────


class TestMultiLangAligner:
    @pytest.fixture
    def kjv_df(self):
        return pd.DataFrame(
            [
                {
                    "verse_id": "GEN.1.1",
                    "translation_id": "kjv",
                    "book_position": 1,
                    "chapter": 1,
                    "verse": 1,
                    "text": "In the beginning",
                },
                {
                    "verse_id": "GEN.1.2",
                    "translation_id": "kjv",
                    "book_position": 1,
                    "chapter": 1,
                    "verse": 2,
                    "text": "And the earth was",
                },
            ]
        )

    @pytest.fixture
    def nvi_df(self):
        return pd.DataFrame(
            [
                {
                    "verse_id": "GEN.1.1",
                    "translation_id": "nvi",
                    "book_position": 1,
                    "chapter": 1,
                    "verse": 1,
                    "text": "No principio",
                },
                # GEN.1.2 is missing in NVI for this test
            ]
        )

    def test_align_verses_combines(self, kjv_df, nvi_df):
        combined = align_verses({"kjv": kjv_df, "nvi": nvi_df})
        assert len(combined) == 3  # 2 KJV + 1 NVI

    def test_align_verses_empty(self):
        result = align_verses({})
        assert len(result) == 0

    def test_coverage_report(self, kjv_df, nvi_df):
        combined = pd.concat([kjv_df, nvi_df], ignore_index=True)
        report = compute_coverage_report(combined, reference_translation="kjv")
        assert len(report) == 2

        kjv_row = report[report["translation_id"] == "kjv"].iloc[0]
        assert kjv_row["coverage_pct"] == 100.0

        nvi_row = report[report["translation_id"] == "nvi"].iloc[0]
        assert nvi_row["total_verses"] == 1
        assert nvi_row["missing_count"] == 1

    def test_find_missing_verses(self, kjv_df, nvi_df):
        combined = pd.concat([kjv_df, nvi_df], ignore_index=True)
        missing = find_missing_verses(combined, reference_translation="kjv")
        assert len(missing) == 1
        assert missing.iloc[0]["translation_id"] == "nvi"
        assert missing.iloc[0]["verse_id"] == "GEN.1.2"
