"""
prep_dictionary_turns.py — Pre-flight TSV generator for the R6.dictionary marathon

Generates N chunked TSVs in a stable alphabetical order so two Claude sessions
can work in parallel (one top-down, one bottom-up) without collision.

Each chunk produces `<out-dir>/dict_turn_NNN.tsv` with columns:
    slug | name | source | text_easton_en | text_smith_en

Only slugs NOT yet present in `dictionary_entries_multilang WHERE lang='pt'`
are included. Because PT+ES are translated together (same turn), missing PT
implies missing ES — checking PT alone is enough.

Usage:
    python scripts/prep_dictionary_turns.py --chunk 150 --out-dir /tmp

    # Custom chunk size / output dir
    python scripts/prep_dictionary_turns.py --chunk 100 --out-dir /tmp/dict_turns

The plan file checklist at C:\\Users\\david\\.claude\\plans\\binary-booping-lighthouse.md
should already reference turn numbers matching the --chunk value chosen here.
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

import duckdb

DB_DEFAULT = Path(__file__).parent.parent / "data" / "analytics" / "bible.duckdb"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate chunked TSVs for the dictionary translation marathon"
    )
    parser.add_argument(
        "--chunk",
        type=int,
        default=0,
        help="Slugs per TSV (fixed-size chunking). If 0, use --char-budget instead.",
    )
    parser.add_argument(
        "--char-budget",
        type=int,
        default=45000,
        help="Target chars (EN) per chunk when --chunk is 0. Default: 45000",
    )
    parser.add_argument(
        "--out-dir",
        default="/tmp",
        help="Directory where dict_turn_NNN.tsv files are written (default: /tmp)",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Delete existing dict_turn_*.tsv in out-dir before writing (prevents stale files)",
    )
    parser.add_argument("--db", default=str(DB_DEFAULT))
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"ERROR: DB not found at {db_path}", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    conn = duckdb.connect(str(db_path), read_only=True)
    try:
        rows = conn.execute(
            """
            SELECT d.slug, d.name, d.source,
                   d.text_easton AS text_easton_en,
                   d.text_smith  AS text_smith_en
            FROM dictionary_entries d
            WHERE d.slug NOT IN (
                SELECT slug FROM dictionary_entries_multilang WHERE lang = 'pt'
            )
            ORDER BY LOWER(d.slug)
            """
        ).fetchall()
    finally:
        conn.close()

    total = len(rows)
    if total == 0:
        print("No untranslated slugs remaining. Marathon complete.")
        return

    if args.clean:
        import glob
        removed = 0
        for stale in glob.glob(str(out_dir / "dict_turn_*.tsv")):
            Path(stale).unlink()
            removed += 1
        if removed:
            print(f"Removed {removed} stale dict_turn_*.tsv from {out_dir}")

    # Build chunks
    chunks: list[list[tuple]] = []
    if args.chunk > 0:
        chunk_mode = f"fixed {args.chunk} slugs"
        for start in range(0, total, args.chunk):
            chunks.append(rows[start : start + args.chunk])
    else:
        chunk_mode = f"char-weighted ~{args.char_budget} chars/chunk"
        current: list[tuple] = []
        current_chars = 0
        for row in rows:
            # row: (slug, name, source, text_easton_en, text_smith_en)
            chars = len(row[3] or "") + len(row[4] or "")
            if current_chars + chars > args.char_budget and current:
                chunks.append(current)
                current = []
                current_chars = 0
            current.append(row)
            current_chars += chars
        if current:
            chunks.append(current)

    fieldnames = ["slug", "name", "source", "text_easton_en", "text_smith_en"]
    turn_summaries: list[str] = []

    for i, chunk in enumerate(chunks, 1):
        out_path = out_dir / f"dict_turn_{i:03d}.tsv"
        with open(out_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(
                f, fieldnames=fieldnames, delimiter="\t", extrasaction="ignore"
            )
            writer.writeheader()
            for row in chunk:
                writer.writerow(dict(zip(fieldnames, row)))

        first_slug = chunk[0][0]
        last_slug = chunk[-1][0]
        chunk_chars = sum(len(r[3] or "") + len(r[4] or "") for r in chunk)
        turn_summaries.append(
            f"  Turn {i:03d} | {first_slug} -> {last_slug} | "
            f"{len(chunk)} slugs, {chunk_chars:,} chars"
        )

    print(f"OK  Wrote {len(chunks)} TSV file(s) to {out_dir}")
    print(f"    Total slugs: {total}")
    print(f"    Chunk mode:  {chunk_mode}")
    print("")
    print("Summary:")
    for line in turn_summaries:
        print(line)


if __name__ == "__main__":
    main()
