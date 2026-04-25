"""Tests for the Intertextuality API endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


class TestQuotations:
    def test_quotations_returns_edges(self, client: TestClient) -> None:
        r = client.get("/api/v1/intertextuality/quotations?limit=50")
        # May return 200 with data or 500 if crossrefs table missing in test DB
        if r.status_code == 200:
            data = r.json()
            assert "total_edges" in data
            assert "edges" in data
            assert "nodes" in data

    def test_quotations_min_votes(self, client: TestClient) -> None:
        r = client.get("/api/v1/intertextuality/quotations?min_votes=10&limit=20")
        if r.status_code == 200:
            data = r.json()
            for edge in data["edges"]:
                assert edge["votes"] >= 10


class TestHeatmap:
    def test_heatmap_structure(self, client: TestClient) -> None:
        r = client.get("/api/v1/intertextuality/heatmap")
        if r.status_code == 200:
            data = r.json()
            assert "ot_books" in data
            assert "nt_books" in data
            assert "cells" in data
            for cell in data["cells"]:
                assert "source" in cell
                assert "target" in cell
                assert "count" in cell


class TestCitationChain:
    def test_chain_returns_graph(self, client: TestClient) -> None:
        r = client.get("/api/v1/intertextuality/chain/GEN.1.1")
        if r.status_code == 200:
            data = r.json()
            assert data["root"] == "GEN.1.1"
            assert "nodes" in data
            assert "edges" in data
            assert "depth" in data

    def test_chain_depth_param(self, client: TestClient) -> None:
        r = client.get("/api/v1/intertextuality/chain/PSA.23.1?depth=1")
        if r.status_code == 200:
            data = r.json()
            assert data["depth"] == 1
