"""
prep_strongs_batch.py — R3.6 batch preparation

Generates a TSV file with the fields needed for LLM translation of Strong's entries.
Output columns: strongs_id | orig_language | original | transliteration | short_def_en | long_def_en

Usage examples:
    # First 500 Hebrew entries (by numeric sort of strongs_id)
    python scripts/prep_strongs_batch.py --language hebrew --offset 0 --limit 500

    # Greek entries 1001-2000
    python scripts/prep_strongs_batch.py --language greek --offset 1000 --limit 1000

    # Already-labeled rows are excluded by default (--skip-translated)
    python scripts/prep_strongs_batch.py --language hebrew --offset 0 --limit 1000 \\
        --target-lang pt --skip-translated

Options:
    --language    hebrew | greek        (default: hebrew)
    --target-lang pt | es               (default: pt)
    --offset      int                   (default: 0)
    --limit       int                   (default: 500)
    --skip-translated                   skip rows already in strongs_lexicon_multilang
    --out         PATH                  (default: stdout)
    --db          PATH                  (default: data/analytics/bible.duckdb)
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

import duckdb

DB_DEFAULT = Path(__file__).parent.parent / "data" / "analytics" / "bible.duckdb"


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare Strong's batch TSV for translation")
    parser.add_argument("--language", choices=["hebrew", "greek"], default="hebrew")
    parser.add_argument("--target-lang", choices=["pt", "es"], default="pt")
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--limit", type=int, default=500)
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
        params: list = [args.language, args.limit, args.offset]

        if args.skip_translated:
            skip_clause = f"""
                AND s.strongs_id NOT IN (
                    SELECT strongs_id FROM strongs_lexicon_multilang WHERE lang = ?
                )
            """
            params = [args.language, args.target_lang, args.limit, args.offset]

        # Numeric sort for Hebrew (H1, H2, ..., H8674) and Greek (G1, ..., G5624)
        rows = conn.execute(
            f"""
            SELECT
                s.strongs_id,
                s.language           AS orig_language,
                s.original,
                s.transliteration,
                s.short_definition   AS short_def_en,
                s.long_definition    AS long_def_en
            FROM strongs_lexicon s
            WHERE s.language = ?
            {skip_clause}
            ORDER BY CAST(regexp_replace(s.strongs_id, '[HG]', '') AS INTEGER)
            LIMIT ? OFFSET ?
            """,
            params,
        ).fetchall()
    finally:
        conn.close()

    fieldnames = ["strongs_id", "orig_language", "original", "transliteration",
                  "short_def_en", "long_def_en"]

    import io
    if args.out:
        out_file = open(args.out, "w", encoding="utf-8", newline="")
    else:
        out_file = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", newline="")  # type: ignore[assignment]

    try:
        writer = csv.DictWriter(out_file, fieldnames=fieldnames, delimiter="\t",
                                extrasaction="ignore")
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
