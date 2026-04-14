"""Tests for the Timeline API endpoints."""

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
    db_dir = tmp_path_factory.mktemp("timeline_api_db")
    db_path = str(db_dir / "test.duckdb")

    loader = DuckDBLoader(LoadConfig(duckdb_path=db_path))
    loader._ensure_theographic_tables()

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
                "verse_refs": json.dumps(["EXO.12.31"]),
            },
            {
                "event_id": "recE2",
                "title": "The Crucifixion",
                "description": None,
                "start_year": 33,
                "sort_key": 33.0,
                "duration": "1D",
                "era": "New Testament",
                "participants": json.dumps(["jesus_1"]),
                "locations": json.dumps(["jerusalem_1"]),
                "verse_refs": json.dumps(["MAT.27.33"]),
            },
            {
                "event_id": "recE3",
                "title": "Fall of Jerusalem",
                "description": "Babylon conquers",
                "start_year": -586,
                "sort_key": 586.0,
                "duration": None,
                "era": "Monarchy",
                "participants": None,
                "locations": json.dumps(["jerusalem_1"]),
                "verse_refs": None,
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


class TestEras:
    def test_list_eras(self, client: TestClient) -> None:
        r = client.get("/api/v1/timeline/eras")
        assert r.status_code == 200
        data = r.json()
        assert len(data["eras"]) >= 6
        era = data["eras"][0]
        assert "id" in era
        assert "name" in era
        assert "start" in era
        assert "end" in era
        assert "color" in era


class TestEvents:
    def test_list_all(self, client: TestClient) -> None:
        r = client.get("/api/v1/timeline/events")
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 3

    def test_filter_by_era(self, client: TestClient) -> None:
        r = client.get("/api/v1/timeline/events?era=New Testament")
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 1
        assert data["events"][0]["title"] == "The Crucifixion"

    def test_filter_by_person(self, client: TestClient) -> None:
        r = client.get("/api/v1/timeline/events?person=moses_1")
        assert r.status_code == 200
        data = r.json()
        assert data["count"] >= 1

    def test_filter_by_year_range(self, client: TestClient) -> None:
        r = client.get("/api/v1/timeline/events?year_min=-600&year_max=0")
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 1
        assert data["events"][0]["title"] == "Fall of Jerusalem"

    def test_participants_parsed(self, client: TestClient) -> None:
        r = client.get("/api/v1/timeline/events?era=Exodus %26 Conquest")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data["events"][0]["participants"], list)


class TestSecularEvents:
    def test_list_all(self, client: TestClient) -> None:
        r = client.get("/api/v1/timeline/secular")
        assert r.status_code == 200
        data = r.json()
        assert data["count"] >= 30

    def test_filter_by_category(self, client: TestClient) -> None:
        r = client.get("/api/v1/timeline/secular?category=Rome")
        assert r.status_code == 200
        data = r.json()
        for e in data["events"]:
            assert e["category"] == "Rome"

    def test_filter_by_year(self, client: TestClient) -> None:
        r = client.get("/api/v1/timeline/secular?year_min=-100&year_max=100")
        assert r.status_code == 200
        data = r.json()
        for e in data["events"]:
            assert -100 <= e["year"] <= 100


class TestCombined:
    def test_combined_response(self, client: TestClient) -> None:
        r = client.get("/api/v1/timeline/combined?year_min=-2200&year_max=100")
        assert r.status_code == 200
        data = r.json()
        assert "biblical" in data
        assert "secular" in data
        assert "eras" in data
        assert len(data["biblical"]) >= 3
        assert len(data["secular"]) >= 20
        # Check structure
        b = data["biblical"][0]
        assert b["type"] == "biblical"
        assert "year" in b
        s = data["secular"][0]
        assert s["type"] == "secular"

    def test_combined_year_filter(self, client: TestClient) -> None:
        r = client.get("/api/v1/timeline/combined?year_min=0&year_max=100")
        assert r.status_code == 200
        data = r.json()
        for evt in data["biblical"]:
            assert 0 <= evt["year"] <= 100
        for evt in data["secular"]:
            assert 0 <= evt["year"] <= 100
