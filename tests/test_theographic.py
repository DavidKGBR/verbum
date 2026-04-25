"""Tests for the Theographic extractor and loader."""

from __future__ import annotations

import json

import pandas as pd
import pytest

from src.config import LoadConfig
from src.load.duckdb_loader import DuckDBLoader
from src.models.theographic import BiblicalEvent, BiblicalPerson, BiblicalPlace, FamilyRelation

# ── Model tests ──────────────────────────────────────────────────────────────


class TestBiblicalPerson:
    def test_basic_creation(self) -> None:
        p = BiblicalPerson(
            person_id="rec123",
            slug="moses_1",
            name="Moses",
            gender="Male",
            birth_year=-1526,
            death_year=-1406,
            verse_count=847,
        )
        assert p.slug == "moses_1"
        assert p.name == "Moses"
        assert p.birth_year == -1526

    def test_optional_fields(self) -> None:
        p = BiblicalPerson(person_id="rec456", slug="unnamed_1", name="Unnamed")
        assert p.gender is None
        assert p.birth_year is None
        assert p.verse_count == 0


class TestBiblicalPlace:
    def test_with_coordinates(self) -> None:
        p = BiblicalPlace(
            place_id="recABC",
            slug="jerusalem_1",
            name="Jerusalem",
            latitude=31.7683,
            longitude=35.2137,
            place_type="City",
            verse_count=811,
        )
        assert p.latitude == pytest.approx(31.7683)
        assert p.longitude == pytest.approx(35.2137)

    def test_without_coordinates(self) -> None:
        p = BiblicalPlace(place_id="recDEF", slug="eden_1", name="Eden")
        assert p.latitude is None
        assert p.longitude is None


class TestBiblicalEvent:
    def test_creation(self) -> None:
        e = BiblicalEvent(
            event_id="recEVT1",
            title="The Exodus",
            start_year=-1446,
            era="Exodus & Conquest",
            participants=json.dumps(["moses_1", "aaron_1"]),
        )
        assert e.title == "The Exodus"
        assert e.era == "Exodus & Conquest"
        participants = json.loads(e.participants)  # type: ignore[arg-type]
        assert "moses_1" in participants


class TestFamilyRelation:
    def test_creation(self) -> None:
        r = FamilyRelation(
            person_id="moses_1",
            related_person_id="aaron_1",
            relation_type="sibling",
        )
        assert r.relation_type == "sibling"


# ── Loader tests ─────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def seeded_theographic_db(tmp_path_factory: pytest.TempPathFactory) -> str:
    db_dir = tmp_path_factory.mktemp("theographic_db")
    db_path = str(db_dir / "test.duckdb")

    loader = DuckDBLoader(LoadConfig(duckdb_path=db_path))
    loader._ensure_theographic_tables()

    # Seed people
    people_df = pd.DataFrame(
        [
            {
                "person_id": "rec1",
                "slug": "moses_1",
                "name": "Moses",
                "gender": "Male",
                "birth_year": -1526,
                "death_year": -1406,
                "description": "Leader of Israel",
                "also_called": json.dumps(["Moshe"]),
                "tribe": "Levi",
                "occupation": "Prophet, Leader",
                "books_mentioned": json.dumps(["EXO", "LEV", "NUM", "DEU"]),
                "verse_count": 847,
                "min_year": -1526,
                "max_year": -1406,
            },
            {
                "person_id": "rec2",
                "slug": "aaron_1",
                "name": "Aaron",
                "gender": "Male",
                "birth_year": -1529,
                "death_year": -1407,
                "description": "High Priest",
                "also_called": None,
                "tribe": "Levi",
                "occupation": "Priest",
                "books_mentioned": json.dumps(["EXO", "LEV", "NUM"]),
                "verse_count": 347,
                "min_year": -1529,
                "max_year": -1407,
            },
        ]
    )
    loader.load_biblical_people(people_df)

    # Seed places
    places_df = pd.DataFrame(
        [
            {
                "place_id": "recP1",
                "slug": "jerusalem_1",
                "name": "Jerusalem",
                "latitude": 31.7683,
                "longitude": 35.2137,
                "geo_confidence": 0.95,
                "place_type": "City",
                "description": "Holy city",
                "also_called": json.dumps(["Zion", "Salem"]),
                "verse_count": 811,
            },
        ]
    )
    loader.load_biblical_places(places_df)

    # Seed events
    events_df = pd.DataFrame(
        [
            {
                "event_id": "recE1",
                "title": "The Exodus",
                "description": "Israel leaves Egypt",
                "start_year": -1446,
                "sort_key": 1446.0,
                "duration": "40Y",
                "era": "Exodus & Conquest",
                "participants": json.dumps(["moses_1", "aaron_1"]),
                "locations": json.dumps(["egypt_1", "sinai_1"]),
                "verse_refs": json.dumps(["EXO.12.31", "EXO.14.21"]),
            },
        ]
    )
    loader.load_biblical_events(events_df)

    # Seed family relations
    rels_df = pd.DataFrame(
        [
            {"person_id": "moses_1", "related_person_id": "aaron_1", "relation_type": "sibling"},
            {"person_id": "aaron_1", "related_person_id": "moses_1", "relation_type": "sibling"},
        ]
    )
    loader.load_family_relations(rels_df)

    loader.close()
    return db_path


class TestTheographicLoader:
    def test_people_loaded(self, seeded_theographic_db: str) -> None:
        loader = DuckDBLoader(LoadConfig(duckdb_path=seeded_theographic_db))
        df = loader.query("SELECT * FROM biblical_people ORDER BY name")
        loader.close()
        assert len(df) == 2
        assert df.iloc[0]["name"] == "Aaron"
        assert df.iloc[1]["name"] == "Moses"

    def test_places_loaded(self, seeded_theographic_db: str) -> None:
        loader = DuckDBLoader(LoadConfig(duckdb_path=seeded_theographic_db))
        df = loader.query("SELECT * FROM biblical_places")
        loader.close()
        assert len(df) == 1
        assert df.iloc[0]["name"] == "Jerusalem"
        assert df.iloc[0]["latitude"] == pytest.approx(31.7683)

    def test_events_loaded(self, seeded_theographic_db: str) -> None:
        loader = DuckDBLoader(LoadConfig(duckdb_path=seeded_theographic_db))
        df = loader.query("SELECT * FROM biblical_events")
        loader.close()
        assert len(df) == 1
        assert df.iloc[0]["title"] == "The Exodus"
        assert df.iloc[0]["era"] == "Exodus & Conquest"

    def test_family_relations_loaded(self, seeded_theographic_db: str) -> None:
        loader = DuckDBLoader(LoadConfig(duckdb_path=seeded_theographic_db))
        df = loader.query("SELECT * FROM family_relations WHERE person_id = 'moses_1'")
        loader.close()
        assert len(df) == 1
        assert df.iloc[0]["related_person_id"] == "aaron_1"
        assert df.iloc[0]["relation_type"] == "sibling"

    def test_theographic_counts_direct(self, seeded_theographic_db: str) -> None:
        loader = DuckDBLoader(LoadConfig(duckdb_path=seeded_theographic_db))
        people = loader.query("SELECT COUNT(*) AS n FROM biblical_people").iloc[0]["n"]
        places = loader.query("SELECT COUNT(*) AS n FROM biblical_places").iloc[0]["n"]
        events = loader.query("SELECT COUNT(*) AS n FROM biblical_events").iloc[0]["n"]
        rels = loader.query("SELECT COUNT(*) AS n FROM family_relations").iloc[0]["n"]
        loader.close()
        assert people == 2
        assert places == 1
        assert events == 1
        assert rels == 2
