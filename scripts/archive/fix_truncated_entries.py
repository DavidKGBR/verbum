"""
fix_truncated_entries.py — Re-parse Easton/Smith XMLs to fix 5000-char truncation

The upstream neuu-org/bible-dictionary-dataset silently truncates entry
text to 5000 characters in its parse script. This script:

1. Parses the original ThML XML files (no truncation)
2. Matches entries to existing DB slugs via the JSON mapping
3. Updates dictionary_entries with the full text for entries that were truncated
4. Reports which entries were extended and by how much

Usage:
    PYTHONIOENCODING=utf-8 python scripts/fix_truncated_entries.py [--dry-run]
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path

import duckdb

DB_PATH = Path(__file__).parent.parent / "data" / "analytics" / "bible.duckdb"
RAW_DIR = Path(__file__).parent.parent / "data" / "raw" / "dictionary"
EASTON_XML = RAW_DIR / "easton_ebd2.xml"
SMITH_XML = RAW_DIR / "smith_bibledict.xml"


def strip_thml(text: str) -> str:
    text = re.sub(r"<scripRef[^>]*>", "", text)
    text = re.sub(r"</scripRef>", "", text)
    text = re.sub(r'<a\s[^>]*>', '', text)
    text = re.sub(r'</a>', '', text)
    text = text.replace("<i>", "*").replace("</i>", "*")
    text = text.replace("<b>", "").replace("</b>", "")
    text = re.sub(r"<br\s*/?>", " ", text)
    text = re.sub(r"</?p[^>]*>", " ", text)
    text = re.sub(r"</?ul>", " ", text)
    text = re.sub(r"</?li>", " ", text)
    text = re.sub(r"</?def[^>]*>", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_xml_entries(xml_path: Path) -> dict[str, str]:
    content = xml_path.read_text(encoding="utf-8")
    entries: dict[str, str] = {}

    term_pattern = re.compile(r"<term[^>]*>([^<]+)</term>")
    positions = [(m.group(1).strip(), m.end()) for m in term_pattern.finditer(content)]

    for i, (term_name, term_end) in enumerate(positions):
        def_start = content.find("<def", term_end)
        if def_start < 0:
            continue
        if i + 1 < len(positions):
            next_term_start = content.rfind("<term", term_end, positions[i + 1][1])
            if next_term_start < 0:
                next_term_start = positions[i + 1][1]
            search_end = next_term_start
        else:
            search_end = len(content)

        def_end = content.find("</def>", def_start, search_end)
        if def_end < 0:
            def_end = content.find("</def>", def_start)
        if def_end < 0:
            continue
        def_end += len("</def>")

        raw_def = content[def_start:def_end]
        plain = strip_thml(raw_def)
        if plain:
            key = term_name.lower().strip()
            if key not in entries or len(plain) > len(entries[key]):
                entries[key] = plain

    return entries


def build_name_to_slug() -> dict[str, str]:
    mapping: dict[str, str] = {}
    for letter_file in sorted(RAW_DIR.glob("?.json")):
        with open(letter_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        for _key, entry in data.items():
            if isinstance(entry, dict):
                name = entry.get("name", "").strip()
                slug = entry.get("slug", "").strip()
                if name and slug:
                    mapping[name.lower()] = slug
    return mapping


def main() -> None:
    parser = argparse.ArgumentParser(description="Fix truncated dictionary entries from XML source")
    parser.add_argument("--dry-run", action="store_true", help="Show what would change without modifying DB")
    parser.add_argument("--db", default=str(DB_PATH))
    args = parser.parse_args()

    if not EASTON_XML.exists() or not SMITH_XML.exists():
        print("ERROR: XML files not found. Download them first:", file=sys.stderr)
        print(f"  {EASTON_XML}", file=sys.stderr)
        print(f"  {SMITH_XML}", file=sys.stderr)
        sys.exit(1)

    print("Parsing Easton XML...")
    easton = parse_xml_entries(EASTON_XML)
    print(f"  {len(easton)} entries parsed")

    print("Parsing Smith XML...")
    smith = parse_xml_entries(SMITH_XML)
    print(f"  {len(smith)} entries parsed")

    print("Building name→slug mapping from JSON cache...")
    name_to_slug = build_name_to_slug()
    print(f"  {len(name_to_slug)} mappings")

    con = duckdb.connect(args.db, read_only=args.dry_run)

    MIN_GAIN = 50  # only update if XML is at least 50 chars longer

    all_entries = con.sql("""
        SELECT slug, text_easton, text_smith,
               length(text_easton) as eas_len, length(text_smith) as smi_len
        FROM dictionary_entries
        ORDER BY slug
    """).fetchall()
    print(f"\n{len(all_entries)} total entries in DB")

    slug_to_name: dict[str, str] = {}
    for name, slug in name_to_slug.items():
        slug_to_name[slug] = name

    updates: list[tuple[str, str | None, str | None, int, int]] = []

    for slug, db_eas, db_smi, eas_len, smi_len in all_entries:
        name_key = slug_to_name.get(slug, slug)
        new_eas = easton.get(name_key)
        new_smi = smith.get(name_key)

        eas_extended = False
        smi_extended = False

        if new_eas and eas_len and len(new_eas) > eas_len + MIN_GAIN:
            eas_extended = True
        else:
            new_eas = None

        if new_smi and smi_len and len(new_smi) > smi_len + MIN_GAIN:
            smi_extended = True
        else:
            new_smi = None

        if eas_extended or smi_extended:
            old_total = (eas_len or 0) + (smi_len or 0)
            new_total = (len(new_eas) if new_eas else (eas_len or 0)) + \
                        (len(new_smi) if new_smi else (smi_len or 0))
            updates.append((slug, new_eas, new_smi, old_total, new_total))

    print(f"\n{len(updates)} entries to extend:")
    print(f"  {'Slug':<45s} {'Old':>6s} {'New':>6s} {'Delta':>7s}  Fix")
    print(f"  {'-' * 75}")
    for slug, new_eas, new_smi, old_t, new_t in updates:
        fix_parts = []
        if new_eas:
            fix_parts.append(f"EAS {old_t}→{len(new_eas)}")
        if new_smi:
            fix_parts.append(f"SMI →{len(new_smi)}")
        print(f"  {slug:<45s} {old_t:>6d} {new_t:>6d} {new_t - old_t:>+7d}  {', '.join(fix_parts)}")

    if args.dry_run:
        print(f"\n[DRY RUN] Would update {len(updates)} entries. Run without --dry-run to apply.")
        con.close()
        return

    applied = 0
    for slug, new_eas, new_smi, _, _ in updates:
        if new_eas and new_smi:
            con.execute(
                "UPDATE dictionary_entries SET text_easton = ?, text_smith = ? WHERE slug = ?",
                [new_eas, new_smi, slug],
            )
        elif new_eas:
            con.execute(
                "UPDATE dictionary_entries SET text_easton = ? WHERE slug = ?",
                [new_eas, slug],
            )
        elif new_smi:
            con.execute(
                "UPDATE dictionary_entries SET text_smith = ? WHERE slug = ?",
                [new_smi, slug],
            )
        applied += 1

    con.close()
    print(f"\nUpdated {applied} entries in dictionary_entries (EN source).")
    print("NOTE: The PT/ES translations for these entries need to be re-translated")
    print("      with the full text. Run the audit to identify affected slugs.")


if __name__ == "__main__":
    main()
