"""
migrate_dictionary_multilang.py — R6.dictionary schema migration

Creates the `dictionary_entries_multilang` table in bible.duckdb.
One row per (slug, lang) with the translated text_easton + text_smith
columns in the same shape the frontend already renders, so the API
overlay stays a 1:1 mapping.

Safe to run multiple times (idempotent via CREATE TABLE IF NOT EXISTS).

Usage:
    python scripts/migrate_dictionary_multilang.py [--db PATH]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import duckdb

DB_DEFAULT = Path(__file__).parent.parent / "data" / "analytics" / "bible.duckdb"

DDL = """
CREATE TABLE IF NOT EXISTS dictionary_entries_multilang (
    slug         TEXT NOT NULL,
    lang         TEXT NOT NULL,       -- 'pt' | 'es'
    text_easton  TEXT,                -- NULL if the source entry has no Easton body
    text_smith   TEXT,                -- NULL if the source entry has no Smith body
    confidence   REAL,                -- 0.0–1.0 (1.0 = human-reviewed)
    notes        TEXT,                -- rationale / divergence / "auto: claude-opus"
    labeled_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (slug, lang)
);
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Create dictionary_entries_multilang table")
    parser.add_argument("--db", default=str(DB_DEFAULT), help="Path to bible.duckdb")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"ERROR: DB not found at {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = duckdb.connect(str(db_path))
    try:
        conn.execute(DDL)
        conn.commit()
        count = conn.execute(
            "SELECT COUNT(*) FROM dictionary_entries_multilang"
        ).fetchone()[0]  # type: ignore[index]
        print(
            f"OK  dictionary_entries_multilang created / already exists. "
            f"Current rows: {count}"
        )
    finally:
        conn.close()


if __name__ == "__main__":
    main()
