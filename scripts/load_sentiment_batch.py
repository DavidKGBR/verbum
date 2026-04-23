"""Load a JSONL sentiment batch into DuckDB (idempotent upsert).

Usage:
    python scripts/load_sentiment_batch.py data/processed/sentiment_pt/PSA/batch_001_output.jsonl

Each line must be JSON with at least:
    { "verse_id": "PSA.23.1", "polarity_pt": 0.85, "label_pt": "positive" }

Optional fields: confidence (0-1), notes (str).
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import duckdb

DB_PATH = "data/analytics/bible.duckdb"


def main() -> None:
    parser = argparse.ArgumentParser(description="Load sentiment JSONL into DuckDB")
    parser.add_argument("files", nargs="+", help="JSONL file(s) to load")
    args = parser.parse_args()

    conn = duckdb.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS verses_sentiment_multilang (
            verse_id   VARCHAR NOT NULL,
            lang       VARCHAR NOT NULL,
            polarity   DOUBLE NOT NULL,
            label      VARCHAR NOT NULL,
            confidence REAL,
            notes      VARCHAR,
            labeled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (verse_id, lang)
        );
    """)

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
            obj = json.loads(line)
            rows.append(obj)

        for r in rows:
            verse_id = r["verse_id"]
            polarity = float(r.get("polarity_pt", r.get("polarity", 0)))
            label = r.get("label_pt", r.get("label", "neutral"))
            confidence = r.get("confidence")
            notes = r.get("notes")

            conn.execute(
                """
                INSERT INTO verses_sentiment_multilang
                    (verse_id, lang, polarity, label, confidence, notes)
                VALUES (?, 'pt', ?, ?, ?, ?)
                ON CONFLICT (verse_id, lang)
                DO UPDATE SET
                    polarity   = EXCLUDED.polarity,
                    label      = EXCLUDED.label,
                    confidence = EXCLUDED.confidence,
                    notes      = EXCLUDED.notes,
                    labeled_at = now()
                """,
                [verse_id, polarity, label, confidence, notes],
            )

        total += len(rows)
        print(f"  {p.name}: {len(rows)} rows loaded")

    conn.close()
    print(f"\nTotal: {total} rows upserted.")


if __name__ == "__main__":
    main()
