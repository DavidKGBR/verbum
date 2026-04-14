"""Tests for the Word Journey API endpoint."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


class TestWordJourney:
    def test_journey_returns_eras(self, client: TestClient) -> None:
        # H430 = Elohim — very common word across all eras
        r = client.get("/api/v1/words/H430/journey")
        assert r.status_code in (200, 404)
        if r.status_code == 200:
            data = r.json()
            assert data["strongs_id"] == "H430"
            assert "journey" in data
            assert data["total_eras"] >= 1
            assert data["total_occurrences"] >= 1

            era = data["journey"][0]
            assert "era" in era
            assert "total_occurrences" in era
            assert "book_count" in era
            assert "top_glosses" in era
            assert "top_books" in era

    def test_journey_not_found(self, client: TestClient) -> None:
        r = client.get("/api/v1/words/H99999/journey")
        assert r.status_code == 404

    def test_journey_era_order(self, client: TestClient) -> None:
        r = client.get("/api/v1/words/H430/journey")
        if r.status_code != 200:
            pytest.skip("No interlinear data")
        data = r.json()
        era_order = [
            "Pentateuch",
            "History",
            "Poetry",
            "Prophets",
            "Gospels",
            "Epistles",
            "Apocalyptic",
        ]
        returned_eras = [e["era"] for e in data["journey"]]
        # Verify returned eras are in the correct relative order
        for i, era in enumerate(returned_eras):
            if era in era_order:
                idx = era_order.index(era)
                for prev_era in returned_eras[:i]:
                    if prev_era in era_order:
                        assert era_order.index(prev_era) < idx
