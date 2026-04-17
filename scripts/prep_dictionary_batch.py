"""
prep_dictionary_batch.py — R6.dictionary batch preparation

Generates a TSV file with the fields needed for LLM translation of the
Easton + Smith dictionary entries.

Output columns: slug | name | source | text_easton_en | text_smith_en

Already-labeled rows (present in dictionary_entries_multilang for the
target lang) are excluded when --skip-translated is passed.

Usage:
    # First 300 entries for Portuguese, skipping anything already done
    python scripts/prep_dictionary_batch.py --lang pt --skip-translated \\
        --limit 300 --out /tmp/dict_pt_batch_01.tsv

    # Spanish, offset-based pagination
    python scripts/prep_dictionary_batch.py --lang es --offset 900 --limit 300
"""
from __future__ import annotations

import argparse
import csv
import io
import sys
from pathlib import Path

import duckdb

DB_DEFAULT = Path(__file__).parent.parent / "data" / "analytics" / "bible.duckdb"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prepare dictionary batch TSV for translation"
    )
    parser.add_argument("--lang", choices=["pt", "es"], default="pt",
                        help="Target language (controls --skip-translated lookup)")
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--limit", type=int, default=300)
    parser.add_argument("--skip-translated", action="store_true", default=False)
    parser.add_argument("--out", default=None, help="Output TSV path (default: stdout)")
    parser.add_argument("--db", default=str(DB_DEFAULT))
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"ERROR: DB not found at {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = duckdb.connect(str(db_path), read_only=True)
    try:
        skip_clause = ""
        params: list = [args.limit, args.offset]

        if args.skip_translated:
            skip_clause = """
                WHERE d.slug NOT IN (
                    SELECT slug FROM dictionary_entries_multilang WHERE lang = ?
                )
            """
            params = [args.lang, args.limit, args.offset]

        rows = conn.execute(
            f"""
            SELECT d.slug, d.name, d.source,
                   d.text_easton AS text_easton_en,
                   d.text_smith  AS text_smith_en
            FROM dictionary_entries d
            {skip_clause}
            ORDER BY LOWER(d.slug)
            LIMIT ? OFFSET ?
            """,
            params,
        ).fetchall()
    finally:
        conn.close()

    fieldnames = ["slug", "name", "source", "text_easton_en", "text_smith_en"]

    if args.out:
        out_file = open(args.out, "w", encoding="utf-8", newline="")
    else:
        out_file = io.TextIOWrapper(  # type: ignore[assignment]
            sys.stdout.buffer, encoding="utf-8", newline=""
        )

    try:
        writer = csv.DictWriter(
            out_file, fieldnames=fieldnames, delimiter="\t", extrasaction="ignore"
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(dict(zip(fieldnames, row)))
        out_file.flush()
    finally:
        if args.out:
            out_file.close()

    if args.out:
        print(f"OK  Wrote {len(rows)} rows to {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
