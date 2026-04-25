"""
🔧 One-shot: retrofit HTML entities in existing DuckDB verses.

The cleaning pipeline now runs html.unescape() on every verse, but rows already
loaded into DuckDB (before this fix) may contain sequences like `&#x27;`,
`&amp;`, `&lt;`, etc. This script scans those rows, decodes them, and UPDATEs
in place — no re-extract needed.

Usage:
    python scripts/fix_html_entities.py             # default DuckDB path from config
    python scripts/fix_html_entities.py path/to.duckdb
"""

from __future__ import annotations

import html
import sys

import duckdb

from src.config import LoadConfig

SUSPECT_PATTERN_SQL = """
    SELECT verse_id, translation_id, text
    FROM verses
    WHERE text LIKE '%&#%'
       OR text LIKE '%&amp%'
       OR text LIKE '%&lt%'
       OR text LIKE '%&gt%'
       OR text LIKE '%&quot%'
       OR text LIKE '%&apos%'
"""


def main() -> int:
    db_path = sys.argv[1] if len(sys.argv) > 1 else LoadConfig().duckdb_path
    print(f"🔎 Opening DuckDB at: {db_path}")

    conn = duckdb.connect(db_path)
    try:
        rows = conn.execute(SUSPECT_PATTERN_SQL).fetchall()
        print(f"🔍 Found {len(rows)} verses with suspected HTML entities.")

        if not rows:
            print("✅ Nothing to fix.")
            return 0

        updated = 0
        for verse_id, translation_id, text in rows:
            decoded = html.unescape(text)
            if decoded != text:
                conn.execute(
                    "UPDATE verses SET text = ? WHERE verse_id = ? AND translation_id = ?",
                    [decoded, verse_id, translation_id],
                )
                updated += 1

        print(f"✅ Updated {updated} rows (of {len(rows)} scanned).")

        # Sanity: show a few examples after fix
        sample = conn.execute(
            """
            SELECT verse_id, translation_id, text
            FROM verses
            WHERE verse_id IN ('GEN.3.15', 'GEN.3.1', 'JOB.3.1')
            ORDER BY translation_id, verse_id
            LIMIT 6
            """
        ).fetchall()
        if sample:
            print("\nSample rows after fix:")
            for vid, tid, txt in sample:
                preview = txt[:80] + ("…" if len(txt) > 80 else "")
                print(f"  [{tid}] {vid}: {preview}")

        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
