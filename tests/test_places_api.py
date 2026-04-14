"""Tests for the Places API endpoints."""

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
    db_dir = tmp_path_factory.mktemp("places_api_db")
    db_path = str(db_dir / "test.duckdb")

    loader = DuckDBLoader(LoadConfig(duckdb_path=db_path))
    loader._ensure_theographic_tables()

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
                "description": "Holy city of Israel",
                "also_called": json.dumps(["Zion", "Salem"]),
                "verse_count": 811,
            },
            {
                "place_id": "recP2",
                "slug": "bethlehem_1",
                "name": "Bethlehem",
                "latitude": 31.7054,
                "longitude": 35.2024,
                "geo_confidence": 0.92,
                "place_type": "City",
                "description": "Birthplace of Jesus",
                "also_called": None,
                "verse_count": 44,
            },
            {
                "place_id": "recP3",
                "slug": "sinai_1",
                "name": "Mount Sinai",
                "latitude": 28.5394,
                "longitude": 33.9753,
                "geo_confidence": 0.7,
                "place_type": "Mountain",
                "description": "Where God gave the Law",
                "also_called": json.dumps(["Horeb"]),
                "verse_count": 38,
            },
            {
                "place_id": "recP4",
                "slug": "eden_1",
                "name": "Eden",
                "latitude": None,
                "longitude": None,
                "geo_confidence": None,
                "place_type": "Region",
                "description": "Garden of God",
                "also_called": None,
                "verse_count": 16,
            },
        ]
    )
    loader.load_biblical_places(places_df)

    events_df = pd.DataFrame(
        [
            {
                "event_id": "recE1",
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
        ]
    )
    loader.load_biblical_events(events_df)

    loader.close()
    return db_path


@pytest.fixture(scope="module")
def client(seeded_db: str) -> TestClient:
    set_db_path(seeded_db)
    return TestClient(app)


class TestPlacesList:
    def test_list_all(self, client: TestClient) -> None:
        r = client.get("/api/v1/places")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 4

    def test_search_by_name(self, client: TestClient) -> None:
        r = client.get("/api/v1/places?q=jerusalem")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        assert data["results"][0]["name"] == "Jerusalem"

    def test_filter_by_type(self, client: TestClient) -> None:
        r = client.get("/api/v1/places?place_type=Mountain")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["results"][0]["name"] == "Mount Sinai"

    def test_filter_has_coords(self, client: TestClient) -> None:
        r = client.get("/api/v1/places?has_coords=true")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 3  # Eden has no coords

    def test_filter_no_coords(self, client: TestClient) -> None:
        r = client.get("/api/v1/places?has_coords=false")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["results"][0]["name"] == "Eden"


class TestPlaceTypes:
    def test_types(self, client: TestClient) -> None:
        r = client.get("/api/v1/places/types")
        assert r.status_code == 200
        data = r.json()
        type_names = [t["place_type"] for t in data["types"]]
        assert "City" in type_names
        assert "Mountain" in type_names


class TestPlacesGeoJSON:
    def test_geojson(self, client: TestClient) -> None:
        r = client.get("/api/v1/places/geo")
        assert r.status_code == 200
        data = r.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 3  # 3 with coords
        # Check feature structure
        f = data["features"][0]
        assert f["type"] == "Feature"
        assert "coordinates" in f["geometry"]
        assert "name" in f["properties"]

    def test_geojson_filter_by_type(self, client: TestClient) -> None:
        r = client.get("/api/v1/places/geo?place_type=City")
        assert r.status_code == 200
        data = r.json()
        assert len(data["features"]) == 2  # Jerusalem + Bethlehem

    def test_geojson_min_confidence(self, client: TestClient) -> None:
        r = client.get("/api/v1/places/geo?min_confidence=0.9")
        assert r.status_code == 200
        data = r.json()
        assert len(data["features"]) == 2  # Jerusalem (0.95) + Bethlehem (0.92)


class TestPlaceSearch:
    def test_quick_search(self, client: TestClient) -> None:
        r = client.get("/api/v1/places/search?q=sinai")
        assert r.status_code == 200
        data = r.json()
        assert len(data["results"]) >= 1

    def test_search_by_alias(self, client: TestClient) -> None:
        r = client.get("/api/v1/places/search?q=Zion")
        assert r.status_code == 200
        data = r.json()
        assert len(data["results"]) >= 1
        assert data["results"][0]["name"] == "Jerusalem"


class TestPlaceDetail:
    def test_get_by_slug(self, client: TestClient) -> None:
        r = client.get("/api/v1/places/jerusalem_1")
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Jerusalem"
        assert data["latitude"] == pytest.approx(31.7683)
        assert isinstance(data["also_called"], list)
        assert "Zion" in data["also_called"]

    def test_events_at_place(self, client: TestClient) -> None:
        r = client.get("/api/v1/places/jerusalem_1")
        assert r.status_code == 200
        data = r.json()
        assert len(data["events"]) >= 1
        assert data["events"][0]["title"] == "The Crucifixion"

    def test_not_found(self, client: TestClient) -> None:
        r = client.get("/api/v1/places/nonexistent")
        assert r.status_code == 404
