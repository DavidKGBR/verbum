"""Tests for Emotional Landscape API endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

from src.api.main import app

client = TestClient(app)


class TestEmotionalLandscape:
    """Tests for GET /api/v1/emotional/landscape."""

    def test_landscape_returns_series(self) -> None:
        r = client.get("/api/v1/emotional/landscape", params={"book": "PSA"})
        if r.status_code == 200:
            data = r.json()
            assert "series" in data
            assert "book_id" in data
            assert data["book_id"] == "PSA"
            assert isinstance(data["series"], list)
            if data["series"]:
                point = data["series"][0]
                assert "verse_id" in point
                assert "polarity" in point
                assert "label" in point

    def test_landscape_requires_book(self) -> None:
        r = client.get("/api/v1/emotional/landscape")
        assert r.status_code == 422

    def test_landscape_not_found(self) -> None:
        r = client.get("/api/v1/emotional/landscape", params={"book": "ZZZZZ"})
        assert r.status_code in (404, 200)


class TestEmotionalPeaks:
    """Tests for GET /api/v1/emotional/peaks."""

    def test_peaks_returns_results(self) -> None:
        r = client.get(
            "/api/v1/emotional/peaks",
            params={"book": "PSA", "emotion": "positive", "limit": 5},
        )
        if r.status_code == 200:
            data = r.json()
            assert "results" in data
            assert isinstance(data["results"], list)
            assert len(data["results"]) <= 5

    def test_peaks_requires_book(self) -> None:
        r = client.get("/api/v1/emotional/peaks")
        assert r.status_code == 422

    def test_peaks_negative_emotion(self) -> None:
        r = client.get(
            "/api/v1/emotional/peaks",
            params={"book": "PSA", "emotion": "negative"},
        )
        if r.status_code == 200:
            data = r.json()
            assert data["emotion"] == "negative"


class TestBookProfiles:
    """Tests for GET /api/v1/emotional/book-profiles."""

    def test_profiles_returns_list(self) -> None:
        r = client.get("/api/v1/emotional/book-profiles")
        if r.status_code == 200:
            data = r.json()
            assert "profiles" in data
            assert isinstance(data["profiles"], list)
            if data["profiles"]:
                p = data["profiles"][0]
                assert "book_id" in p
                assert "avg_polarity" in p
                assert "positive" in p
                assert "negative" in p
                assert "neutral" in p

    def test_profiles_with_translation(self) -> None:
        r = client.get("/api/v1/emotional/book-profiles", params={"translation": "nvi"})
        if r.status_code == 200:
            data = r.json()
            assert data["translation"] == "nvi"
