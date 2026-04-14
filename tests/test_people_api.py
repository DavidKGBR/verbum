"""Tests for the People API endpoints."""

from __future__ import annotations

import json

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from src.api.dependencies import set_db_path
from src.api.main import app
from src.config import LoadConfig
from src.load.duckdb_loader import DuckDBLoader


@pytest.fixture(scope="module")
def seeded_db(tmp_path_factory: pytest.TempPathFactory) -> str:
    db_dir = tmp_path_factory.mktemp("people_api_db")
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
            {
                "person_id": "rec3",
                "slug": "miriam_1",
                "name": "Miriam",
                "gender": "Female",
                "birth_year": -1533,
                "death_year": None,
                "description": "Prophetess, sister of Moses",
                "also_called": None,
                "tribe": "Levi",
                "occupation": "Prophetess",
                "books_mentioned": json.dumps(["EXO", "NUM"]),
                "verse_count": 15,
                "min_year": -1533,
                "max_year": None,
            },
        ]
    )
    loader.load_biblical_people(people_df)

    # Seed family relations
    rels_df = pd.DataFrame(
        [
            {"person_id": "moses_1", "related_person_id": "aaron_1", "relation_type": "sibling"},
            {"person_id": "moses_1", "related_person_id": "miriam_1", "relation_type": "sibling"},
            {"person_id": "aaron_1", "related_person_id": "moses_1", "relation_type": "sibling"},
        ]
    )
    loader.load_family_relations(rels_df)

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
                "locations": json.dumps(["egypt_1"]),
                "verse_refs": json.dumps(["EXO.12.31"]),
            },
        ]
    )
    loader.load_biblical_events(events_df)

    loader.close()
    return db_path


@pytest.fixture(scope="module")
def client(seeded_db: str) -> TestClient:
    set_db_path(seeded_db)
    return TestClient(app)


class TestPeopleList:
    def test_list_all(self, client: TestClient) -> None:
        r = client.get("/api/v1/people")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 3
        assert len(data["results"]) == 3

    def test_search_by_name(self, client: TestClient) -> None:
        r = client.get("/api/v1/people?q=moses")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        names = [p["name"] for p in data["results"]]
        assert "Moses" in names

    def test_filter_by_gender(self, client: TestClient) -> None:
        r = client.get("/api/v1/people?gender=Female")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["results"][0]["name"] == "Miriam"

    def test_filter_by_book(self, client: TestClient) -> None:
        r = client.get("/api/v1/people?book=DEU")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        # Only Moses is mentioned in DEU
        names = [p["name"] for p in data["results"]]
        assert "Moses" in names

    def test_pagination(self, client: TestClient) -> None:
        r = client.get("/api/v1/people?limit=2&offset=0")
        assert r.status_code == 200
        data = r.json()
        assert len(data["results"]) == 2
        assert data["total"] == 3


class TestPeopleSearch:
    def test_quick_search(self, client: TestClient) -> None:
        r = client.get("/api/v1/people/search?q=aaron")
        assert r.status_code == 200
        data = r.json()
        assert len(data["results"]) >= 1
        assert data["results"][0]["name"] == "Aaron"


class TestPersonDetail:
    def test_get_by_slug(self, client: TestClient) -> None:
        r = client.get("/api/v1/people/moses_1")
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Moses"
        assert data["gender"] == "Male"
        assert "EXO" in data["books_mentioned"]

    def test_not_found(self, client: TestClient) -> None:
        r = client.get("/api/v1/people/nonexistent")
        assert r.status_code == 404


class TestPersonFamily:
    def test_family_relations(self, client: TestClient) -> None:
        r = client.get("/api/v1/people/moses_1/family")
        assert r.status_code == 200
        data = r.json()
        assert data["person"] == "moses_1"
        assert "sibling" in data["relations"]
        sibling_names = [s["name"] for s in data["relations"]["sibling"]]
        assert "Aaron" in sibling_names
        assert "Miriam" in sibling_names


class TestPersonEvents:
    def test_events(self, client: TestClient) -> None:
        r = client.get("/api/v1/people/moses_1/events")
        assert r.status_code == 200
        data = r.json()
        assert len(data["events"]) >= 1
        assert data["events"][0]["title"] == "The Exodus"
