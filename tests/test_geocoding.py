"""Tests for the OpenBible Geocoding extractor and enrichment loader."""

from __future__ import annotations

import json

import pandas as pd
import pytest

from src.config import LoadConfig
from src.extract.openbible_geocoding import GeocodingRecord, OpenBibleGeoExtractor
from src.load.duckdb_loader import DuckDBLoader

# ── Model tests ──────────────────────────────────────────────────────────────


class TestGeocodingRecord:
    def test_creation(self) -> None:
        r = GeocodingRecord(
            name="Jerusalem",
            friendly_id="Jerusalem",
            place_type="settlement",
            latitude=31.7683,
            longitude=35.2137,
            confidence=0.95,
        )
        assert r.name == "Jerusalem"
        assert r.latitude == pytest.approx(31.7683)
        assert r.confidence == pytest.approx(0.95)


# ── Extractor parsing test ───────────────────────────────────────────────────


class TestExtractorParsing:
    def test_parse_single_record(self, tmp_path: str) -> None:
        """Test parsing a minimal ancient.jsonl record."""
        record = {
            "friendly_id": "Jerusalem",
            "preceding_article": "",
            "type": "settlement",
            "identifications": [
                {
                    "resolutions": [
                        {
                            "lonlat": "35.2137,31.7683",
                            "best_path_score": 950,
                        }
                    ],
                }
            ],
        }
        jsonl_path = tmp_path / "ancient.jsonl"  # type: ignore[operator]
        jsonl_path.write_text(json.dumps(record) + "\n", encoding="utf-8")

        extractor = OpenBibleGeoExtractor(cache_dir=tmp_path)  # type: ignore[arg-type]
        # Write to cache location so _fetch finds it
        records = extractor.extract(use_cache=True)

        assert len(records) == 1
        assert records[0].name == "Jerusalem"
        assert records[0].latitude == pytest.approx(31.7683)
        assert records[0].longitude == pytest.approx(35.2137)
        assert records[0].confidence == pytest.approx(0.95)

    def test_parse_with_article(self, tmp_path: str) -> None:
        record = {
            "friendly_id": "Red Sea",
            "preceding_article": "the",
            "type": "water",
            "identifications": [{"resolutions": [{"lonlat": "36.0,22.0", "best_path_score": 700}]}],
        }
        jsonl_path = tmp_path / "ancient.jsonl"  # type: ignore[operator]
        jsonl_path.write_text(json.dumps(record) + "\n", encoding="utf-8")

        extractor = OpenBibleGeoExtractor(cache_dir=tmp_path)  # type: ignore[arg-type]
        records = extractor.extract(use_cache=True)

        assert len(records) == 1
        assert records[0].name == "the Red Sea"
        assert records[0].confidence == pytest.approx(0.7)

    def test_skip_record_without_resolution(self, tmp_path: str) -> None:
        record = {
            "friendly_id": "UnknownPlace",
            "type": "region",
            "identifications": [{"resolutions": []}],
        }
        jsonl_path = tmp_path / "ancient.jsonl"  # type: ignore[operator]
        jsonl_path.write_text(json.dumps(record) + "\n", encoding="utf-8")

        extractor = OpenBibleGeoExtractor(cache_dir=tmp_path)  # type: ignore[arg-type]
        records = extractor.extract(use_cache=True)

        assert len(records) == 0

    def test_picks_best_resolution(self, tmp_path: str) -> None:
        record = {
            "friendly_id": "Bethel",
            "type": "settlement",
            "identifications": [
                {
                    "resolutions": [
                        {"lonlat": "35.0,31.0", "best_path_score": 200},
                        {"lonlat": "35.5,31.5", "best_path_score": 800},
                    ]
                },
                {
                    "resolutions": [
                        {"lonlat": "35.1,31.1", "best_path_score": 500},
                    ]
                },
            ],
        }
        jsonl_path = tmp_path / "ancient.jsonl"  # type: ignore[operator]
        jsonl_path.write_text(json.dumps(record) + "\n", encoding="utf-8")

        extractor = OpenBibleGeoExtractor(cache_dir=tmp_path)  # type: ignore[arg-type]
        records = extractor.extract(use_cache=True)

        assert len(records) == 1
        # Should pick the second resolution (score 800)
        assert records[0].latitude == pytest.approx(31.5)
        assert records[0].longitude == pytest.approx(35.5)
        assert records[0].confidence == pytest.approx(0.8)


# ── Enrichment loader tests ─────────────────────────────────────────────────


@pytest.fixture(scope="module")
def geo_db(tmp_path_factory: pytest.TempPathFactory) -> str:
    db_dir = tmp_path_factory.mktemp("geo_db")
    db_path = str(db_dir / "test.duckdb")

    loader = DuckDBLoader(LoadConfig(duckdb_path=db_path))
    loader._ensure_theographic_tables()

    # Seed places — Jerusalem has coords, Bethel doesn't
    places_df = pd.DataFrame(
        [
            {
                "place_id": "recP1",
                "slug": "jerusalem_1",
                "name": "Jerusalem",
                "latitude": 31.76,
                "longitude": 35.21,
                "geo_confidence": 0.5,
                "place_type": "City",
                "description": None,
                "also_called": None,
                "verse_count": 811,
            },
            {
                "place_id": "recP2",
                "slug": "bethel_1",
                "name": "Bethel",
                "latitude": None,
                "longitude": None,
                "geo_confidence": None,
                "place_type": None,
                "description": None,
                "also_called": None,
                "verse_count": 66,
            },
        ]
    )
    loader.load_biblical_places(places_df)
    loader.close()
    return db_path


class TestGeocodingEnrichment:
    def test_enriches_missing_coords(self, geo_db: str) -> None:
        loader = DuckDBLoader(LoadConfig(duckdb_path=geo_db))

        geo_df = pd.DataFrame(
            [
                {
                    "name": "Bethel",
                    "latitude": 31.924,
                    "longitude": 35.234,
                    "geo_confidence": 0.75,
                    "place_type": "settlement",
                },
            ]
        )
        total = loader.enrich_places_geocoding(geo_df)
        assert total >= 2  # Jerusalem + Bethel now both have coords

        # Verify Bethel got coordinates
        df = loader.query(
            "SELECT latitude, longitude, geo_confidence FROM biblical_places "
            "WHERE slug = 'bethel_1'"
        )
        loader.close()
        assert df.iloc[0]["latitude"] == pytest.approx(31.924)
        assert df.iloc[0]["geo_confidence"] == pytest.approx(0.75)

    def test_updates_when_higher_confidence(self, geo_db: str) -> None:
        loader = DuckDBLoader(LoadConfig(duckdb_path=geo_db))

        # Jerusalem already has confidence 0.5, provide higher
        geo_df = pd.DataFrame(
            [
                {
                    "name": "Jerusalem",
                    "latitude": 31.7683,
                    "longitude": 35.2137,
                    "geo_confidence": 0.95,
                    "place_type": "settlement",
                },
            ]
        )
        loader.enrich_places_geocoding(geo_df)

        df = loader.query("SELECT geo_confidence FROM biblical_places WHERE slug = 'jerusalem_1'")
        loader.close()
        assert df.iloc[0]["geo_confidence"] == pytest.approx(0.95)

    def test_inserts_new_places(self, geo_db: str) -> None:
        loader = DuckDBLoader(LoadConfig(duckdb_path=geo_db))

        geo_df = pd.DataFrame(
            [
                {
                    "name": "Nineveh",
                    "latitude": 36.3589,
                    "longitude": 43.1531,
                    "geo_confidence": 0.9,
                    "place_type": "settlement",
                },
            ]
        )
        loader.enrich_places_geocoding(geo_df)

        df = loader.query(
            "SELECT name, latitude FROM biblical_places WHERE LOWER(name) = 'nineveh'"
        )
        loader.close()
        assert len(df) == 1
        assert df.iloc[0]["latitude"] == pytest.approx(36.3589)
