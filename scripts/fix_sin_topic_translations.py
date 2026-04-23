"""Fix mistranslations of SIN (1) / SIN (2) topics in topics_multilang.

Context (discovered 22 abr 2026 during /topics audit):
- `sin-1` (1678 verses) is the theological concept of sin → correct PT/ES name "PECADO"
- `sin-2` (37 verses) is the Wilderness of Sin (Ex 16:1, Ez 30:15), NOT another
  sense of the word "sin". The Claude rule-based translation mistakenly rendered
  it as "PECADO (2)". The correct names are "SIM (DESERTO)" in PT (per NVI) and
  "SIN (DESIERTO)" in ES (per RVR).

The matching override lives in `frontend/src/i18n/topicNames.ts`, but the backend
search hits `topics_multilang` directly, so without this DB fix the PT/ES user
cannot find sin-2 by searching "sim" / "deserto" / "desierto".

Idempotent: running it twice leaves the same state.
"""

from __future__ import annotations

import duckdb

DB_PATH = "data/analytics/bible.duckdb"

FIXES = [
    # (slug, lang, corrected_name)
    ("sin-1", "pt", "PECADO"),
    ("sin-1", "es", "PECADO"),
    ("sin-2", "pt", "SIM (DESERTO)"),
    ("sin-2", "es", "SIN (DESIERTO)"),
]


def main() -> None:
    conn = duckdb.connect(DB_PATH)
    try:
        print("Before:")
        for slug, _, _ in FIXES:
            rows = conn.execute(
                """
                SELECT t.slug, m.lang, m.name
                FROM topics t JOIN topics_multilang m ON m.topic_id = t.topic_id
                WHERE t.slug = ? ORDER BY m.lang
                """,
                [slug],
            ).fetchall()
            for r in rows:
                print(f"  {r}")

        for slug, lang, name in FIXES:
            conn.execute(
                """
                UPDATE topics_multilang SET name = ?
                WHERE lang = ?
                  AND topic_id = (SELECT topic_id FROM topics WHERE slug = ?)
                """,
                [name, lang, slug],
            )

        print("\nAfter:")
        for slug, _, _ in FIXES:
            rows = conn.execute(
                """
                SELECT t.slug, m.lang, m.name
                FROM topics t JOIN topics_multilang m ON m.topic_id = t.topic_id
                WHERE t.slug = ? ORDER BY m.lang
                """,
                [slug],
            ).fetchall()
            for r in rows:
                print(f"  {r}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
