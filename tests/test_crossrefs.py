"""
🧪 Tests — Cross-References (Sprint 2)
"""

import pandas as pd
import pytest

from src.config import LoadConfig
from src.extract.crossref_extractor import (
    CrossRefExtractor,
    parse_crossref_line,
    parse_openbible_ref,
)
from src.load.duckdb_loader import DuckDBLoader
from src.models.schemas import CrossReference, RawCrossReference
from src.transform.crossref_mapper import (
    classify_reference_type,
    crossrefs_to_dataframe,
    transform_crossrefs,
)

# ─── OpenBible Reference Parsing ─────────────────────────────────────────────


class TestParseOpenbibleRef:
    def test_genesis(self):
        assert parse_openbible_ref("Gen.1.1") == "GEN.1.1"

    def test_matthew(self):
        assert parse_openbible_ref("Matt.11.25") == "MAT.11.25"

    def test_psalms(self):
        assert parse_openbible_ref("Ps.23.1") == "PSA.23.1"

    def test_revelation(self):
        assert parse_openbible_ref("Rev.22.21") == "REV.22.21"

    def test_range_takes_first(self):
        assert parse_openbible_ref("Col.1.16-Col.1.17") == "COL.1.16"

    def test_unknown_book(self):
        assert parse_openbible_ref("Unknown.1.1") is None

    def test_invalid_format(self):
        assert parse_openbible_ref("Gen.1") is None
        assert parse_openbible_ref("Gen") is None

    def test_all_books_mapped(self):
        """Every book in the mapping should produce a valid result."""
        from src.extract.crossref_extractor import _OPENBIBLE_TO_BOOK_ID

        for abbrev, book_id in _OPENBIBLE_TO_BOOK_ID.items():
            result = parse_openbible_ref(f"{abbrev}.1.1")
            assert result is not None, f"Failed for {abbrev}"
            assert result.startswith(book_id), f"{abbrev} -> {result}, expected {book_id}"


# ─── TSV Line Parsing ────────────────────────────────────────────────────────


class TestParseCrossrefLine:
    def test_valid_line(self):
        ref = parse_crossref_line("Gen.1.1\tMatt.11.25\t13")
        assert ref is not None
        assert ref.source_verse_id == "GEN.1.1"
        assert ref.target_verse_id == "MAT.11.25"
        assert ref.votes == 13

    def test_line_with_range(self):
        ref = parse_crossref_line("Gen.1.1\tCol.1.16-Col.1.17\t161")
        assert ref is not None
        assert ref.target_verse_id == "COL.1.16"
        assert ref.votes == 161

    def test_header_line_skipped(self):
        ref = parse_crossref_line("From Verse\tTo Verse\tVotes\t#www.openbible.info")
        assert ref is None

    def test_comment_skipped(self):
        ref = parse_crossref_line("# comment")
        assert ref is None

    def test_empty_line_skipped(self):
        ref = parse_crossref_line("")
        assert ref is None

    def test_invalid_ref_returns_none(self):
        ref = parse_crossref_line("Unknown.1.1\tGen.1.1\t1")
        assert ref is None


# ─── Extractor Tests ─────────────────────────────────────────────────────────


class TestCrossRefExtractor:
    def test_parse_tsv_content(self):
        content = (
            "From Verse\tTo Verse\tVotes\t#www.openbible.info\n"
            "Gen.1.1\tMatt.11.25\t13\n"
            "Gen.1.1\tPs.96.5\t59\n"
            "# comment\n"
            "Unknown.1.1\tGen.1.1\t1\n"
        )
        extractor = CrossRefExtractor()
        refs = extractor._parse_tsv(content)
        assert len(refs) == 2
        assert refs[0].source_verse_id == "GEN.1.1"
        assert refs[0].target_verse_id == "MAT.11.25"
        assert refs[1].target_verse_id == "PSA.96.5"

    def test_parse_deduplicates(self):
        content = "Gen.1.1\tMatt.11.25\t13\nGen.1.1\tMatt.11.25\t5\n"
        extractor = CrossRefExtractor()
        refs = extractor._parse_tsv(content)
        assert len(refs) == 1

    def test_cache_round_trip(self, tmp_path):
        extractor = CrossRefExtractor(cache_dir=tmp_path)
        refs = [
            RawCrossReference(source_verse_id="GEN.1.1", target_verse_id="JHN.3.16", votes=5),
        ]
        extractor._save_to_cache(refs)
        loaded = extractor._load_from_cache()
        assert loaded is not None
        assert len(loaded) == 1
        assert loaded[0].source_verse_id == "GEN.1.1"


# ─── Mapper / Transform Tests ────────────────────────────────────────────────


class TestClassifyReferenceType:
    def test_direct_nearby(self):
        assert classify_reference_type(1, 2, 1) == "direct"

    def test_direct_same_book(self):
        assert classify_reference_type(1, 1, 0) == "direct"

    def test_thematic_medium_distance(self):
        assert classify_reference_type(1, 20, 19) == "thematic"

    def test_prophetic_large_distance(self):
        assert classify_reference_type(1, 66, 65) == "prophetic"


class TestTransformCrossrefs:
    @pytest.fixture
    def sample_raw_refs(self):
        return [
            RawCrossReference(source_verse_id="GEN.1.1", target_verse_id="JHN.1.1", votes=5),
            RawCrossReference(source_verse_id="PSA.23.1", target_verse_id="JHN.10.11", votes=3),
            RawCrossReference(source_verse_id="ISA.53.5", target_verse_id="1PE.2.24", votes=4),
        ]

    def test_transforms_all_valid(self, sample_raw_refs):
        refs, stats = transform_crossrefs(sample_raw_refs)
        assert len(refs) == 3
        assert stats.total_refs == 3

    def test_enriches_with_positions(self, sample_raw_refs):
        refs, _ = transform_crossrefs(sample_raw_refs)
        gen_ref = refs[0]
        assert gen_ref.source_book_id == "GEN"
        assert gen_ref.target_book_id == "JHN"
        assert gen_ref.source_book_position == 1
        assert gen_ref.target_book_position == 43
        assert gen_ref.arc_distance == 42

    def test_classifies_types(self, sample_raw_refs):
        refs, _ = transform_crossrefs(sample_raw_refs)
        assert refs[0].reference_type == "prophetic"

    def test_skips_self_references(self):
        raw = [RawCrossReference(source_verse_id="GEN.1.1", target_verse_id="GEN.1.1", votes=1)]
        refs, stats = transform_crossrefs(raw)
        assert len(refs) == 0

    def test_skips_invalid_book_ids(self):
        raw = [RawCrossReference(source_verse_id="XXX.1.1", target_verse_id="GEN.1.1", votes=1)]
        refs, _ = transform_crossrefs(raw)
        assert len(refs) == 0

    def test_stats_computation(self, sample_raw_refs):
        _, stats = transform_crossrefs(sample_raw_refs)
        assert stats.total_refs == 3
        assert stats.unique_book_pairs == 3
        assert stats.avg_arc_distance > 0

    def test_testament_crossing_stats(self, sample_raw_refs):
        _, stats = transform_crossrefs(sample_raw_refs)
        assert stats.refs_old_to_new == 3


class TestCrossrefsToDataframe:
    def test_converts_to_dataframe(self):
        refs = [
            CrossReference(
                source_verse_id="GEN.1.1",
                target_verse_id="JHN.1.1",
                source_book_id="GEN",
                target_book_id="JHN",
                source_book_position=1,
                target_book_position=43,
                votes=5,
                reference_type="prophetic",
            ),
        ]
        df = crossrefs_to_dataframe(refs)
        assert len(df) == 1
        assert df.iloc[0]["arc_distance"] == 42

    def test_empty_returns_empty_df(self):
        df = crossrefs_to_dataframe([])
        assert df.empty


# ─── DuckDB Integration Tests ────────────────────────────────────────────────


class TestDuckDBCrossRefs:
    @pytest.fixture
    def tmp_db(self, tmp_path) -> DuckDBLoader:
        config = LoadConfig(duckdb_path=str(tmp_path / "test.duckdb"))
        loader = DuckDBLoader(config)
        loader.create_schema()
        yield loader
        loader.close()

    @pytest.fixture
    def sample_crossref_df(self):
        return pd.DataFrame(
            [
                {
                    "source_verse_id": "GEN.1.1",
                    "target_verse_id": "JHN.1.1",
                    "source_book_id": "GEN",
                    "target_book_id": "JHN",
                    "source_book_position": 1,
                    "target_book_position": 43,
                    "votes": 5,
                    "reference_type": "prophetic",
                    "arc_distance": 42,
                },
                {
                    "source_verse_id": "PSA.23.1",
                    "target_verse_id": "JHN.10.11",
                    "source_book_id": "PSA",
                    "target_book_id": "JHN",
                    "source_book_position": 19,
                    "target_book_position": 43,
                    "votes": 3,
                    "reference_type": "prophetic",
                    "arc_distance": 24,
                },
            ]
        )

    def test_cross_references_table_exists(self, tmp_db):
        tables = tmp_db.query("SHOW TABLES")
        assert "cross_references" in tables["name"].tolist()

    def test_load_cross_references(self, tmp_db, sample_crossref_df):
        count = tmp_db.load_cross_references(sample_crossref_df)
        assert count == 2

    def test_load_is_idempotent(self, tmp_db, sample_crossref_df):
        tmp_db.load_cross_references(sample_crossref_df)
        count = tmp_db.load_cross_references(sample_crossref_df)
        assert count == 2

    def test_crossref_arcs_view(self, tmp_db, sample_crossref_df):
        tmp_db.load_cross_references(sample_crossref_df)
        result = tmp_db.query("SELECT * FROM v_crossref_arcs")
        assert len(result) == 2
        assert "connection_count" in result.columns

    def test_most_connected_books_view(self, tmp_db, sample_crossref_df):
        tmp_db.load_cross_references(sample_crossref_df)
        result = tmp_db.query("SELECT * FROM v_most_connected_books")
        assert len(result) > 0
        assert "total_connections" in result.columns

    def test_summary_includes_crossrefs(self, tmp_db, sample_crossref_df):
        tmp_db.load_cross_references(sample_crossref_df)
        summary = tmp_db.get_summary()
        assert summary["total_crossrefs"] == 2

    def test_load_empty_df(self, tmp_db):
        count = tmp_db.load_cross_references(pd.DataFrame())
        assert count == 0
