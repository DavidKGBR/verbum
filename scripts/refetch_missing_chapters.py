"""
📥 R4.F — Refetch missing chapters from bible-api.com

The initial extraction of Darby, ASV and WEB (bible-api.com translations)
lost ~100 chapters each — intermittent rate-limits / timeouts that the
original retry logic didn't recover from. This script:

1. Reads every raw cache JSON for the target translation(s).
2. Compares each book's chapter set against KJV (reference canon).
3. Re-fetches every missing chapter via BibleApiComSource.
4. Merges the new verses into the existing JSON file on disk.

Usage:
    python scripts/refetch_missing_chapters.py                # all three
    python scripts/refetch_missing_chapters.py --only darby
    python scripts/refetch_missing_chapters.py --dry-run      # audit only

After running, re-run the pipeline with ALL 12 translations:
    PYTHONIOENCODING=utf-8 python -m src.cli run --translations \\
        kjv,bbe,nvi,ra,acf,rvr,apee,neue,asv,web,darby,luther
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.extract.bible_sources import BibleApiComSource  # noqa: E402
from src.models.schemas import BOOK_CATALOG  # noqa: E402

DEFAULT_TARGETS = ["darby", "asv", "web"]
RAW_DIR = PROJECT_ROOT / "data" / "raw"


def load_reference_chapter_counts() -> dict[str, list[int]]:
    """Use KJV cache as canonical chapter list per book."""
    kjv_dir = RAW_DIR / "kjv"
    expected: dict[str, list[int]] = {}
    for fn in sorted(kjv_dir.glob("*.json")):
        data = json.loads(fn.read_text(encoding="utf-8"))
        chapters = sorted({
            v["chapter"] for v in data
            if isinstance(v, dict) and "chapter" in v
        })
        expected[fn.stem] = chapters
    return expected


def audit_translation(
    trans: str, reference: dict[str, list[int]]
) -> list[tuple[str, int]]:
    """Return list of (book_id_lower, chapter_int) that are missing."""
    t_dir = RAW_DIR / trans
    gaps: list[tuple[str, int]] = []
    for fn in sorted(t_dir.glob("*.json")):
        b = fn.stem
        try:
            data = json.loads(fn.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"  WARN: cannot read {fn}: {exc}", file=sys.stderr)
            continue
        present = {v["chapter"] for v in data if isinstance(v, dict) and "chapter" in v}
        expected_chs = reference.get(b, [])
        for ch in expected_chs:
            if ch not in present:
                gaps.append((b, ch))
    return gaps


def find_book_name(book_id_lower: str) -> str | None:
    """Look up canonical book_name from BOOK_CATALOG."""
    bid_upper = book_id_lower.upper()
    for b in BOOK_CATALOG:
        if b["id"] == bid_upper:
            return b["name"]
    return None


def refetch_and_merge(trans: str, gaps: list[tuple[str, int]]) -> int:
    """Refetch each missing chapter and merge into the on-disk JSON."""
    source = BibleApiComSource(trans)
    total_new_verses = 0

    # Group gaps by book for efficient per-file I/O
    by_book: dict[str, list[int]] = {}
    for b, ch in gaps:
        by_book.setdefault(b, []).append(ch)

    try:
        for book_id_lower, chapters in by_book.items():
            book_name = find_book_name(book_id_lower)
            if not book_name:
                print(f"  SKIP {book_id_lower}: no book_name in catalog", flush=True)
                continue

            fn = RAW_DIR / trans / f"{book_id_lower}.json"
            existing = json.loads(fn.read_text(encoding="utf-8"))
            # Drop any stale entries for the target chapters (defensive)
            existing = [
                v for v in existing
                if not (isinstance(v, dict) and v.get("chapter") in chapters)
            ]

            for ch in sorted(chapters):
                verses = source.fetch_chapter(book_name, ch)
                if not verses:
                    print(f"  MISS {trans} {book_name} {ch}: 0 verses returned", flush=True)
                    continue
                dumped = [v.model_dump() for v in verses]
                existing.extend(dumped)
                total_new_verses += len(dumped)
                print(
                    f"  OK   {trans} {book_name} {ch}: +{len(dumped)} verses",
                    flush=True,
                )

            # Sort final output by chapter, verse for tidiness
            existing.sort(
                key=lambda v: (
                    v.get("chapter", 0) if isinstance(v, dict) else 0,
                    v.get("verse", 0) if isinstance(v, dict) else 0,
                )
            )
            fn.write_text(
                json.dumps(existing, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
    finally:
        source.close()

    return total_new_verses


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--only",
        choices=DEFAULT_TARGETS + ["all"],
        default="all",
        help="Refetch a single translation (default: all three).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Audit only; no fetches.")
    args = parser.parse_args()

    targets = DEFAULT_TARGETS if args.only == "all" else [args.only]

    print("Loading KJV reference chapter counts...", flush=True)
    reference = load_reference_chapter_counts()
    print(f"  {len(reference)} books in KJV reference", flush=True)
    print()

    grand_total_gaps = 0
    for trans in targets:
        print(f"=== {trans.upper()} ===", flush=True)
        gaps = audit_translation(trans, reference)
        print(f"  {len(gaps)} missing chapters across "
              f"{len({b for b, _ in gaps})} books", flush=True)
        grand_total_gaps += len(gaps)

        if args.dry_run or not gaps:
            continue

        added = refetch_and_merge(trans, gaps)
        print(f"  Added {added} verses to {trans} raw cache\n", flush=True)

    print(f"\nGrand total: {grand_total_gaps} gaps identified "
          f"across {len(targets)} translation(s)", flush=True)
    if args.dry_run:
        return

    print(
        "\nDone. Now re-run the pipeline (all 12 translations) to reload DuckDB:\n"
        "  PYTHONIOENCODING=utf-8 python -m src.cli run --translations "
        "kjv,bbe,nvi,ra,acf,rvr,apee,neue,asv,web,darby,luther",
        flush=True,
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        sys.exit(130)
