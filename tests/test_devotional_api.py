"""Tests for the Devotional API endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


class TestDevotionalPlans:
    def test_list_plans(self, client: TestClient) -> None:
        r = client.get("/api/v1/devotional/plans")
        assert r.status_code == 200
        data = r.json()
        assert data["count"] >= 5
        p = data["plans"][0]
        assert "id" in p
        assert "title" in p
        assert "days" in p

    def test_get_plan(self, client: TestClient) -> None:
        r = client.get("/api/v1/devotional/plans/names-of-god")
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "Names of God"
        assert data["days"] == 7
        assert len(data["readings"]) == 7
        reading = data["readings"][0]
        assert "day" in reading
        assert "title" in reading
        assert "passage" in reading
        assert "reflection" in reading

    def test_plan_not_found(self, client: TestClient) -> None:
        r = client.get("/api/v1/devotional/plans/nonexistent")
        assert r.status_code == 404

    def test_get_all_plan_ids(self, client: TestClient) -> None:
        r = client.get("/api/v1/devotional/plans")
        data = r.json()
        plan_ids = [p["id"] for p in data["plans"]]
        assert "names-of-god" in plan_ids
        assert "psalms-of-comfort" in plan_ids
        assert "parables-of-jesus" in plan_ids
        assert "women-of-faith" in plan_ids
        assert "armor-of-god" in plan_ids


class TestDayReading:
    def test_get_day(self, client: TestClient) -> None:
        r = client.get("/api/v1/devotional/plans/names-of-god/day/1")
        assert r.status_code == 200
        data = r.json()
        assert data["day"] == 1
        assert data["plan_id"] == "names-of-god"
        assert "Elohim" in data["title"]
        assert "reflection" in data
        assert "verses" in data

    def test_day_not_found(self, client: TestClient) -> None:
        r = client.get("/api/v1/devotional/plans/names-of-god/day/99")
        assert r.status_code == 404

    def test_plan_not_found_for_day(self, client: TestClient) -> None:
        r = client.get("/api/v1/devotional/plans/nonexistent/day/1")
        assert r.status_code == 404
