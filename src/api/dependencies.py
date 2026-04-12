"""
🔌 API Dependencies
Database connection pool and shared resources for FastAPI endpoints.
"""

from __future__ import annotations

from pathlib import Path

import duckdb

from src.config import DATA_DIR

# Module-level path, overridable for testing
_db_path: str = str(DATA_DIR / "analytics" / "bible.duckdb")


def set_db_path(path: str) -> None:
    """Override the database path (used in testing)."""
    global _db_path
    _db_path = path


def get_db() -> duckdb.DuckDBPyConnection:
    """Get a read-only DuckDB connection."""
    if not Path(_db_path).exists():
        raise FileNotFoundError(
            f"Database not found at {_db_path}. Run the pipeline first: "
            "python -m src.cli run --books GEN"
        )
    return duckdb.connect(_db_path, read_only=True)
