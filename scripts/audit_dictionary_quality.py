"""
audit_dictionary_quality.py — R6.dictionary quality audit

Runs 12 read-only checks against dictionary_entries_multilang to detect
gross inconsistencies across the 4 translation agents (Claude A/B/C, Gemini G).

Usage:
    PYTHONIOENCODING=utf-8 python scripts/audit_dictionary_quality.py
    PYTHONIOENCODING=utf-8 python scripts/audit_dictionary_quality.py --verbose
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import duckdb

DB_DEFAULT = Path(__file__).parent.parent / "data" / "analytics" / "bible.duckdb"

MOJIBAKE_PATTERNS = [
    "Ã©", "Ã­", "Ã³", "Ã´", "Ãª", "Ã‰", "Ã¡", "Ã£", "Ã§",
    "Ãº", "Ã±", "Ã¢", "Ã¼", "Ã¤", "Ã¶", "Ã®", "Ã¯", "Ã°",
    "Ãµ", "Ã¸", "Ã½", "Ã¿",
]

ENGLISH_MARKERS = [
    "the Lord", "the king", "the son of", "the tribe of",
    "the children of", "according to", "mentioned in",
    "referred to", "is described", "the book of", "the land of",
]

HTML_PATTERNS = [
    "&amp;", "&lt;", "&gt;", "&nbsp;", "&quot;",
    "<b>", "</b>", "<i>", "</i>", "<br", "<p>", "<div", "<span", "<a ",
]

PROPER_NAMES = {
    "Moses":     {"pt": "Moisés",    "es": "Moisés"},
    "Abraham":   {"pt": "Abraão",    "es": "Abraham"},
    "Solomon":   {"pt": "Salomão",   "es": "Salomón"},
    "Jerusalem": {"pt": "Jerusalém", "es": "Jerusalén"},
    "Isaiah":    {"pt": "Isaías",    "es": "Isaías"},
    "Jeremiah":  {"pt": "Jeremias",  "es": "Jeremías"},
    "Babylon":   {"pt": "Babilônia", "es": "Babilonia"},
    "Egypt":     {"pt": "Egito",     "es": "Egipto"},
}

Result = tuple[str, str, int, list[str]]  # (name, PASS/FAIL/WARN/INFO, count, details)


def _text_col(col: str) -> str:
    return f"coalesce({col}, '')"


def check_mojibake(con: duckdb.DuckDBPyConnection, verbose: bool) -> Result:
    conds = []
    for p in MOJIBAKE_PATTERNS:
        conds.append(f"text_easton LIKE '%{p}%'")
        conds.append(f"text_smith  LIKE '%{p}%'")
    where = " OR ".join(conds)
    rows = con.sql(f"""
        SELECT slug, lang, left(coalesce(text_easton, text_smith), 100) AS preview
        FROM dictionary_entries_multilang WHERE {where}
        ORDER BY slug, lang
    """).fetchall()
    details = [f"  {r[0]:<30s} {r[1]}  {r[2]}" for r in rows]
    return ("Mojibake", "PASS" if len(rows) == 0 else "FAIL", len(rows), details)


def check_source_alignment(con: duckdb.DuckDBPyConnection, verbose: bool) -> Result:
    eas_leak = con.sql("""
        SELECT de.slug, m.lang, left(m.text_smith, 60) AS leaked
        FROM dictionary_entries de
        JOIN dictionary_entries_multilang m ON de.slug = m.slug
        WHERE de.source = 'EAS' AND m.text_smith IS NOT NULL
        ORDER BY de.slug, m.lang
    """).fetchall()
    smi_leak = con.sql("""
        SELECT de.slug, m.lang, left(m.text_easton, 60) AS leaked
        FROM dictionary_entries de
        JOIN dictionary_entries_multilang m ON de.slug = m.slug
        WHERE de.source = 'SMI' AND m.text_easton IS NOT NULL
        ORDER BY de.slug, m.lang
    """).fetchall()
    total = len(eas_leak) + len(smi_leak)
    details = []
    for r in eas_leak:
        details.append(f"  EAS-only has smith: {r[0]:<30s} {r[1]}  {r[2]}")
    for r in smi_leak:
        details.append(f"  SMI-only has easton: {r[0]:<30s} {r[1]}  {r[2]}")
    status = "PASS" if total == 0 else ("WARN" if total <= 4 else "FAIL")
    return ("Source alignment", status, total, details)


def check_cross_contamination(con: duckdb.DuckDBPyConnection, verbose: bool) -> Result:
    pt_spanish = ["Señor", "según", "también"]
    es_portuguese = ["Senhor", "também", "então", "através"]
    details = []
    total = 0

    for marker in pt_spanish:
        cnt = con.sql(f"""
            SELECT count(*) FROM dictionary_entries_multilang
            WHERE lang='pt' AND (text_easton LIKE '%{marker}%' OR text_smith LIKE '%{marker}%')
        """).fetchone()[0]
        if cnt > 0:
            total += cnt
            details.append(f"  PT has Spanish '{marker}': {cnt} rows")
            if verbose:
                for r in con.sql(f"""
                    SELECT slug, left(coalesce(text_easton, text_smith), 80)
                    FROM dictionary_entries_multilang
                    WHERE lang='pt' AND (text_easton LIKE '%{marker}%' OR text_smith LIKE '%{marker}%')
                    LIMIT 5
                """).fetchall():
                    details.append(f"    {r[0]}: {r[1]}")

    for marker in es_portuguese:
        cnt = con.sql(f"""
            SELECT count(*) FROM dictionary_entries_multilang
            WHERE lang='es' AND (text_easton LIKE '%{marker}%' OR text_smith LIKE '%{marker}%')
        """).fetchone()[0]
        if cnt > 0:
            total += cnt
            details.append(f"  ES has Portuguese '{marker}': {cnt} rows")
            if verbose:
                for r in con.sql(f"""
                    SELECT slug, left(coalesce(text_easton, text_smith), 80)
                    FROM dictionary_entries_multilang
                    WHERE lang='es' AND (text_easton LIKE '%{marker}%' OR text_smith LIKE '%{marker}%')
                    LIMIT 5
                """).fetchall():
                    details.append(f"    {r[0]}: {r[1]}")

    status = "PASS" if total == 0 else "WARN"
    return ("Cross-contamination", status, total, details)


def check_ref_format(con: duckdb.DuckDBPyConnection, verbose: bool) -> Result:
    # PT should use period (Gn 3.16), flag colon in ref-like patterns
    pt_colon = con.sql(r"""
        SELECT count(*) FROM dictionary_entries_multilang
        WHERE lang='pt' AND (
            regexp_matches(text_easton, '\b[12]?[A-ZÀ-Ú][a-zà-ú]{0,3}\s+\d{1,3}:\d{1,3}')
            OR regexp_matches(text_smith, '\b[12]?[A-ZÀ-Ú][a-zà-ú]{0,3}\s+\d{1,3}:\d{1,3}')
        )
    """).fetchone()[0]
    # ES should use colon (Gn 3:16), flag period in ref-like patterns
    es_period = con.sql(r"""
        SELECT count(*) FROM dictionary_entries_multilang
        WHERE lang='es' AND (
            regexp_matches(text_easton, '\b[12]?[A-ZÀ-Ú][a-zà-ú]{0,3}\s+\d{1,3}\.\d{1,3}')
            OR regexp_matches(text_smith, '\b[12]?[A-ZÀ-Ú][a-zà-ú]{0,3}\s+\d{1,3}\.\d{1,3}')
        )
    """).fetchone()[0]
    total = pt_colon + es_period
    details = [
        f"  PT with colon refs: {pt_colon}",
        f"  ES with period refs: {es_period}",
    ]
    if verbose and pt_colon > 0:
        for r in con.sql(r"""
            SELECT slug, regexp_extract(coalesce(text_easton,''), '\b[12]?[A-ZÀ-Ú][a-zà-ú]{0,3}\s+\d{1,3}:\d{1,3}') AS ref
            FROM dictionary_entries_multilang
            WHERE lang='pt' AND regexp_matches(text_easton, '\b[12]?[A-ZÀ-Ú][a-zà-ú]{0,3}\s+\d{1,3}:\d{1,3}')
            LIMIT 10
        """).fetchall():
            details.append(f"    PT: {r[0]} -> {r[1]}")
    if verbose and es_period > 0:
        for r in con.sql(r"""
            SELECT slug, regexp_extract(coalesce(text_easton,''), '\b[12]?[A-ZÀ-Ú][a-zà-ú]{0,3}\s+\d{1,3}\.\d{1,3}') AS ref
            FROM dictionary_entries_multilang
            WHERE lang='es' AND regexp_matches(text_easton, '\b[12]?[A-ZÀ-Ú][a-zà-ú]{0,3}\s+\d{1,3}\.\d{1,3}')
            LIMIT 10
        """).fetchall():
            details.append(f"    ES: {r[0]} -> {r[1]}")
    status = "PASS" if total == 0 else "WARN"
    return ("Ref format", status, total, details)


def check_untranslated(con: duckdb.DuckDBPyConnection, verbose: bool) -> Result:
    details = []
    total = 0
    for marker in ENGLISH_MARKERS:
        cnt = con.sql(f"""
            SELECT count(*) FROM dictionary_entries_multilang
            WHERE text_easton LIKE '%{marker}%' OR text_smith LIKE '%{marker}%'
        """).fetchone()[0]
        if cnt > 0:
            total += cnt
            details.append(f"  '{marker}': {cnt} rows")
            if verbose:
                for r in con.sql(f"""
                    SELECT slug, lang, notes FROM dictionary_entries_multilang
                    WHERE text_easton LIKE '%{marker}%' OR text_smith LIKE '%{marker}%'
                    LIMIT 3
                """).fetchall():
                    details.append(f"    {r[0]} ({r[1]}) notes={r[2]}")
    status = "PASS" if total == 0 else "FAIL"
    return ("Untranslated content", status, total, details)


def check_proper_names(con: duckdb.DuckDBPyConnection, verbose: bool) -> Result:
    details = []
    total = 0
    for en_name, localized in PROPER_NAMES.items():
        for lang in ("pt", "es"):
            if en_name == localized[lang]:
                continue
            cnt = con.sql(f"""
                SELECT count(*) FROM dictionary_entries_multilang
                WHERE lang='{lang}' AND (
                    text_easton LIKE '% {en_name} %' OR text_easton LIKE '% {en_name},%'
                    OR text_easton LIKE '% {en_name}.%' OR text_easton LIKE '{en_name} %'
                    OR text_smith LIKE '% {en_name} %' OR text_smith LIKE '% {en_name},%'
                    OR text_smith LIKE '% {en_name}.%' OR text_smith LIKE '{en_name} %'
                )
            """).fetchone()[0]
            if cnt > 0:
                total += cnt
                details.append(f"  {lang}: '{en_name}' found {cnt}x (should be '{localized[lang]}')")
                if verbose:
                    for r in con.sql(f"""
                        SELECT slug FROM dictionary_entries_multilang
                        WHERE lang='{lang}' AND (
                            text_easton LIKE '% {en_name} %' OR text_easton LIKE '% {en_name},%'
                            OR text_easton LIKE '% {en_name}.%' OR text_easton LIKE '{en_name} %'
                            OR text_smith LIKE '% {en_name} %' OR text_smith LIKE '% {en_name},%'
                            OR text_smith LIKE '% {en_name}.%' OR text_smith LIKE '{en_name} %'
                        ) LIMIT 5
                    """).fetchall():
                        details.append(f"    -> {r[0]}")
    status = "PASS" if total == 0 else "WARN"
    return ("Proper names", status, total, details)


def check_missing_entries(con: duckdb.DuckDBPyConnection, verbose: bool) -> Result:
    missing = con.sql("""
        SELECT de.slug, de.source
        FROM dictionary_entries de
        WHERE NOT EXISTS (
            SELECT 1 FROM dictionary_entries_multilang m WHERE m.slug = de.slug
        )
        ORDER BY de.slug
    """).fetchall()
    details = [f"  {len(missing)} slugs missing from multilang"]
    if verbose:
        for slug, source in missing:
            details.append(f"    {slug:<40s} source={source}")
    elif missing:
        first = missing[0][0]
        last = missing[-1][0]
        details.append(f"  Range: {first} ... {last}")

    orphans = con.sql("""
        SELECT m.slug, m.lang FROM dictionary_entries_multilang m
        WHERE NOT EXISTS (
            SELECT 1 FROM dictionary_entries de WHERE de.slug = m.slug
        )
    """).fetchall()
    if orphans:
        details.append(f"  ORPHANS (in multilang but not in source): {len(orphans)}")
        for r in orphans[:10]:
            details.append(f"    {r[0]} ({r[1]})")

    return ("Missing entries", "INFO", len(missing), details)


def check_agent_comparison(con: duckdb.DuckDBPyConnection, verbose: bool) -> Result:
    rows = con.sql("""
        SELECT
            CASE
                WHEN notes LIKE 'opus-marathon-turn-%' THEN 'opus-marathon'
                WHEN notes LIKE 'opus-sprint%'          THEN 'opus-sprint'
                WHEN notes = 'opus-patch-gemini'        THEN 'opus-patch-gemini'
                WHEN notes LIKE 'auto: claude-opus%'    THEN 'auto-opus'
                ELSE coalesce(notes, 'NULL')
            END AS agent,
            count(*)                                          AS rows,
            round(avg(confidence), 3)                         AS avg_conf,
            round(avg(length(coalesce(text_easton, ''))), 0)  AS avg_eas_len,
            round(avg(length(coalesce(text_smith,  ''))), 0)  AS avg_smi_len,
            round(min(confidence), 3)                         AS min_conf,
            round(max(confidence), 3)                         AS max_conf
        FROM dictionary_entries_multilang
        GROUP BY 1
        ORDER BY rows DESC
    """).fetchall()
    details = [
        f"  {'Agent':<22s} {'Rows':>6s} {'AvgConf':>8s} {'AvgEas':>7s} {'AvgSmi':>7s} {'MinC':>6s} {'MaxC':>6s}",
        f"  {'-' * 60}",
    ]
    for r in rows:
        details.append(
            f"  {r[0]:<22s} {r[1]:>6d} {r[2]:>8.3f} {r[3]:>7.0f} {r[4]:>7.0f} {r[5]:>6.3f} {r[6]:>6.3f}"
        )
    return ("Agent comparison", "INFO", len(rows), details)


def check_stubs(con: duckdb.DuckDBPyConnection, verbose: bool) -> Result:
    stubs = con.sql("""
        SELECT m.slug, m.lang, m.notes,
               length(coalesce(m.text_easton, '')) AS len_eas,
               length(coalesce(m.text_smith, ''))  AS len_smi,
               coalesce(m.text_easton, '') AS eas,
               coalesce(m.text_smith, '')  AS smi
        FROM dictionary_entries_multilang m
        WHERE length(coalesce(m.text_easton, '')) + length(coalesce(m.text_smith, '')) < 30
        ORDER BY length(coalesce(m.text_easton, '')) + length(coalesce(m.text_smith, ''))
    """).fetchall()
    details = []
    for slug, lang, notes, len_e, len_s, eas, smi in stubs:
        txt = eas if eas else smi
        details.append(f"  {slug:<35s} {lang} [{len_e}+{len_s}] \"{txt[:50]}\"")
    status = "PASS" if len(stubs) == 0 else "WARN"
    return ("Stubs (<30 chars)", status, len(stubs), details)


def check_html(con: duckdb.DuckDBPyConnection, verbose: bool) -> Result:
    total = 0
    details = []
    for pattern in HTML_PATTERNS:
        safe = pattern.replace("'", "''")
        cnt = con.sql(f"""
            SELECT count(*) FROM dictionary_entries_multilang
            WHERE text_easton LIKE '%{safe}%' OR text_smith LIKE '%{safe}%'
        """).fetchone()[0]
        if cnt > 0:
            total += cnt
            details.append(f"  '{pattern}': {cnt} rows")
    status = "PASS" if total == 0 else "FAIL"
    return ("HTML entities/tags", status, total, details)


def check_duplicates_pt_es(con: duckdb.DuckDBPyConnection, verbose: bool) -> Result:
    dupes_eas = con.sql("""
        SELECT pt.slug, left(pt.text_easton, 60) AS preview
        FROM dictionary_entries_multilang pt
        JOIN dictionary_entries_multilang es ON pt.slug = es.slug
        WHERE pt.lang = 'pt' AND es.lang = 'es'
          AND pt.text_easton IS NOT NULL AND es.text_easton IS NOT NULL
          AND length(pt.text_easton) > 50
          AND pt.text_easton = es.text_easton
        ORDER BY pt.slug
    """).fetchall()
    dupes_smi = con.sql("""
        SELECT pt.slug, left(pt.text_smith, 60) AS preview
        FROM dictionary_entries_multilang pt
        JOIN dictionary_entries_multilang es ON pt.slug = es.slug
        WHERE pt.lang = 'pt' AND es.lang = 'es'
          AND pt.text_smith IS NOT NULL AND es.text_smith IS NOT NULL
          AND length(pt.text_smith) > 50
          AND pt.text_smith = es.text_smith
        ORDER BY pt.slug
    """).fetchall()
    total = len(dupes_eas) + len(dupes_smi)
    details = []
    for slug, preview in dupes_eas:
        details.append(f"  EAS PT=ES: {slug:<30s} \"{preview}\"")
    for slug, preview in dupes_smi:
        details.append(f"  SMI PT=ES: {slug:<30s} \"{preview}\"")
    status = "PASS" if total == 0 else "FAIL"
    return ("Duplicates PT=ES", status, total, details)


def check_bc_ad(con: duckdb.DuckDBPyConnection, verbose: bool) -> Result:
    markers = [("B.C.", "B.C."), ("A.D.", "A.D.")]
    total = 0
    details = []
    for marker, label in markers:
        safe = marker.replace(".", "\\.")
        cnt = con.sql(f"""
            SELECT count(*) FROM dictionary_entries_multilang
            WHERE text_easton LIKE '%{marker}%' OR text_smith LIKE '%{marker}%'
        """).fetchone()[0]
        if cnt > 0:
            total += cnt
            details.append(f"  '{label}': {cnt} rows")
            if verbose:
                for r in con.sql(f"""
                    SELECT slug, lang, notes FROM dictionary_entries_multilang
                    WHERE text_easton LIKE '%{marker}%' OR text_smith LIKE '%{marker}%'
                    LIMIT 5
                """).fetchall():
                    details.append(f"    {r[0]} ({r[1]}) notes={r[2]}")
    status = "PASS" if total == 0 else "WARN"
    return ("B.C./A.D. markers", status, total, details)


CHECKS = [
    check_mojibake,
    check_source_alignment,
    check_cross_contamination,
    check_ref_format,
    check_untranslated,
    check_proper_names,
    check_missing_entries,
    check_agent_comparison,
    check_stubs,
    check_html,
    check_duplicates_pt_es,
    check_bc_ad,
]

STATUS_ICON = {"PASS": "+", "FAIL": "X", "WARN": "!", "INFO": "i"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Dictionary multilang quality audit")
    parser.add_argument("--db", default=str(DB_DEFAULT))
    parser.add_argument("--verbose", action="store_true", default=False)
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"ERROR: DB not found at {db_path}", file=sys.stderr)
        sys.exit(1)

    con = duckdb.connect(str(db_path), read_only=True)
    results: list[Result] = []

    print("=" * 70)
    print("  DICTIONARY MULTILANG QUALITY AUDIT")
    print("=" * 70)

    try:
        for check_fn in CHECKS:
            name, status, count, details = check_fn(con, args.verbose)
            results.append((name, status, count, details))
            icon = STATUS_ICON.get(status, "?")
            print(f"\n  [{icon}] {name}: {status} ({count})")
            for line in details:
                print(line)
    finally:
        con.close()

    print("\n" + "=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    print(f"  {'#':<4s} {'Check':<25s} {'Status':<8s} {'Hits':>6s}")
    print(f"  {'-' * 48}")
    has_fail = False
    for i, (name, status, count, _) in enumerate(results, 1):
        icon = STATUS_ICON.get(status, "?")
        print(f"  {i:<4d} {name:<25s} [{icon}] {status:<6s} {count:>5d}")
        if status == "FAIL":
            has_fail = True

    print("=" * 70)
    if has_fail:
        print("  RESULT: FAIL — critical issues found")
        sys.exit(1)
    else:
        print("  RESULT: OK — no critical failures")
        sys.exit(0)


if __name__ == "__main__":
    main()
