"""
🧪 Tests — MorphHB Hebrew OT extractor (Task #3b)
"""

from __future__ import annotations

from xml.etree import ElementTree as ET

import defusedxml.ElementTree as DefusedET
import pandas as pd
import pytest

from src.config import LoadConfig
from src.extract.morphhb_extractor import (
    OSIS_NAMESPACE,
    MorphHbExtractor,
    _verse_text,
)
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


def _verse_elem(inner: str) -> ET.Element:
    """Build a `<verse>` element from a raw XML inner-body fragment."""
    xml = f"<verse xmlns='{OSIS_NAMESPACE}' osisID='Test.1.1'>{inner}</verse>"
    return DefusedET.fromstring(xml)


def _minimal_book_xml(osis_book: str, verses: list[tuple[int, int, str]]) -> str:
    """Build a minimal OSIS XML document for `osis_book` with given verses.

    `verses` is a list of (chapter, verse, inner) tuples, where `inner` is the
    raw XML fragment inside the <verse> element (typically a series of <w>s).
    """
    verse_blocks = []
    for ch, vs, inner in verses:
        verse_blocks.append(f'<verse osisID="{osis_book}.{ch}.{vs}">{inner}</verse>')
    body = "\n".join(verse_blocks)
    return (
        f"<osis xmlns='{OSIS_NAMESPACE}'>"
        f"<osisText>"
        f"<div type='book' osisID='{osis_book}'>"
        f"<chapter osisID='{osis_book}.1'>"
        f"{body}"
        f"</chapter>"
        f"</div>"
        f"</osisText>"
        f"</osis>"
    )


# ─── _verse_text unit tests ──────────────────────────────────────────────────


class TestVerseText:
    def test_joins_words_with_spaces(self):
        elem = _verse_elem("<w>alpha</w><w>beta</w><w>gamma</w>")
        assert _verse_text(elem) == "alpha beta gamma"

    def test_strips_morpheme_separator(self):
        elem = _verse_elem("<w>c/1961</w><w>b/3117</w>")
        assert _verse_text(elem) == "c1961 b3117"

    def test_seg_attaches_without_space(self):
        elem = _verse_elem(
            "<w>word1</w><seg type='x-maqqef'>־</seg><w>word2</w><seg type='x-sof-pasuq'>׃</seg>"
        )
        # maqfef glues to word1; sof-pasuq glues to word2
        assert _verse_text(elem) == "word1־ word2׃"

    def test_skips_notes(self):
        elem = _verse_elem("<w>alpha</w><note type='variant'>Qere reading</note><w>beta</w>")
        assert _verse_text(elem) == "alpha beta"

    def test_skips_references(self):
        elem = _verse_elem("<w>alpha</w><reference>Deut 4:41</reference><w>beta</w>")
        assert _verse_text(elem) == "alpha beta"

    def test_empty_returns_empty(self):
        elem = _verse_elem("")
        assert _verse_text(elem) == ""

    def test_real_hebrew_snippet(self):
        # Actual shape of Ruth 1.1 first two words
        elem = _verse_elem(
            '<w lemma="c/1961" morph="HC/Vqw3ms" id="08xeN">וַ/יְהִ֗י</w>'
            '<w lemma="b/3117" morph="HR/Ncmpc" id="08Nvk">בִּ/ימֵי֙</w>'
        )
        assert _verse_text(elem) == "וַיְהִ֗י בִּימֵי֙"


# ─── Book parser ─────────────────────────────────────────────────────────────


class TestParseBook:
    def test_emits_one_row_per_verse(self):
        xml = _minimal_book_xml(
            "Ruth",
            [
                (1, 1, "<w>וַיְהִי</w>"),
                (1, 2, "<w>וַיֵּ֤לֶךְ</w><w>אִישׁ</w>"),
            ],
        )
        extractor = MorphHbExtractor()
        verses = list(extractor._parse_book(xml, "Ruth"))
        assert len(verses) == 2

        v1, v2 = verses
        assert v1.verse_id == "RUT.1.1"
        assert v1.book_id == "RUT"
        assert v1.chapter == 1
        assert v1.verse == 1
        assert v1.language == OriginalTextLanguage.HEBREW
        assert v1.source == "wlc"
        assert v1.text == "וַיְהִי"

        assert v2.verse_id == "RUT.1.2"
        assert v2.text == "וַיֵּ֤לֶךְ אִישׁ"

    def test_unknown_book_raises(self):
        extractor = MorphHbExtractor()
        xml = _minimal_book_xml("Ruth", [(1, 1, "<w>x</w>")])
        # Re-label the outer book to something we don't map
        xml_invalid = xml.replace("Ruth", "Bel")
        with pytest.raises(ValueError, match="Unknown OSIS book"):
            list(extractor._parse_book(xml_invalid, "Bel"))

    def test_skips_empty_verses(self):
        xml = _minimal_book_xml(
            "Ruth",
            [
                (1, 1, "<w>alpha</w>"),
                (1, 2, ""),  # empty verse — should be skipped
                (1, 3, "<w>beta</w>"),
            ],
        )
        extractor = MorphHbExtractor()
        verses = list(extractor._parse_book(xml, "Ruth"))
        assert len(verses) == 2
        assert [v.verse for v in verses] == [1, 3]

    def test_resolves_osis_name(self):
        extractor = MorphHbExtractor()
        assert extractor._resolve_books(["Gen"]) == ["Gen"]

    def test_resolves_canonical_id(self):
        extractor = MorphHbExtractor()
        assert extractor._resolve_books(["GEN"]) == ["Gen"]

    def test_resolves_mixed(self):
        extractor = MorphHbExtractor()
        out = extractor._resolve_books(["Gen", "PSA", "Ruth"])
        assert out == ["Gen", "Ps", "Ruth"]

    def test_resolve_none_returns_all_39(self):
        extractor = MorphHbExtractor()
        resolved = extractor._resolve_books(None)
        assert len(resolved) == 39
        assert "Gen" in resolved
        assert "Mal" in resolved

    def test_resolve_unknown_raises(self):
        extractor = MorphHbExtractor()
        with pytest.raises(ValueError, match="Unknown book"):
            extractor._resolve_books(["Matthew"])


# ─── Pydantic validation ─────────────────────────────────────────────────────


class TestOriginalText:
    def test_valid_verse(self):
        v = OriginalText(
            verse_id="GEN.1.1",
            book_id="GEN",
            chapter=1,
            verse=1,
            language=OriginalTextLanguage.HEBREW,
            text="בְּרֵאשִׁית",
            source="wlc",
        )
        assert v.verse_id == "GEN.1.1"

    def test_rejects_bad_verse_id(self):
        with pytest.raises(ValueError, match="Invalid verse_id"):
            OriginalText(
                verse_id="GEN-1-1",
                book_id="GEN",
                chapter=1,
                verse=1,
                language=OriginalTextLanguage.HEBREW,
                text="x",
                source="wlc",
            )

    def test_rejects_non_numeric_chapter(self):
        with pytest.raises(ValueError, match="Invalid verse_id"):
            OriginalText(
                verse_id="GEN.X.1",
                book_id="GEN",
                chapter=1,
                verse=1,
                language=OriginalTextLanguage.HEBREW,
                text="x",
                source="wlc",
            )


# ─── Loader ──────────────────────────────────────────────────────────────────


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
    def sample_hebrew(self) -> list[OriginalText]:
        return [
            OriginalText(
                verse_id="GEN.1.1",
                book_id="GEN",
                chapter=1,
                verse=1,
                language=OriginalTextLanguage.HEBREW,
                text="בְּרֵאשִׁית בָּרָא אֱלֹהִים",
                source="wlc",
            ),
            OriginalText(
                verse_id="GEN.1.2",
                book_id="GEN",
                chapter=1,
                verse=2,
                language=OriginalTextLanguage.HEBREW,
                text="וְהָאָרֶץ הָיְתָה תֹהוּ",
                source="wlc",
            ),
        ]

    def test_loads_rows(self, tmp_db, sample_hebrew):
        df = _verses_to_df(sample_hebrew)
        count = tmp_db.load_original_texts(df, language="hebrew")
        assert count == 2

    def test_round_trips_text(self, tmp_db, sample_hebrew):
        tmp_db.load_original_texts(_verses_to_df(sample_hebrew), language="hebrew")
        row = tmp_db.conn.execute(
            "SELECT text FROM original_texts WHERE verse_id = 'GEN.1.1'"
        ).fetchone()
        assert row is not None
        assert "בְּרֵאשִׁית" in row[0]

    def test_reload_is_idempotent(self, tmp_db, sample_hebrew):
        tmp_db.load_original_texts(_verses_to_df(sample_hebrew), language="hebrew")
        tmp_db.load_original_texts(_verses_to_df(sample_hebrew), language="hebrew")
        count = tmp_db.conn.execute("SELECT COUNT(*) FROM original_texts").fetchone()
        assert count is not None
        assert count[0] == 2

    def test_scoped_delete_preserves_other_language(self, tmp_db, sample_hebrew):
        # Seed a Greek row manually so we can prove Hebrew reload doesn't wipe it
        tmp_db.conn.execute(
            "INSERT INTO original_texts VALUES "
            "('JHN.1.1', 'JHN', 1, 1, 'greek', 'Ἐν ἀρχῇ ἦν ὁ λόγος', 'sblgnt', CURRENT_TIMESTAMP)"
        )
        tmp_db.load_original_texts(_verses_to_df(sample_hebrew), language="hebrew")

        total = tmp_db.conn.execute("SELECT COUNT(*) FROM original_texts").fetchone()
        assert total is not None
        assert total[0] == 3  # 2 Hebrew + 1 Greek survived

        greek = tmp_db.conn.execute(
            "SELECT text FROM original_texts WHERE language='greek'"
        ).fetchone()
        assert greek is not None
        assert "λόγος" in greek[0]

    def test_empty_df_is_noop(self, tmp_db):
        count = tmp_db.load_original_texts(pd.DataFrame(), language="hebrew")
        assert count == 0


# ─── Integration (real network) ──────────────────────────────────────────────


@pytest.mark.integration
class TestRealDownload:
    def test_downloads_and_parses_ruth(self, tmp_path):
        """Sanity: real Ruth download parses to ~85 verses."""
        extractor = MorphHbExtractor(cache_dir=tmp_path)
        verses = extractor.extract(books=["Ruth"], use_cache=False)

        # Ruth has 85 verses in the Hebrew canon
        assert 80 <= len(verses) <= 90

        # Canonical entry check — Ruth 1:1 mentions Moab (מוֹאָב)
        by_id = {v.verse_id: v for v in verses}
        assert "RUT.1.1" in by_id
        # Strip niqqud (vowel points) to check the consonantal root.
        consonants_11 = "".join(c for c in by_id["RUT.1.1"].text if not ("\u0591" <= c <= "\u05c7"))
        assert "מואב" in consonants_11  # Moab is in Ruth 1:1
        # Ephrathites (אפרתים) appears in Ruth 1:2 — same root as Ephratah
        assert "RUT.1.2" in by_id
        consonants_12 = "".join(c for c in by_id["RUT.1.2"].text if not ("\u0591" <= c <= "\u05c7"))
        assert "אפרת" in consonants_12

        # Every verse has language=hebrew and source=wlc
        assert all(v.language == OriginalTextLanguage.HEBREW for v in verses)
        assert all(v.source == "wlc" for v in verses)
