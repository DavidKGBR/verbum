"""
🧪 Tests — SBLGNT Greek NT extractor (Task #3c)
"""

from __future__ import annotations

import pandas as pd
import pytest

from src.config import LoadConfig
from src.extract.sblgnt_extractor import SblgntExtractor
from src.load.duckdb_loader import DuckDBLoader
from src.models.schemas import OriginalText, OriginalTextLanguage

# ─── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def tmp_db(tmp_path):
    cfg = LoadConfig(duckdb_path=str(tmp_path / "test.duckdb"))
    loader = DuckDBLoader(cfg)
    loader.create_schema()
    yield loader
    loader.close()


# Minimal 3 John 1:1-2 fixture mirroring the real SBLGNT structure.
_SAMPLE_3JOHN = """<book id="3Jn">
  <title>ΙΩΑΝΝΟΥ Γ</title>
  <p>
    <verse-number id="3 John 1:1">1:1</verse-number>
    <w>Ὁ</w>
    <suffix> </suffix>
    <w>πρεσβύτερος</w>
    <suffix> </suffix>
    <w>Γαΐῳ</w>
    <suffix>, </suffix>
    <w>ὃν</w>
    <suffix> </suffix>
    <w>ἀγαπῶ</w>
    <suffix>. </suffix>
  </p>
  <p>
    <verse-number id="3 John 1:2">2</verse-number>
    <w>Ἀγαπητέ</w>
    <suffix>, </suffix>
    <w>εὔχομαί</w>
    <suffix>.</suffix>
  </p>
</book>"""


# Fixture with a <prefix> marker that must be ignored.
_SAMPLE_WITH_PREFIX = """<book id="3Jn">
  <p>
    <verse-number id="3 John 1:1">1:1</verse-number>
    <prefix> ⸀</prefix>
    <w>λόγος</w>
    <suffix>. </suffix>
  </p>
</book>"""


# ─── Parser ───────────────────────────────────────────────────────────────────


class TestParseBook:
    def test_emits_all_verses(self):
        extractor = SblgntExtractor()
        verses = list(extractor._parse_book(_SAMPLE_3JOHN, "3John"))
        assert len(verses) == 2

        v1, v2 = verses
        assert v1.verse_id == "3JN.1.1"
        assert v1.book_id == "3JN"
        assert v1.chapter == 1
        assert v1.verse == 1
        assert v1.language == OriginalTextLanguage.GREEK
        assert v1.source == "sblgnt"

        assert v2.verse_id == "3JN.1.2"

    def test_concatenates_words_and_suffixes_with_natural_spacing(self):
        extractor = SblgntExtractor()
        verses = list(extractor._parse_book(_SAMPLE_3JOHN, "3John"))
        v1 = verses[0]
        # Suffixes carry the inter-word spacing; we collapse redundant
        # whitespace but otherwise preserve the source punctuation.
        assert v1.text == "Ὁ πρεσβύτερος Γαΐῳ, ὃν ἀγαπῶ."

    def test_ignores_prefix_markers(self):
        """Critical-edition markers in <prefix> must not leak into the text."""
        extractor = SblgntExtractor()
        verses = list(extractor._parse_book(_SAMPLE_WITH_PREFIX, "3John"))
        assert len(verses) == 1
        v = verses[0]
        # Neither the whitespace nor the ⸀ character from the prefix should appear
        assert "⸀" not in v.text
        assert v.text == "λόγος."

    def test_unknown_book_raises(self):
        extractor = SblgntExtractor()
        with pytest.raises(ValueError, match="Unknown SBLGNT book"):
            list(extractor._parse_book(_SAMPLE_3JOHN, "Bel"))

    def test_collapses_whitespace(self):
        xml = """<book id="3Jn">
          <p>
            <verse-number id="3 John 1:1">1:1</verse-number>
            <w>Α</w>
            <suffix>
            </suffix>
            <w>Ω</w>
            <suffix>.   </suffix>
          </p>
        </book>"""
        extractor = SblgntExtractor()
        verses = list(extractor._parse_book(xml, "3John"))
        # Runs of whitespace inside suffix collapse; punctuation-only suffix
        # attaches directly to the preceding word (no trailing space).
        assert verses[0].text == "Α Ω."


# ─── Book resolution ─────────────────────────────────────────────────────────


class TestResolveBooks:
    def test_sblgnt_names(self):
        assert SblgntExtractor()._resolve_books(["Matt"]) == ["Matt"]
        assert SblgntExtractor()._resolve_books(["1Cor"]) == ["1Cor"]

    def test_canonical_ids(self):
        assert SblgntExtractor()._resolve_books(["MAT"]) == ["Matt"]
        assert SblgntExtractor()._resolve_books(["1CO"]) == ["1Cor"]

    def test_mixed(self):
        out = SblgntExtractor()._resolve_books(["Matt", "JHN", "Rev"])
        assert out == ["Matt", "John", "Rev"]

    def test_none_returns_all_27(self):
        resolved = SblgntExtractor()._resolve_books(None)
        assert len(resolved) == 27
        assert "Matt" in resolved
        assert "Rev" in resolved

    def test_unknown_raises(self):
        with pytest.raises(ValueError, match="Unknown book"):
            SblgntExtractor()._resolve_books(["Genesis"])


# ─── Loader (reuses load_original_texts from #3b) ────────────────────────────


def _verses_to_df(verses: list[OriginalText]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "verse_id": v.verse_id,
                "book_id": v.book_id,
                "chapter": v.chapter,
                "verse": v.verse,
                "language": v.language.value,
                "text": v.text,
                "source": v.source,
            }
            for v in verses
        ]
    )


class TestLoader:
    @pytest.fixture
    def sample_greek(self) -> list[OriginalText]:
        return [
            OriginalText(
                verse_id="JHN.1.1",
                book_id="JHN",
                chapter=1,
                verse=1,
                language=OriginalTextLanguage.GREEK,
                text="Ἐν ἀρχῇ ἦν ὁ λόγος",
                source="sblgnt",
            ),
            OriginalText(
                verse_id="JHN.3.16",
                book_id="JHN",
                chapter=3,
                verse=16,
                language=OriginalTextLanguage.GREEK,
                text="Οὕτως γὰρ ἠγάπησεν ὁ θεὸς τὸν κόσμον",
                source="sblgnt",
            ),
        ]

    def test_load_greek_rows(self, tmp_db, sample_greek):
        count = tmp_db.load_original_texts(_verses_to_df(sample_greek), language="greek")
        assert count == 2

    def test_scoped_delete_preserves_hebrew(self, tmp_db, sample_greek):
        # Seed a fake Hebrew row first
        tmp_db.conn.execute(
            "INSERT INTO original_texts VALUES "
            "('GEN.1.1', 'GEN', 1, 1, 'hebrew', 'בְּרֵאשִׁית', 'wlc', CURRENT_TIMESTAMP)"
        )
        tmp_db.load_original_texts(_verses_to_df(sample_greek), language="greek")

        total = tmp_db.conn.execute("SELECT COUNT(*) FROM original_texts").fetchone()
        assert total is not None
        assert total[0] == 3  # 1 Hebrew preserved + 2 Greek added

        hebrew = tmp_db.conn.execute(
            "SELECT text FROM original_texts WHERE language='hebrew'"
        ).fetchone()
        assert hebrew is not None
        assert "בְּרֵאשִׁית" in hebrew[0]

    def test_reload_is_idempotent(self, tmp_db, sample_greek):
        tmp_db.load_original_texts(_verses_to_df(sample_greek), language="greek")
        tmp_db.load_original_texts(_verses_to_df(sample_greek), language="greek")
        count = tmp_db.conn.execute(
            "SELECT COUNT(*) FROM original_texts WHERE language = 'greek'"
        ).fetchone()
        assert count is not None
        assert count[0] == 2


# ─── Integration ─────────────────────────────────────────────────────────────


@pytest.mark.integration
class TestRealDownload:
    def test_downloads_and_parses_3john(self, tmp_path):
        """Sanity: real 3John download parses to 14–15 verses."""
        extractor = SblgntExtractor(cache_dir=tmp_path)
        verses = extractor.extract(books=["3John"], use_cache=False)

        # 3 John has 14 verses in the SBLGNT (or 15 depending on edition)
        assert 13 <= len(verses) <= 16

        by_id = {v.verse_id: v for v in verses}
        assert "3JN.1.1" in by_id
        # "πρεσβύτερος" (elder) appears in the opening verse
        assert "πρεσβύτερος" in by_id["3JN.1.1"].text

        # All should be greek / sblgnt
        assert all(v.language == OriginalTextLanguage.GREEK for v in verses)
        assert all(v.source == "sblgnt" for v in verses)
