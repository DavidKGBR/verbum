"""Tests for the Nave's Topical Bible extractor and loader."""

from __future__ import annotations

import pandas as pd
import pytest

from src.config import LoadConfig
from src.extract.naves_extractor import NavesExtractor, NaveTopic, NaveTopicVerse, _slugify
from src.load.duckdb_loader import DuckDBLoader

# ── Utility tests ────────────────────────────────────────────────────────────


class TestSlugify:
    def test_basic(self) -> None:
        assert _slugify("DANCING") == "dancing"

    def test_with_spaces(self) -> None:
        assert _slugify("HOLY SPIRIT") == "holy-spirit"

    def test_strips_special_chars(self) -> None:
        assert _slugify("GOD'S LOVE") == "gods-love"

    def test_empty(self) -> None:
        assert _slugify("") == ""


# ── Model tests ──────────────────────────────────────────────────────────────


class TestModels:
    def test_nave_topic(self) -> None:
        t = NaveTopic(topic_key="-123", name="FAITH", slug="faith", verse_count=42)
        assert t.name == "FAITH"
        assert t.verse_count == 42

    def test_nave_topic_verse(self) -> None:
        tv = NaveTopicVerse(topic_key="-123", verse_id="HEB.11.1", sort_order=1)
        assert tv.verse_id == "HEB.11.1"


# ── Extractor parsing tests ─────────────────────────────────────────────────


class TestExtractorParsing:
    def test_parse_topics(self, tmp_path: str) -> None:
        """Parse a minimal topics.txt."""
        topics_path = tmp_path / "topics.txt"  # type: ignore[operator]
        topics_path.write_text(
            "-100\tDANCING\t$$T0001\n-200\tFAITH\t$$T0002\n-300\tLOVE\t$$T0003\n",
            encoding="utf-8",
        )
        # Create empty topicxref so _ensure_extracted doesn't fail
        xref_path = tmp_path / "topicxref.txt"  # type: ignore[operator]
        xref_path.write_text("", encoding="utf-8")

        extractor = NavesExtractor(cache_dir=tmp_path)  # type: ignore[arg-type]
        topics, verses = extractor.extract(use_cache=True)

        assert len(topics) == 3
        names = {t.name for t in topics}
        assert "DANCING" in names
        assert "FAITH" in names
        assert "LOVE" in names

    def test_parse_topicxref(self, tmp_path: str) -> None:
        """Parse topicxref.txt and produce verse_ids."""
        topics_path = tmp_path / "topics.txt"  # type: ignore[operator]
        topics_path.write_text("-100\tDANCING\t$$T0001\n", encoding="utf-8")

        xref_path = tmp_path / "topicxref.txt"  # type: ignore[operator]
        xref_path.write_text(
            # book 2 = EXO, book 19 = PSA
            "-100\t-200\t0\t2\t15\t20\tEx15:20\n"
            "-100\t-200\t0\t19\t149\t3\tPs149:3\n"
            "-100\t-200\t0\t19\t150\t4\tPs150:4\n",
            encoding="utf-8",
        )

        extractor = NavesExtractor(cache_dir=tmp_path)  # type: ignore[arg-type]
        topics, verses = extractor.extract(use_cache=True)

        assert len(verses) == 3
        verse_ids = {v.verse_id for v in verses}
        assert "EXO.15.20" in verse_ids
        assert "PSA.149.3" in verse_ids
        assert "PSA.150.4" in verse_ids

        # Topic should have verse_count = 3
        assert topics[0].verse_count == 3

    def test_dedup_verse_refs(self, tmp_path: str) -> None:
        """Same topic+verse should not appear twice."""
        topics_path = tmp_path / "topics.txt"  # type: ignore[operator]
        topics_path.write_text("-100\tFAITH\t$$T0001\n", encoding="utf-8")

        xref_path = tmp_path / "topicxref.txt"  # type: ignore[operator]
        xref_path.write_text(
            "-100\t-200\t0\t58\t11\t1\tHeb11:1\n"
            "-100\t-300\t0\t58\t11\t1\tHeb11:1\n",  # duplicate verse
            encoding="utf-8",
        )

        extractor = NavesExtractor(cache_dir=tmp_path)  # type: ignore[arg-type]
        _, verses = extractor.extract(use_cache=True)

        assert len(verses) == 1  # deduped


# ── Loader tests ─────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def seeded_naves_db(tmp_path_factory: pytest.TempPathFactory) -> str:
    db_dir = tmp_path_factory.mktemp("naves_db")
    db_path = str(db_dir / "test.duckdb")

    loader = DuckDBLoader(LoadConfig(duckdb_path=db_path))
    loader._ensure_topics_tables()

    topics_df = pd.DataFrame(
        [
            {"topic_id": "-100", "name": "DANCING", "slug": "dancing", "verse_count": 3},
            {"topic_id": "-200", "name": "FAITH", "slug": "faith", "verse_count": 1},
        ]
    )
    loader.load_topics(topics_df)

    verses_df = pd.DataFrame(
        [
            {"topic_id": "-100", "verse_id": "EXO.15.20", "sort_order": 1},
            {"topic_id": "-100", "verse_id": "PSA.149.3", "sort_order": 2},
            {"topic_id": "-100", "verse_id": "PSA.150.4", "sort_order": 3},
            {"topic_id": "-200", "verse_id": "HEB.11.1", "sort_order": 1},
        ]
    )
    loader.load_topic_verses(verses_df)

    loader.close()
    return db_path


class TestNavesLoader:
    def test_topics_loaded(self, seeded_naves_db: str) -> None:
        loader = DuckDBLoader(LoadConfig(duckdb_path=seeded_naves_db))
        df = loader.query("SELECT * FROM topics ORDER BY name")
        loader.close()
        assert len(df) == 2
        assert df.iloc[0]["name"] == "DANCING"
        assert df.iloc[1]["name"] == "FAITH"

    def test_topic_verses_loaded(self, seeded_naves_db: str) -> None:
        loader = DuckDBLoader(LoadConfig(duckdb_path=seeded_naves_db))
        df = loader.query("SELECT * FROM topic_verses WHERE topic_id = '-100' ORDER BY sort_order")
        loader.close()
        assert len(df) == 3
        assert df.iloc[0]["verse_id"] == "EXO.15.20"

    def test_topic_verse_count(self, seeded_naves_db: str) -> None:
        loader = DuckDBLoader(LoadConfig(duckdb_path=seeded_naves_db))
        df = loader.query("SELECT verse_count FROM topics WHERE slug = 'dancing'")
        loader.close()
        assert df.iloc[0]["verse_count"] == 3

    def test_verse_index_works(self, seeded_naves_db: str) -> None:
        """The verse_id index allows reverse lookup: which topics mention HEB.11.1?"""
        loader = DuckDBLoader(LoadConfig(duckdb_path=seeded_naves_db))
        df = loader.query(
            "SELECT t.name FROM topic_verses tv "
            "JOIN topics t ON t.topic_id = tv.topic_id "
            "WHERE tv.verse_id = 'HEB.11.1'"
        )
        loader.close()
        assert len(df) == 1
        assert df.iloc[0]["name"] == "FAITH"
