"""
strongs_coverage.py — R3.6 coverage dashboard

Shows translation coverage for strongs_lexicon_multilang.
Saves snapshot to data/processed/strongs_multilang/coverage.json.

Usage:
    python scripts/strongs_coverage.py
    python scripts/strongs_coverage.py --db data/analytics/bible.duckdb
    python scripts/strongs_coverage.py --no-save    # print only, no file write
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import duckdb

DB_DEFAULT = Path(__file__).parent.parent / "data" / "analytics" / "bible.duckdb"
COVERAGE_DIR = Path(__file__).parent.parent / "data" / "processed" / "strongs_multilang"


def main() -> None:
    parser = argparse.ArgumentParser(description="Strong's multilang coverage dashboard")
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
        # Total per language in strongs_lexicon
        totals = dict(conn.execute(
            "SELECT language, COUNT(*) FROM strongs_lexicon GROUP BY language"
        ).fetchall())

        # Covered per lang × target_lang in multilang
        covered_rows = conn.execute(
            """
            SELECT s.language AS orig_lang, m.lang AS target_lang, COUNT(*) AS cnt
            FROM strongs_lexicon_multilang m
            JOIN strongs_lexicon s ON s.strongs_id = m.strongs_id
            WHERE m.short_definition IS NOT NULL
            GROUP BY s.language, m.lang
            ORDER BY s.language, m.lang
            """
        ).fetchall()
    finally:
        conn.close()

    covered: dict[tuple[str, str], int] = {}
    for orig_lang, target_lang, cnt in covered_rows:
        covered[(orig_lang, target_lang)] = cnt

    total_he = totals.get("hebrew", 0)
    total_gr = totals.get("greek", 0)
    total_all = total_he + total_gr

    print("=" * 55)
    print("  Strong's Multilingual Coverage - VERBUM R3.6")
    print("=" * 55)

    coverage_data: dict = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "totals": {"hebrew": total_he, "greek": total_gr, "all": total_all},
        "covered": {},
    }

    for orig_lang, total in [("hebrew", total_he), ("greek", total_gr)]:
        print(f"\n  {orig_lang.upper()} ({total} entries)")
        for target_lang in ("pt", "es"):
            cnt = covered.get((orig_lang, target_lang), 0)
            pct = cnt / total * 100 if total else 0
            bar_len = int(pct / 2)
            bar = "#" * bar_len + "." * (50 - bar_len)
            print(f"    {target_lang.upper()}  {cnt:>5}/{total}  {pct:5.1f}%  [{bar}]")
            key = f"{orig_lang}_{target_lang}"
            coverage_data["covered"][key] = {"count": cnt, "total": total, "pct": round(pct, 2)}

    # Overall
    total_slots = total_all * 2  # × 2 languages
    covered_slots = sum(covered.values())
    overall_pct = covered_slots / total_slots * 100 if total_slots else 0
    print(f"\n  OVERALL  {covered_slots}/{total_slots} definition slots  ({overall_pct:.1f}%)")
    print("=" * 55)

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
