"""Load a JSONL community notes seed into DuckDB (idempotent upsert).

Usage:
    python scripts/load_community_seed.py data/static/community_notes_seed.jsonl

Each line must be JSON with at least:
    { "verse_id": "JHN.3.16",
      "category": "theology",
      "title": "...", "title_pt": "...", "title_es": "...",
      "content": "...", "content_pt": "...", "content_es": "...",
      "author": "Verbum",
      "date": "2026-04-23" }

Idempotent: re-running upserts on (verse_id, category, author, date).
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import duckdb

DB_PATH = "data/analytics/bible.duckdb"


def note_id(row: dict) -> str:
    """Stable ID derived from verse_id+category+author+date."""
    base = f"{row['verse_id']}|{row['category']}|{row.get('author','')}|{row.get('date','')}"
    return hashlib.sha1(base.encode("utf-8")).hexdigest()[:16]


def main() -> None:
    parser = argparse.ArgumentParser(description="Load community notes JSONL into DuckDB")
    parser.add_argument("files", nargs="+", help="JSONL file(s) to load")
    args = parser.parse_args()

    conn = duckdb.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS community_notes (
            note_id     VARCHAR PRIMARY KEY,
            verse_id    VARCHAR NOT NULL,
            category    VARCHAR NOT NULL,
            author      VARCHAR,
            date        DATE,
            title       VARCHAR,
            title_pt    VARCHAR,
            title_es    VARCHAR,
            content     VARCHAR,
            content_pt  VARCHAR,
            content_es  VARCHAR,
            loaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_community_notes_verse "
        "ON community_notes(verse_id);"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_community_notes_category "
        "ON community_notes(category);"
    )

    total = 0
    for fpath in args.files:
        p = Path(fpath)
        if not p.exists():
            print(f"  SKIP {p} (not found)")
            continue

        rows: list[dict] = []
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))

        for r in rows:
            nid = note_id(r)
            conn.execute(
                """
                INSERT INTO community_notes
                    (note_id, verse_id, category, author, date,
                     title, title_pt, title_es,
                     content, content_pt, content_es)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (note_id) DO UPDATE SET
                    verse_id   = EXCLUDED.verse_id,
                    category   = EXCLUDED.category,
                    author     = EXCLUDED.author,
                    date       = EXCLUDED.date,
                    title      = EXCLUDED.title,
                    title_pt   = EXCLUDED.title_pt,
                    title_es   = EXCLUDED.title_es,
                    content    = EXCLUDED.content,
                    content_pt = EXCLUDED.content_pt,
                    content_es = EXCLUDED.content_es,
                    loaded_at  = now()
                """,
                [
                    nid,
                    r["verse_id"],
                    r["category"],
                    r.get("author"),
                    r.get("date"),
                    r.get("title"),
                    r.get("title_pt"),
                    r.get("title_es"),
                    r.get("content"),
                    r.get("content_pt"),
                    r.get("content_es"),
                ],
            )

        total += len(rows)
        print(f"  {p.name}: {len(rows)} rows upserted")

    conn.close()
    print(f"\nTotal: {total} rows upserted into community_notes.")


if __name__ == "__main__":
    main()
