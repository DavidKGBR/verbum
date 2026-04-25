"""
migrate_strongs_multilang.py — R3.6.0 schema migration

Creates the `strongs_lexicon_multilang` table in bible.duckdb (analytics DB).
Safe to run multiple times (idempotent via CREATE TABLE IF NOT EXISTS).

Usage:
    python scripts/migrate_strongs_multilang.py [--db PATH]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import duckdb

DB_DEFAULT = Path(__file__).parent.parent / "data" / "analytics" / "bible.duckdb"

DDL = """
CREATE TABLE IF NOT EXISTS strongs_lexicon_multilang (
    strongs_id       TEXT NOT NULL,
    lang             TEXT NOT NULL,       -- 'pt' | 'es'
    short_definition TEXT,
    long_definition  TEXT,
    confidence       REAL,                -- 0.0–1.0 (1.0 = human-verified)
    notes            TEXT,                -- rationale / divergence
    labeled_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (strongs_id, lang)
);
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Create strongs_lexicon_multilang table")
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
        count = conn.execute("SELECT COUNT(*) FROM strongs_lexicon_multilang").fetchone()[0]  # type: ignore[index]
        print(f"OK  strongs_lexicon_multilang created / already exists. Current rows: {count}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
