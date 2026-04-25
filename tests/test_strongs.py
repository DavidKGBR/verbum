"""
🧪 Tests — Strong's lexicon (Task #3a)
"""

from __future__ import annotations

import json

import pandas as pd
import pytest

from src.config import LoadConfig
from src.extract.strongs_extractor import StrongsExtractor, _normalize_id
from src.load.duckdb_loader import DuckDBLoader
from src.models.schemas import StrongsEntry, StrongsLanguage

# ─── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def tmp_db(tmp_path):
    """A DuckDBLoader pointing at a temp database with the schema created."""
    cfg = LoadConfig(duckdb_path=str(tmp_path / "test.duckdb"))
    loader = DuckDBLoader(cfg)
    loader.create_schema()
    yield loader
    loader.close()


@pytest.fixture
def sample_entries() -> list[StrongsEntry]:
    return [
        StrongsEntry(
            strongs_id="H2617",
            language=StrongsLanguage.HEBREW,
            original="חֶסֶד",
            transliteration="chesed",
            pronunciation="kheh'-sed",
            short_definition="kindness, lovingkindness, mercy",
            long_definition="from H2616; KJV: mercy, kindness",
            part_of_speech=None,
        ),
        StrongsEntry(
            strongs_id="G25",
            language=StrongsLanguage.GREEK,
            original="ἀγαπάω",
            transliteration="agapao",
            pronunciation="ag-ap-ah'-o",
            short_definition="to love",
            long_definition=None,
            part_of_speech=None,
        ),
        StrongsEntry(
            strongs_id="H430",
            language=StrongsLanguage.HEBREW,
            original="אֱלֹהִים",
            transliteration="elohim",
            pronunciation="el-o-heem'",
            short_definition="God, gods",
            long_definition=None,
            part_of_speech=None,
        ),
    ]


@pytest.fixture
def sample_hebrew_js() -> str:
    """Minimal openscriptures-format JS payload — 3 entries."""
    data = {
        "H1": {
            "lemma": "אָב",
            "xlit": "ʼâb",
            "pron": "awb",
            "derivation": "a primitive word;",
            "strongs_def": "father, in a literal and immediate, or figurative application",
            "kjv_def": "chief, (fore-)father",
        },
        "H2617": {
            "lemma": "חֶסֶד",
            "xlit": "chesed",
            "pron": "kheh'-sed",
            "derivation": "from H2616;",
            "strongs_def": "kindness, lovingkindness, mercy",
            "kjv_def": "mercy, kindness",
        },
        # Entry with a homograph suffix — should still normalise to numeric-only ID
        "H3023a": {
            "lemma": "יָאֹר",
            "xlit": "yaʼor",
            "pron": "yaw-ore'",
            "derivation": "variant form",
            "strongs_def": "Nile",
            "kjv_def": "Nile, river",
        },
    }
    return f"var strongsHebrewDictionary = {json.dumps(data, ensure_ascii=False)};"


# ─── ID normalisation ─────────────────────────────────────────────────────────


class TestNormalizeId:
    def test_hebrew_simple(self):
        assert _normalize_id("H1") == "H1"

    def test_greek_simple(self):
        assert _normalize_id("G25") == "G25"

    def test_strips_leading_zeros(self):
        assert _normalize_id("H0025") == "H25"
        assert _normalize_id("G00025") == "G25"

    def test_lowercase_prefix(self):
        assert _normalize_id("h25") == "H25"

    def test_keeps_numeric_prefix_on_homograph(self):
        # openscriptures uses H3023a / H3023b for variant readings
        assert _normalize_id("H3023a") == "H3023"
        assert _normalize_id("H3023b") == "H3023"

    def test_invalid_returns_none(self):
        assert _normalize_id("X25") is None
        assert _normalize_id("H") is None
        assert _normalize_id("") is None
        assert _normalize_id("Hfoo") is None


# ─── Pydantic model validation ────────────────────────────────────────────────


class TestStrongsEntryValidation:
    def test_valid_entry(self):
        e = StrongsEntry(
            strongs_id="H2617",
            language=StrongsLanguage.HEBREW,
            original="חֶסֶד",
            transliteration="chesed",
            short_definition="mercy",
        )
        assert e.strongs_id == "H2617"

    def test_normalises_zero_padded_id(self):
        e = StrongsEntry(
            strongs_id="H00025",
            language=StrongsLanguage.HEBREW,
            original="foo",
            transliteration="bar",
            short_definition="baz",
        )
        assert e.strongs_id == "H25"

    def test_rejects_bad_prefix(self):
        with pytest.raises(ValueError, match="must start with H or G"):
            StrongsEntry(
                strongs_id="X25",
                language=StrongsLanguage.HEBREW,
                original="a",
                transliteration="b",
                short_definition="c",
            )

    def test_rejects_empty_id(self):
        with pytest.raises(ValueError, match="Invalid Strong"):
            StrongsEntry(
                strongs_id="",
                language=StrongsLanguage.HEBREW,
                original="a",
                transliteration="b",
                short_definition="c",
            )


# ─── JS parser ────────────────────────────────────────────────────────────────


class TestParseOpenscripturesJs:
    def test_parses_sample_hebrew(self, sample_hebrew_js: str):
        extractor = StrongsExtractor()
        entries = extractor._parse_openscriptures_js(sample_hebrew_js, StrongsLanguage.HEBREW)
        assert len(entries) == 3
        ids = {e.strongs_id for e in entries}
        assert ids == {"H1", "H2617", "H3023"}

    def test_all_entries_have_required_fields(self, sample_hebrew_js: str):
        extractor = StrongsExtractor()
        entries = extractor._parse_openscriptures_js(sample_hebrew_js, StrongsLanguage.HEBREW)
        for e in entries:
            assert e.original
            assert e.transliteration
            assert e.short_definition

    def test_long_definition_includes_kjv(self, sample_hebrew_js: str):
        extractor = StrongsExtractor()
        entries = extractor._parse_openscriptures_js(sample_hebrew_js, StrongsLanguage.HEBREW)
        chesed = next(e for e in entries if e.strongs_id == "H2617")
        assert chesed.long_definition is not None
        assert "mercy" in chesed.long_definition.lower()

    def test_skips_entries_missing_required_fields(self):
        # Build a payload where one entry is missing `xlit`
        data = {
            "H1": {
                "lemma": "א",
                "xlit": "a",
                "strongs_def": "first",
            },
            "H2": {  # missing xlit
                "lemma": "b",
                "strongs_def": "second",
            },
        }
        js = f"var x = {json.dumps(data)};"
        extractor = StrongsExtractor()
        entries = extractor._parse_openscriptures_js(js, StrongsLanguage.HEBREW)
        assert len(entries) == 1
        assert entries[0].strongs_id == "H1"

    def test_rejects_non_js_payload(self):
        extractor = StrongsExtractor()
        with pytest.raises(ValueError, match="Failed to parse"):
            extractor._parse_openscriptures_js("this is not JS", StrongsLanguage.HEBREW)


# ─── Loader ───────────────────────────────────────────────────────────────────


def _entries_to_df(entries: list[StrongsEntry]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "strongs_id": e.strongs_id,
                "language": e.language.value,
                "original": e.original,
                "transliteration": e.transliteration,
                "pronunciation": e.pronunciation,
                "short_definition": e.short_definition,
                "long_definition": e.long_definition,
                "part_of_speech": e.part_of_speech,
            }
            for e in entries
        ]
    )


class TestLoadStrongs:
    def test_loads_all_entries(self, tmp_db, sample_entries):
        df = _entries_to_df(sample_entries)
        count = tmp_db.load_strongs_entries(df)
        assert count == 3

    def test_both_languages_present(self, tmp_db, sample_entries):
        df = _entries_to_df(sample_entries)
        tmp_db.load_strongs_entries(df)
        rows = tmp_db.conn.execute(
            "SELECT language, COUNT(*) FROM strongs_lexicon GROUP BY language ORDER BY language"
        ).fetchall()
        by_lang = dict(rows)
        assert by_lang["hebrew"] == 2
        assert by_lang["greek"] == 1

    def test_round_trips_fields(self, tmp_db, sample_entries):
        df = _entries_to_df(sample_entries)
        tmp_db.load_strongs_entries(df)
        row = tmp_db.conn.execute(
            "SELECT strongs_id, transliteration, short_definition "
            "FROM strongs_lexicon WHERE strongs_id = 'H2617'"
        ).fetchone()
        assert row is not None
        assert row[0] == "H2617"
        assert row[1] == "chesed"
        assert "mercy" in row[2]

    def test_replaces_existing_on_reload(self, tmp_db, sample_entries):
        tmp_db.load_strongs_entries(_entries_to_df(sample_entries))
        # Load only 1 entry — table should now have exactly 1 row
        tmp_db.load_strongs_entries(_entries_to_df(sample_entries[:1]))
        count = tmp_db.conn.execute("SELECT COUNT(*) FROM strongs_lexicon").fetchone()
        assert count is not None
        assert count[0] == 1

    def test_empty_df_is_noop(self, tmp_db):
        count = tmp_db.load_strongs_entries(pd.DataFrame())
        assert count == 0


# ─── Integration smoke test (hits the network) ───────────────────────────────


@pytest.mark.integration
class TestRealExtract:
    def test_downloads_and_parses_real_dataset(self, tmp_path):
        """Sanity check: real openscriptures data parses and contains canonical entries."""
        extractor = StrongsExtractor(cache_dir=tmp_path)
        entries = extractor.extract(use_cache=False)

        # Bulk counts should be roughly 8674 Hebrew + 5624 Greek
        hebrew = [e for e in entries if e.language == StrongsLanguage.HEBREW]
        greek = [e for e in entries if e.language == StrongsLanguage.GREEK]
        assert 8000 < len(hebrew) < 9500
        assert 5000 < len(greek) < 6500

        # Canonical entries exist with recognisable content. Transliterations
        # use academic-style accents (chêçêd, ἀγαπάω) — check short_definition
        # instead for stable substrings.
        by_id = {e.strongs_id: e for e in entries}
        assert "H2617" in by_id
        assert "kindness" in by_id["H2617"].short_definition.lower()
        assert "G25" in by_id
        assert "love" in by_id["G25"].short_definition.lower()
