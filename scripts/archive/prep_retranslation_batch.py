"""
prep_retranslation_batch.py — Identify and chunk entries needing re-translation

After fix_truncated_entries.py extended the English source text from the original
ThML XMLs, many existing PT/ES translations only cover a fraction of the full text.
This script detects those entries (EN > 3× max(PT, ES) in combined char length)
and writes chunked TSVs for the re-translation marathon.

Usage:
    python scripts/prep_retranslation_batch.py --out-dir tmp_turns/retranslation
    python scripts/prep_retranslation_batch.py --char-budget 60000 --out-dir tmp_turns/retranslation --clean
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

import duckdb

DB_DEFAULT = Path(__file__).parent.parent / "data" / "analytics" / "bible.duckdb"

DETECT_SQL = """
SELECT d.slug, d.name, d.source,
       d.text_easton  AS text_easton_en,
       d.text_smith   AS text_smith_en,
       LENGTH(COALESCE(d.text_easton, '')) + LENGTH(COALESCE(d.text_smith, '')) AS en_chars,
       GREATEST(
         LENGTH(COALESCE(m_pt.text_easton, '')) + LENGTH(COALESCE(m_pt.text_smith, '')),
         LENGTH(COALESCE(m_es.text_easton, '')) + LENGTH(COALESCE(m_es.text_smith, ''))
       ) AS max_trans_chars
FROM dictionary_entries d
LEFT JOIN dictionary_entries_multilang m_pt
  ON d.slug = m_pt.slug AND m_pt.lang = 'pt'
LEFT JOIN dictionary_entries_multilang m_es
  ON d.slug = m_es.slug AND m_es.lang = 'es'
WHERE (LENGTH(COALESCE(d.text_easton, '')) + LENGTH(COALESCE(d.text_smith, '')))
      > ? * GREATEST(
          LENGTH(COALESCE(m_pt.text_easton, '')) + LENGTH(COALESCE(m_pt.text_smith, '')),
          LENGTH(COALESCE(m_es.text_easton, '')) + LENGTH(COALESCE(m_es.text_smith, ''))
        )
ORDER BY LOWER(d.slug)
"""


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Detect and chunk entries needing re-translation after EN text extension"
    )
    parser.add_argument(
        "--char-budget", type=int, default=60000,
        help="Target EN chars per turn (default: 60000)",
    )
    parser.add_argument(
        "--ratio", type=float, default=3.0,
        help="Minimum EN/translation ratio to flag as needing re-translation (default: 3.0)",
    )
    parser.add_argument(
        "--out-dir", default="tmp_turns/retranslation",
        help="Directory for retrans_NNN.tsv files",
    )
    parser.add_argument("--clean", action="store_true", help="Delete stale retrans_*.tsv first")
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
        rows = conn.execute(DETECT_SQL, [args.ratio]).fetchall()
    finally:
        conn.close()

    total = len(rows)
    if total == 0:
        print("No entries need re-translation. All translations are proportional to EN source.")
        return

    total_en = sum(r[5] for r in rows)
    total_trans = sum(r[6] for r in rows)
    print(f"Found {total} entries needing re-translation (ratio > {args.ratio}:1)")
    print(f"  EN total: {total_en:,} chars | best translation: {total_trans:,} chars")
    print(f"  Gap: ~{total_en - total_trans:,} chars per language\n")

    if args.clean:
        import glob as glob_mod
        removed = 0
        for stale in glob_mod.glob(str(out_dir / "retrans_*.tsv")):
            Path(stale).unlink()
            removed += 1
        if removed:
            print(f"Removed {removed} stale retrans_*.tsv from {out_dir}")

    chunks: list[list[tuple]] = []
    current: list[tuple] = []
    current_chars = 0
    for row in rows:
        en_chars = row[5]
        if en_chars > args.char_budget:
            if current:
                chunks.append(current)
                current = []
                current_chars = 0
            chunks.append([row])
        elif current_chars + en_chars > args.char_budget and current:
            chunks.append(current)
            current = [row]
            current_chars = en_chars
        else:
            current.append(row)
            current_chars += en_chars
    if current:
        chunks.append(current)

    fieldnames = ["slug", "name", "source", "text_easton_en", "text_smith_en"]

    print(f"Writing {len(chunks)} turn(s) to {out_dir}  (budget: {args.char_budget:,} chars)\n")
    print(f"  {'Turn':<7} {'Slugs':>6} {'EN chars':>10}  {'First':<30} {'Last':<30}")
    print(f"  {'-' * 87}")

    for i, chunk in enumerate(chunks, 1):
        out_path = out_dir / f"retrans_{i:03d}.tsv"
        with open(out_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter="\t", extrasaction="ignore")
            writer.writeheader()
            for row in chunk:
                writer.writerow(dict(zip(fieldnames, row[:5])))

        chunk_chars = sum(r[5] for r in chunk)
        first_slug = chunk[0][0]
        last_slug = chunk[-1][0]
        oversized = " [OVERSIZED]" if len(chunk) == 1 and chunk_chars > args.char_budget else ""
        print(f"  {i:03d}     {len(chunk):>6} {chunk_chars:>10,}  {first_slug:<30} {last_slug:<30}{oversized}")

    print(f"\nDone. {total} slugs across {len(chunks)} turns.")


if __name__ == "__main__":
    main()
