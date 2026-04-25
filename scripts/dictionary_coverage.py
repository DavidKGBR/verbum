"""
dictionary_coverage.py — R6.dictionary coverage dashboard

Shows translation coverage for dictionary_entries_multilang broken down by
source (Easton vs Smith) and language (PT vs ES). Entries whose original
row lacked a given source (e.g. a slug only present in Smith) are counted
in the total for that source so the percentage stays honest.

Saves snapshot to data/processed/dictionary_multilang/coverage.json.

Usage:
    python scripts/dictionary_coverage.py
    python scripts/dictionary_coverage.py --no-save
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import duckdb

DB_DEFAULT = Path(__file__).parent.parent / "data" / "analytics" / "bible.duckdb"
COVERAGE_DIR = Path(__file__).parent.parent / "data" / "processed" / "dictionary_multilang"


def main() -> None:
    parser = argparse.ArgumentParser(description="Dictionary multilang coverage dashboard")
    parser.add_argument("--db", default=str(DB_DEFAULT))
    parser.add_argument("--no-save", action="store_true", default=False,
                        help="Do not write coverage.json")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"ERROR: DB not found at {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = duckdb.connect(str(db_path), read_only=True)
    try:
        totals = conn.execute(
            """
            SELECT
                COUNT(*)                                               AS total_entries,
                COUNT(*) FILTER (WHERE text_easton IS NOT NULL)        AS total_easton,
                COUNT(*) FILTER (WHERE text_smith  IS NOT NULL)        AS total_smith
            FROM dictionary_entries
            """
        ).fetchone()
        total_entries, total_easton, total_smith = totals  # type: ignore[misc]

        covered_rows = conn.execute(
            """
            SELECT
                m.lang,
                COUNT(*) FILTER (WHERE m.text_easton IS NOT NULL) AS easton_cnt,
                COUNT(*) FILTER (WHERE m.text_smith  IS NOT NULL) AS smith_cnt,
                COUNT(*)                                          AS any_cnt
            FROM dictionary_entries_multilang m
            GROUP BY m.lang
            ORDER BY m.lang
            """
        ).fetchall()
    finally:
        conn.close()

    covered: dict[str, dict[str, int]] = {}
    for lang, easton_cnt, smith_cnt, any_cnt in covered_rows:
        covered[lang] = {
            "easton": easton_cnt,
            "smith": smith_cnt,
            "any": any_cnt,
        }

    print("=" * 65)
    print("  Dictionary Multilingual Coverage - VERBUM R6")
    print("=" * 65)
    print(f"  Source totals: {total_entries} entries · "
          f"{total_easton} with Easton · {total_smith} with Smith")

    coverage_data: dict = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "totals": {
            "entries": total_entries,
            "easton": total_easton,
            "smith": total_smith,
        },
        "covered": {},
    }

    for lang in ("pt", "es"):
        c = covered.get(lang, {"easton": 0, "smith": 0, "any": 0})
        print(f"\n  {lang.upper()}")
        for label, cnt, total in (
            ("Easton", c["easton"], total_easton),
            ("Smith ", c["smith"],  total_smith),
            ("Any   ", c["any"],    total_entries),
        ):
            pct = cnt / total * 100 if total else 0
            bar_len = int(pct / 2)
            bar = "#" * bar_len + "." * (50 - bar_len)
            print(f"    {label}  {cnt:>5}/{total:<5}  {pct:5.1f}%  [{bar}]")

        coverage_data["covered"][lang] = {
            "easton": {"count": c["easton"], "total": total_easton,
                       "pct": round((c["easton"] / total_easton * 100) if total_easton else 0, 2)},
            "smith":  {"count": c["smith"],  "total": total_smith,
                       "pct": round((c["smith"] / total_smith * 100) if total_smith else 0, 2)},
            "any":    {"count": c["any"],    "total": total_entries,
                       "pct": round((c["any"] / total_entries * 100) if total_entries else 0, 2)},
        }

    # Overall slots: sum of EAS + SMI per language (both slots exist when source has both)
    total_slots = (total_easton + total_smith) * 2  # × 2 target languages
    covered_slots = sum(c["easton"] + c["smith"] for c in covered.values())
    overall_pct = covered_slots / total_slots * 100 if total_slots else 0
    print(
        f"\n  OVERALL  {covered_slots}/{total_slots} translation slots  "
        f"({overall_pct:.1f}%)"
    )
    print("=" * 65)

    coverage_data["overall"] = {
        "covered_slots": covered_slots,
        "total_slots": total_slots,
        "pct": round(overall_pct, 2),
    }

    if not args.no_save:
        COVERAGE_DIR.mkdir(parents=True, exist_ok=True)
        out_path = COVERAGE_DIR / "coverage.json"
        out_path.write_text(json.dumps(coverage_data, indent=2), encoding="utf-8")
        print(f"\n  Snapshot saved -> {out_path}")


if __name__ == "__main__":
    main()
