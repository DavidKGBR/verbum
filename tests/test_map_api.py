"""Tests for the Map-related API endpoints (GeoJSON + routes)."""

from __future__ import annotations

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from src.api.dependencies import set_db_path
from src.api.main import app
from src.config import LoadConfig
from src.load.duckdb_loader import DuckDBLoader


@pytest.fixture(scope="module")
def seeded_db(tmp_path_factory: pytest.TempPathFactory) -> str:
    db_dir = tmp_path_factory.mktemp("map_api_db")
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
                "description": None,
                "also_called": None,
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
                "description": None,
                "also_called": None,
                "verse_count": 44,
            },
        ]
    )
    loader.load_biblical_places(places_df)
    loader.close()
    return db_path


@pytest.fixture(scope="module")
def client(seeded_db: str) -> TestClient:
    set_db_path(seeded_db)
    return TestClient(app)


class TestGeoJSON:
    def test_geojson_structure(self, client: TestClient) -> None:
        r = client.get("/api/v1/places/geo")
        assert r.status_code == 200
        data = r.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 2

        f = data["features"][0]
        assert f["type"] == "Feature"
        assert f["geometry"]["type"] == "Point"
        assert len(f["geometry"]["coordinates"]) == 2
        assert "name" in f["properties"]
        assert "verse_count" in f["properties"]


class TestRoutes:
    def test_list_routes(self, client: TestClient) -> None:
        r = client.get("/api/v1/places/routes")
        assert r.status_code == 200
        data = r.json()
        assert "routes" in data
        assert len(data["routes"]) >= 5  # exodus + 4 paul journeys + abraham
        for route in data["routes"]:
            assert "id" in route
            assert "name" in route
            assert "waypoints" in route
            assert len(route["waypoints"]) >= 2
            assert "lat" in route["waypoints"][0]
            assert "lon" in route["waypoints"][0]

    def test_filter_by_era(self, client: TestClient) -> None:
        r = client.get("/api/v1/places/routes?era=New Testament")
        assert r.status_code == 200
        data = r.json()
        for route in data["routes"]:
            assert route["era"] == "New Testament"
        assert len(data["routes"]) >= 3  # paul's 3 journeys + rome

    def test_route_has_color(self, client: TestClient) -> None:
        r = client.get("/api/v1/places/routes")
        data = r.json()
        for route in data["routes"]:
            assert "color" in route
            assert route["color"].startswith("#")
